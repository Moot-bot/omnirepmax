"""Tests for /api/pedidos CRUD: create with per-item discount, GET persistence,
PUT update with recompute, DELETE, multi-tenant isolation, 404s + regression smoke."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASS = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def ctx(admin_h):
    reps = requests.get(f"{BASE_URL}/api/representadas", headers=admin_h).json()
    cls = requests.get(f"{BASE_URL}/api/clientes", headers=admin_h).json()
    prods = requests.get(f"{BASE_URL}/api/produtos", headers=admin_h).json()
    assert reps and cls and prods, "seed vazia"
    # Prefer Bella Moda (6.5%)
    rep = next((r for r in reps if "Bella" in (r.get("nome_fantasia") or r.get("razao_social") or "")), reps[0])
    rep_prods = [p for p in prods if p.get("representada_id") == rep["id"]]
    assert len(rep_prods) >= 2, "produtos insuficientes da representada"
    return {"rep": rep, "cliente": cls[0], "p1": rep_prods[0], "p2": rep_prods[1]}


def _payload(ctx, status="rascunho"):
    return {
        "cliente_id": ctx["cliente"]["id"],
        "representada_id": ctx["rep"]["id"],
        "status": status,
        "itens": [
            {"produto_id": ctx["p1"]["id"], "nome": ctx["p1"]["nome"], "quantidade": 10, "preco_unitario": 100.0, "desconto": 10.0},
            {"produto_id": ctx["p2"]["id"], "nome": ctx["p2"]["nome"], "quantidade": 5, "preco_unitario": 50.0, "desconto": 0.0},
        ],
    }


class TestPedidoCRUDWithDiscount:
    def test_create_with_per_item_discount(self, admin_h, ctx):
        r = requests.post(f"{BASE_URL}/api/pedidos", headers=admin_h, json=_payload(ctx))
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["itens"][0]["subtotal"] == 900.0  # 10*100*0.9
        assert p["itens"][1]["subtotal"] == 250.0  # 5*50
        assert p["subtotal"] == 1150.0
        assert p["total"] == 1150.0
        assert p["comissao_percentual"] == ctx["rep"]["comissao_padrao"]
        expected_c = round(1150.0 * ctx["rep"]["comissao_padrao"] / 100.0, 2)
        assert p["comissao_valor"] == expected_c
        assert p["numero"].startswith("PED-")
        pytest.pedido_id = p["id"]

    def test_get_lists_pedido_with_all_item_fields(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/pedidos", headers=admin_h)
        assert r.status_code == 200
        peds = r.json()
        found = next((p for p in peds if p["id"] == pytest.pedido_id), None)
        assert found is not None
        it = found["itens"][0]
        for k in ("nome", "quantidade", "preco_unitario", "desconto", "subtotal"):
            assert k in it, f"item sem campo {k}"
        assert it["desconto"] == 10.0
        assert it["subtotal"] == 900.0

    def test_put_updates_recalcs(self, admin_h, ctx):
        pld = _payload(ctx)
        # change discounts: item1 20%, item2 50%
        pld["itens"][0]["desconto"] = 20.0
        pld["itens"][1]["desconto"] = 50.0
        # keep same numero via PUT
        before = requests.get(f"{BASE_URL}/api/pedidos", headers=admin_h).json()
        numero_before = next(p["numero"] for p in before if p["id"] == pytest.pedido_id)
        r = requests.put(f"{BASE_URL}/api/pedidos/{pytest.pedido_id}", headers=admin_h, json=pld)
        assert r.status_code == 200, r.text
        p = r.json()
        # 10*100*0.8=800 ; 5*50*0.5=125 ; total 925
        assert p["itens"][0]["subtotal"] == 800.0
        assert p["itens"][1]["subtotal"] == 125.0
        assert p["subtotal"] == 925.0
        assert p["total"] == 925.0
        assert p["comissao_valor"] == round(925.0 * ctx["rep"]["comissao_padrao"] / 100.0, 2)
        assert p["numero"] == numero_before, "numero não deve mudar no PUT"

    def test_delete_pedido_200_and_not_listed(self, admin_h):
        r = requests.delete(f"{BASE_URL}/api/pedidos/{pytest.pedido_id}", headers=admin_h)
        assert r.status_code == 200, r.text
        peds = requests.get(f"{BASE_URL}/api/pedidos", headers=admin_h).json()
        assert all(p["id"] != pytest.pedido_id for p in peds)

    def test_delete_nonexistent_404(self, admin_h):
        r = requests.delete(f"{BASE_URL}/api/pedidos/does-not-exist-xyz", headers=admin_h)
        assert r.status_code == 404


class TestMultiTenantIsolation:
    def test_delete_other_tenant_pedido_returns_404(self, admin_h, ctx):
        # cria pedido no admin
        r = requests.post(f"{BASE_URL}/api/pedidos", headers=admin_h, json=_payload(ctx))
        assert r.status_code == 200
        other_id = r.json()["id"]

        # cria tenant novo via signup
        em = f"TEST_pedidos_{int(time.time()*1000)}@example.com"
        s = requests.post(f"{BASE_URL}/api/auth/signup", json={"email": em, "password": "pass1234", "name": "T"})
        if s.status_code != 200:
            # fallback: register
            s = requests.post(f"{BASE_URL}/api/auth/register", json={"email": em, "password": "pass1234", "name": "T", "role": "admin"})
        assert s.status_code == 200, s.text
        tok = s.json().get("token") or s.json().get("access_token")
        other_h = {"Authorization": f"Bearer {tok}"}

        # tenta deletar pedido do admin pelo outro tenant
        r2 = requests.delete(f"{BASE_URL}/api/pedidos/{other_id}", headers=other_h)
        assert r2.status_code == 404

        # cleanup pelo admin
        requests.delete(f"{BASE_URL}/api/pedidos/{other_id}", headers=admin_h)


# ------- Regressão rápida -------
class TestRegression:
    def test_plans_public(self):
        r = requests.get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        data = r.json()
        plans = data["plans"] if isinstance(data, dict) else data
        assert len(plans) == 3

    def test_subscriptions_me_admin_pro(self, admin_h):
        r = requests.get(f"{BASE_URL}/api/subscriptions/me", headers=admin_h)
        assert r.status_code == 200
        assert r.json().get("plan") == "pro"

    def test_max_ai_chat_200(self, admin_h):
        r = requests.post(f"{BASE_URL}/api/max-ai/chat", headers=admin_h,
                          json={"message": "Qual meu faturamento?"})
        assert r.status_code == 200, r.text
        assert "response" in r.json() or "reply" in r.json() or "message" in r.json()

    def test_backup_cron_401(self):
        r = requests.post(f"{BASE_URL}/api/cron/backup")
        assert r.status_code in (401, 403)
