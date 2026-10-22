"""Backend tests for /api/xml/import and /api/xml/historico (NF-e import)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASSWORD = "admin123"

# ---------- fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def admin_reps(admin_headers):
    r = requests.get(f"{BASE_URL}/api/representadas", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    return r.json()

@pytest.fixture(scope="module")
def admin_clientes(admin_headers):
    r = requests.get(f"{BASE_URL}/api/clientes", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    return r.json()


# ---------- helpers ----------
def _build_xml(emit_cnpj: str, dest_cnpj: str, nnf: str, itens: list, vnf: float) -> str:
    det = ""
    for i, it in enumerate(itens, 1):
        det += f"""
        <det nItem="{i}">
          <prod>
            <cProd>{it['cod']}</cProd>
            <cEAN>{it['ean']}</cEAN>
            <xProd>{it['nome']}</xProd>
            <qCom>{it['qtd']}</qCom>
            <vUnCom>{it['preco']}</vUnCom>
            <vProd>{it['total']}</vProd>
          </prod>
        </det>"""
    return f"""<?xml version="1.0"?>
    <nfeProc><NFe><infNFe>
      <ide><nNF>{nnf}</nNF><serie>1</serie><dhEmi>2025-01-15T10:00:00-03:00</dhEmi></ide>
      <emit><CNPJ>{emit_cnpj}</CNPJ><xNome>Fornecedor Teste</xNome></emit>
      <dest><CNPJ>{dest_cnpj}</CNPJ><xNome>Cliente Teste</xNome></dest>
      {det}
      <total><ICMSTot><vNF>{vnf}</vNF></ICMSTot></total>
    </infNFe></NFe></nfeProc>"""


def _find_by_cnpj(items, key, cnpj_digits):
    import re
    def dig(x): return re.sub(r"\D", "", x or "")
    return next((i for i in items if dig(i.get(key)) == cnpj_digits), None)


# ---------- Tests ----------
class TestXmlImport:
    def test_admin_seed_present(self, admin_reps, admin_clientes):
        bella = _find_by_cnpj(admin_reps, "cnpj", "12345678000190")
        preco = _find_by_cnpj(admin_clientes, "cnpj_cpf", "11222333000144")
        assert bella is not None, "Seed representada Bella Moda (CNPJ 12345678000190) not found"
        assert preco is not None, "Seed cliente Preço Bom (CNPJ 11222333000144) not found"

    def test_import_full_match_creates_pedido(self, admin_headers, admin_reps, admin_clientes):
        bella = _find_by_cnpj(admin_reps, "cnpj", "12345678000190")
        preco = _find_by_cnpj(admin_clientes, "cnpj_cpf", "11222333000144")
        assert bella and preco

        # unique codes so we also assert product auto-creation
        uniq = uuid.uuid4().hex[:6].upper()
        itens = [
            {"cod": f"TST-{uniq}-A", "ean": f"789{uniq}001", "nome": "Camisa Teste A", "qtd": 10, "preco": 100.0, "total": 1000.0},
            {"cod": f"TST-{uniq}-B", "ean": f"789{uniq}002", "nome": "Camisa Teste B", "qtd": 5,  "preco": 160.0, "total": 800.0},
        ]
        xml = _build_xml("12345678000190", "11222333000144", f"999{uniq[:3]}", itens, 1800.0)

        # produtos before
        prods_before = requests.get(f"{BASE_URL}/api/produtos", headers=admin_headers, params={"representada_id": bella["id"]}, timeout=20).json()
        n_before = len(prods_before)

        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_headers,
                          json={"xml_content": xml, "filename": f"nfe-{uniq}.xml"}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("representada_match"), f"no rep match: {body}"
        assert body.get("cliente_match"), f"no client match: {body}"
        assert body.get("pedido_erro") is None, f"pedido_erro: {body.get('pedido_erro')}"
        ped = body.get("pedido_criado")
        assert ped is not None, "pedido_criado null"

        # assertions on pedido
        assert ped["numero"].startswith("PED-")
        assert ped["status"] == "faturado"
        assert ped["cliente_id"] == preco["id"]
        assert ped["representada_id"] == bella["id"]
        assert ped["nf_numero"] == f"999{uniq[:3]}"
        assert len(ped["itens"]) == 2
        assert abs(ped["total"] - 1800.0) < 0.01
        comm = bella.get("comissao_padrao", 5.0)
        assert abs(ped["comissao_valor"] - round(1800.0 * comm / 100.0, 2)) < 0.01
        assert ped.get("tenant_id")  # tenant isolation

        # produtos criados automaticamente
        prods_after = requests.get(f"{BASE_URL}/api/produtos", headers=admin_headers, params={"representada_id": bella["id"]}, timeout=20).json()
        assert len(prods_after) == n_before + 2, f"expected +2 produtos, got {len(prods_after)-n_before}"
        codes_after = {p.get("codigo") for p in prods_after}
        assert f"TST-{uniq}-A" in codes_after and f"TST-{uniq}-B" in codes_after

        # comissao created
        coms = requests.get(f"{BASE_URL}/api/comissoes", headers=admin_headers, timeout=20).json()
        assert any(c.get("pedido_id") == ped["id"] for c in coms), "comissao for pedido missing"

        # contas-receber created
        ars = requests.get(f"{BASE_URL}/api/contas-receber", headers=admin_headers, timeout=20).json()
        assert any(a.get("pedido_id") == ped["id"] for a in ars), "AR for pedido missing"

        # historico contains it
        hist = requests.get(f"{BASE_URL}/api/xml/historico", headers=admin_headers, timeout=20).json()
        found = next((h for h in hist if h.get("pedido_id") == ped["id"]), None)
        assert found is not None, "xml historico entry not found"
        assert found.get("representada_id") == bella["id"]
        assert found.get("cliente_id") == preco["id"]

        pytest.ped_full_match = ped  # share for later

    def test_import_unknown_emitente_returns_pending(self, admin_headers, admin_clientes):
        preco = _find_by_cnpj(admin_clientes, "cnpj_cpf", "11222333000144")
        uniq = uuid.uuid4().hex[:6].upper()
        xml = _build_xml("99999999000199", "11222333000144", f"888{uniq[:3]}",
                         [{"cod": "X", "ean": "", "nome": "X", "qtd": 1, "preco": 10, "total": 10}], 10)
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_headers,
                          json={"xml_content": xml, "filename": "unknown.xml"}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("pedido_criado") is None
        assert b.get("pedido_erro") == "match_pendente"
        assert b.get("representada_match") is None
        assert b.get("cliente_match") and b["cliente_match"]["id"] == preco["id"]
        assert isinstance(b.get("representada_sugestoes"), list) and len(b["representada_sugestoes"]) > 0

    def test_import_manual_override_ids(self, admin_headers, admin_reps, admin_clientes):
        # pick ANY rep + cliente, pass XML with totally unrelated CNPJs
        rep = admin_reps[0]
        cli = admin_clientes[0]
        uniq = uuid.uuid4().hex[:6].upper()
        xml = _build_xml("00000000000000", "00000000000000", f"777{uniq[:3]}",
                         [{"cod": f"OV-{uniq}", "ean": "", "nome": "Override Prod", "qtd": 2, "preco": 50, "total": 100}], 100)
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_headers,
                          json={"xml_content": xml, "filename": "override.xml",
                                "representada_id": rep["id"], "cliente_id": cli["id"]}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("pedido_criado"), f"pedido não criado: {b}"
        assert b["pedido_criado"]["representada_id"] == rep["id"]
        assert b["pedido_criado"]["cliente_id"] == cli["id"]

    def test_import_invalid_xml_empty(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_headers,
                          json={"xml_content": "", "filename": "x.xml"}, timeout=15)
        assert r.status_code == 400

    def test_import_invalid_xml_no_tags(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_headers,
                          json={"xml_content": "just plain text with no tags", "filename": "x.xml"}, timeout=15)
        assert r.status_code == 400

    def test_import_xml_no_nnf_no_det(self, admin_headers):
        xml = "<?xml version='1.0'?><root><emit><CNPJ>12345678000190</CNPJ></emit></root>"
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=admin_headers,
                          json={"xml_content": xml, "filename": "bad.xml"}, timeout=15)
        assert r.status_code == 400
        assert "NF-e" in r.text or "identificar" in r.text.lower()

    def test_import_unauthenticated(self):
        r = requests.post(f"{BASE_URL}/api/xml/import",
                          json={"xml_content": "<nfeProc></nfeProc>"}, timeout=15)
        assert r.status_code == 401


# ---------- multi-tenant ----------
class TestXmlImportMultiTenant:
    def test_new_tenant_cannot_match_admin_cnpjs(self):
        ts = int(time.time())
        email = f"TEST_xml_{ts}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/signup",
                          json={"email": email, "password": "test1234", "name": "XML Test",
                                "company_name": "XMLCo", "plan_id": "solo"}, timeout=30)
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        uniq = uuid.uuid4().hex[:6].upper()
        xml = _build_xml("12345678000190", "11222333000144", f"555{uniq[:3]}",
                         [{"cod": "A", "ean": "", "nome": "A", "qtd": 1, "preco": 10, "total": 10}], 10)
        r = requests.post(f"{BASE_URL}/api/xml/import", headers=H,
                          json={"xml_content": xml, "filename": "cross.xml"}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("pedido_criado") is None
        assert b.get("representada_match") is None
        assert b.get("cliente_match") is None
        assert b.get("pedido_erro") == "match_pendente"


# ---------- regression ----------
class TestRegression:
    def test_plans_public(self):
        r = requests.get(f"{BASE_URL}/api/plans", timeout=15)
        assert r.status_code == 200
        data = r.json()
        plans = data.get("plans") if isinstance(data, dict) else data
        assert isinstance(plans, list) and len(plans) >= 3

    def test_subscriptions_me_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/subscriptions/me", timeout=15)
        assert r.status_code == 401

    def test_subscriptions_me_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/subscriptions/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert "plan" in r.json()

    def test_payments_checkout_admin(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/payments/checkout", headers=admin_headers,
                          json={"lookup_key": "omnirepmax_pro_monthly", "origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "checkout_url" in d and "session_id" in d

    def test_auth_signup_forgot(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot",
                          json={"email": "nouser@example.com"}, timeout=15)
        # should always return 200 for security
        assert r.status_code in (200, 404)

    def test_maxai_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/max-ai/chat", json={"message": "oi"}, timeout=15)
        assert r.status_code == 401
