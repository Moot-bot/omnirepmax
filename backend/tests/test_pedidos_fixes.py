"""Regression tests for iteration 8 fixes:
1. PedidoItemIn must accept and persist `descricao` per item (POST + PUT).
2. DELETE /api/pedidos/{id} must cascade: remove commissoes + contas_receber linked by pedido_id.
3. DELETE 404 for nonexistent + other-tenant isolation.
4. XML import still creates pedido with commission + AR cascade (regression)."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASS = "admin123"


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def ctx(admin_h):
    reps = requests.get(f"{BASE_URL}/api/representadas", headers=admin_h).json()
    cls = requests.get(f"{BASE_URL}/api/clientes", headers=admin_h).json()
    prods = requests.get(f"{BASE_URL}/api/produtos", headers=admin_h).json()
    assert reps and cls and prods
    rep = next((r for r in reps if "Bella" in (r.get("nome_fantasia") or "")), reps[0])
    rep_prods = [p for p in prods if p.get("representada_id") == rep["id"]]
    assert len(rep_prods) >= 2
    return {"rep": rep, "cliente": cls[0], "p1": rep_prods[0], "p2": rep_prods[1]}


def _payload_with_desc(ctx, d1="Caixa 12un entrega sexta", d2="Entregar na matriz"):
    return {
        "cliente_id": ctx["cliente"]["id"],
        "representada_id": ctx["rep"]["id"],
        "status": "rascunho",
        "itens": [
            {"produto_id": ctx["p1"]["id"], "nome": ctx["p1"]["nome"], "quantidade": 10, "preco_unitario": 100.0, "desconto": 0.0, "descricao": d1},
            {"produto_id": ctx["p2"]["id"], "nome": ctx["p2"]["nome"], "quantidade": 5, "preco_unitario": 50.0, "desconto": 0.0, "descricao": d2},
        ],
    }


class TestItemDescricaoPersistence:
    def test_post_persists_descricao_per_item(self, admin_h, ctx):
        pld = _payload_with_desc(ctx)
        r = requests.post(f"{BASE_URL}/api/pedidos", headers=admin_h, json=pld)
        assert r.status_code == 200, r.text
        p = r.json()
        pid = p["id"]
        pytest.pid_desc = pid

        # Check POST response
        assert p["itens"][0].get("descricao") == "Caixa 12un entrega sexta", f"POST response missing descricao item0: {p['itens'][0]}"
        assert p["itens"][1].get("descricao") == "Entregar na matriz", f"POST response missing descricao item1: {p['itens'][1]}"

        # Verify GET also returns it (persisted)
        peds = requests.get(f"{BASE_URL}/api/pedidos", headers=admin_h).json()
        found = next((x for x in peds if x["id"] == pid), None)
        assert found is not None
        assert found["itens"][0].get("descricao") == "Caixa 12un entrega sexta"
        assert found["itens"][1].get("descricao") == "Entregar na matriz"

    def test_put_updates_descricao(self, admin_h, ctx):
        pid = pytest.pid_desc
        pld = _payload_with_desc(ctx, d1="UPDATED desc 1", d2="UPDATED desc 2")
        r = requests.put(f"{BASE_URL}/api/pedidos/{pid}", headers=admin_h, json=pld)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["itens"][0].get("descricao") == "UPDATED desc 1"
        assert p["itens"][1].get("descricao") == "UPDATED desc 2"

        # Verify via GET
        peds = requests.get(f"{BASE_URL}/api/pedidos", headers=admin_h).json()
        found = next((x for x in peds if x["id"] == pid), None)
        assert found["itens"][0].get("descricao") == "UPDATED desc 1"
        assert found["itens"][1].get("descricao") == "UPDATED desc 2"

        # cleanup
        requests.delete(f"{BASE_URL}/api/pedidos/{pid}", headers=admin_h)


class TestDeleteCascade:
    def test_delete_faturado_cascades_comissao_and_ar(self, admin_h, ctx):
        # Create pedido
        pld = _payload_with_desc(ctx)
        r = requests.post(f"{BASE_URL}/api/pedidos", headers=admin_h, json=pld)
        assert r.status_code == 200
        pid = r.json()["id"]

        # Move to faturado to generate comissao + AR
        r2 = requests.patch(f"{BASE_URL}/api/pedidos/{pid}/status",
                            headers=admin_h, json={"status": "faturado"})
        # Status endpoint might be POST or PATCH; try PUT fallback
        if r2.status_code not in (200, 204):
            r2 = requests.put(f"{BASE_URL}/api/pedidos/{pid}/status",
                              headers=admin_h, json={"status": "faturado"})
        assert r2.status_code == 200, f"status change failed: {r2.status_code} {r2.text}"

        # Verify comissao + AR were created
        coms = requests.get(f"{BASE_URL}/api/comissoes", headers=admin_h).json()
        ars = requests.get(f"{BASE_URL}/api/contas-receber", headers=admin_h).json()
        before_com = [c for c in coms if c.get("pedido_id") == pid]
        before_ar = [a for a in ars if a.get("pedido_id") == pid]
        assert len(before_com) >= 1, "comissao not generated on faturado"
        assert len(before_ar) >= 1, "AR not generated on faturado"

        # DELETE pedido
        rd = requests.delete(f"{BASE_URL}/api/pedidos/{pid}", headers=admin_h)
        assert rd.status_code == 200, rd.text

        # Verify cascade: no commisao / AR with pedido_id=pid
        coms2 = requests.get(f"{BASE_URL}/api/comissoes", headers=admin_h).json()
        ars2 = requests.get(f"{BASE_URL}/api/contas-receber", headers=admin_h).json()
        remaining_com = [c for c in coms2 if c.get("pedido_id") == pid]
        remaining_ar = [a for a in ars2 if a.get("pedido_id") == pid]
        assert remaining_com == [], f"CASCADE FAIL: comissoes orfas: {remaining_com}"
        assert remaining_ar == [], f"CASCADE FAIL: contas_receber orfas: {remaining_ar}"

    def test_delete_nonexistent_404(self, admin_h):
        r = requests.delete(f"{BASE_URL}/api/pedidos/does-not-exist-xyz-123", headers=admin_h)
        assert r.status_code == 404

    def test_delete_other_tenant_404(self, admin_h, ctx):
        r = requests.post(f"{BASE_URL}/api/pedidos", headers=admin_h, json=_payload_with_desc(ctx))
        assert r.status_code == 200
        pid = r.json()["id"]

        em = f"TEST_cascade_{int(time.time()*1000)}@example.com"
        s = requests.post(f"{BASE_URL}/api/auth/signup",
                          json={"email": em, "password": "pass1234", "name": "T",
                                "company_name": "T", "plan_id": "solo"})
        assert s.status_code == 200, s.text
        tok = s.json()["token"]
        other_h = {"Authorization": f"Bearer {tok}"}

        r2 = requests.delete(f"{BASE_URL}/api/pedidos/{pid}", headers=other_h)
        assert r2.status_code == 404

        # cleanup
        requests.delete(f"{BASE_URL}/api/pedidos/{pid}", headers=admin_h)


class TestXmlRegressionCascade:
    def test_xml_import_creates_pedido_with_comissao_and_ar(self, admin_h):
        reps = requests.get(f"{BASE_URL}/api/representadas", headers=admin_h).json()
        cls = requests.get(f"{BASE_URL}/api/clientes", headers=admin_h).json()
        import re
        def dig(x): return re.sub(r"\D", "", x or "")
        bella = next((r for r in reps if dig(r.get("cnpj")) == "12345678000190"), None)
        preco = next((c for c in cls if dig(c.get("cnpj_cpf")) == "11222333000144"), None)
        assert bella and preco

        uniq = uuid.uuid4().hex[:6].upper()
        xml = f"""<?xml version="1.0"?>
<nfeProc><NFe><infNFe>
  <ide><nNF>666{uniq[:3]}</nNF><serie>1</serie><dhEmi>2025-01-15T10:00:00-03:00</dhEmi></ide>
  <emit><CNPJ>12345678000190</CNPJ><xNome>Fornecedor</xNome></emit>
  <dest><CNPJ>11222333000144</CNPJ><xNome>Cliente</xNome></dest>
  <det nItem="1"><prod><cProd>RGR-{uniq}</cProd><cEAN>789{uniq}</cEAN><xProd>Prod RGR</xProd><qCom>2</qCom><vUnCom>150</vUnCom><vProd>300</vProd></prod></det>
  <total><ICMSTot><vNF>300</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>"""
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_h,
                          json={"xml_content": xml, "filename": f"reg-{uniq}.xml"}, timeout=30)
        assert r.status_code == 200, r.text
        ped = r.json().get("pedido_criado")
        assert ped and ped["status"] == "faturado"
        pid = ped["id"]

        coms = requests.get(f"{BASE_URL}/api/comissoes", headers=admin_h).json()
        ars = requests.get(f"{BASE_URL}/api/contas-receber", headers=admin_h).json()
        assert any(c.get("pedido_id") == pid for c in coms), "comissao missing for xml pedido"
        assert any(a.get("pedido_id") == pid for a in ars), "AR missing for xml pedido"

        # also validate cascade on xml-created pedido
        rd = requests.delete(f"{BASE_URL}/api/pedidos/{pid}", headers=admin_h)
        assert rd.status_code == 200
        coms2 = requests.get(f"{BASE_URL}/api/comissoes", headers=admin_h).json()
        ars2 = requests.get(f"{BASE_URL}/api/contas-receber", headers=admin_h).json()
        assert not any(c.get("pedido_id") == pid for c in coms2), "cascade fail (xml): comissao orfa"
        assert not any(a.get("pedido_id") == pid for a in ars2), "cascade fail (xml): AR orfa"
