"""Backend tests for new dashboard fields, PATCH /auth/me (profile+logo), and PUT /representadas logo."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASSWORD = "admin123"
WEBHOOK_SECRET = "omni-rep-backup-secret-1f9c47b3e6a2d5f8c1b0e4a9d7f2c6b3"

SMALL_B64 = "data:image/png;base64,iVBORw0KGgo="


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Dashboard new + legacy fields ----------
class TestDashboard:
    def test_dashboard_returns_200(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text

    def test_dashboard_new_fields_present(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_headers, timeout=20)
        data = r.json()
        required_new = [
            "mes_atual", "despesas_mes", "saldo_mes",
            "em_atraso", "em_atraso_count",
            "projecao_valor", "projecao_comissao",
            "gastos_por_categoria", "saude_financeira", "saude_label", "avisos",
        ]
        missing = [f for f in required_new if f not in data]
        assert not missing, f"missing new fields: {missing}; keys={list(data.keys())}"

    def test_dashboard_new_fields_types(self, admin_headers):
        d = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_headers, timeout=20).json()
        assert isinstance(d["mes_atual"], str) and len(d["mes_atual"]) >= 6
        assert isinstance(d["despesas_mes"], (int, float))
        assert isinstance(d["saldo_mes"], (int, float))
        assert isinstance(d["em_atraso"], (int, float))
        assert isinstance(d["em_atraso_count"], int)
        assert isinstance(d["projecao_valor"], (int, float))
        assert isinstance(d["projecao_comissao"], (int, float))
        # saude 0..100
        assert isinstance(d["saude_financeira"], int)
        assert 0 <= d["saude_financeira"] <= 100
        assert d["saude_label"] in ("Excelente", "Boa", "Regular", "Ruim")

    def test_dashboard_gastos_por_categoria_shape_and_sorting(self, admin_headers):
        d = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_headers, timeout=20).json()
        g = d["gastos_por_categoria"]
        assert isinstance(g, list)
        for item in g:
            assert "categoria" in item and "valor" in item
            assert isinstance(item["valor"], (int, float))
        # desc sorted
        valores = [i["valor"] for i in g]
        assert valores == sorted(valores, reverse=True), f"not sorted desc: {valores}"

    def test_dashboard_avisos_shape(self, admin_headers):
        d = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_headers, timeout=20).json()
        avisos = d["avisos"]
        assert isinstance(avisos, list)
        assert len(avisos) <= 5
        for a in avisos:
            assert "titulo" in a and "valor" in a and "tipo" in a

    def test_dashboard_legacy_fields_not_regressed(self, admin_headers):
        d = requests.get(f"{BASE_URL}/api/dashboard", headers=admin_headers, timeout=20).json()
        legacy = ["faturamento_mes", "serie_faturamento", "top_produtos"]
        missing = [f for f in legacy if f not in d]
        assert not missing, f"legacy fields missing (regression): {missing}"


# ---------- PATCH /auth/me ----------
class TestAuthMeProfile:
    def test_patch_me_updates_fields(self, admin_headers):
        payload = {
            "name": "Alvaro Admin TEST",
            "logo": SMALL_B64,
            "empresa": "OmniRep TEST",
            "telefone": "+55 11 99999-0000",
        }
        r = requests.patch(f"{BASE_URL}/api/auth/me", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # no password hash leaked
        assert "password_hash" not in body
        # values applied in response
        for k, v in payload.items():
            assert body.get(k) == v, f"{k}: expected {v}, got {body.get(k)}"

    def test_get_me_returns_persisted_values(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "password_hash" not in body
        assert body.get("name") == "Alvaro Admin TEST"
        assert body.get("logo") == SMALL_B64
        assert body.get("empresa") == "OmniRep TEST"
        assert body.get("telefone") == "+55 11 99999-0000"
        assert body.get("email") == ADMIN_EMAIL


# ---------- PUT /representadas/{id} with logo ----------
class TestRepresentadaLogo:
    def test_update_representada_logo_persists(self, admin_headers):
        # pick first representada
        r = requests.get(f"{BASE_URL}/api/representadas", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        reps = r.json()
        assert isinstance(reps, list) and len(reps) >= 1, "no representadas seeded"
        rep = reps[0]
        rid = rep["id"]

        # Build full payload (PUT replaces) preserving required fields + adding logo
        payload = {
            "razao_social": rep.get("razao_social") or "Rep TEST",
            "nome_fantasia": rep.get("nome_fantasia") or "",
            "cnpj": rep.get("cnpj") or "",
            "email": rep.get("email") or "",
            "telefone": rep.get("telefone") or "",
            "endereco": rep.get("endereco") or "",
            "comissao_padrao": rep.get("comissao_padrao") or 0,
            "logo": SMALL_B64,
        }
        # include any other existing optional fields to be safe
        for k in ("inscricao_estadual", "contato", "site", "observacoes"):
            if k in rep:
                payload[k] = rep[k]

        u = requests.put(f"{BASE_URL}/api/representadas/{rid}", headers=admin_headers, json=payload, timeout=15)
        assert u.status_code == 200, f"PUT failed: {u.status_code} {u.text}"

        # GET and verify persistence
        g = requests.get(f"{BASE_URL}/api/representadas", headers=admin_headers, timeout=15)
        assert g.status_code == 200
        found = next((x for x in g.json() if x["id"] == rid), None)
        assert found is not None, "representada not returned after update"
        assert found.get("logo") == SMALL_B64


# ---------- Regression: auth flow + backup cron security ----------
class TestRegression:
    def test_login_me_logout(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        tok = r.json().get("token") or r.json().get("access_token")
        assert tok
        me = s.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
        assert me.status_code == 200
        assert me.json().get("email") == ADMIN_EMAIL
        out = s.post(f"{BASE_URL}/api/auth/logout", timeout=15)
        assert out.status_code == 200

    def test_cron_backup_unauth_401(self):
        r = requests.post(f"{BASE_URL}/api/cron/backup", timeout=15)
        assert r.status_code == 401

    def test_cron_backup_with_bearer_200(self):
        import uuid
        wid = f"regression-{uuid.uuid4()}"
        r = requests.post(
            f"{BASE_URL}/api/cron/backup",
            headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": wid},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("status") in ("accepted", "duplicate")

    def test_backups_list_requires_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/backups", headers=admin_headers, timeout=15)
        # admin currently allowed; endpoint should be 200 for admin
        assert r.status_code == 200
        assert isinstance(r.json(), list)
