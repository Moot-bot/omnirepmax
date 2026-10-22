"""Multi-tenant signup, MAX AI, forgot/reset password and tenant isolation tests."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def new_user():
    """Signup fresh tenant - returns dict with token/user/password/email."""
    email = f"TEST_tenant_{uuid.uuid4().hex[:10]}@example.com"
    password = "Secret123!"
    body = {"email": email, "password": password, "name": "Tenant Tester", "empresa": "TestCo", "telefone": "11999990000"}
    r = requests.post(f"{API}/auth/signup", json=body, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="module")
def new_user_headers(new_user):
    return {"Authorization": f"Bearer {new_user['token']}"}


# ---------- Auth: Signup ----------
class TestSignup:
    def test_signup_new_email_returns_token_and_tenant_id(self, new_user):
        u = new_user["user"]
        assert "id" in u
        assert u.get("tenant_id") == u["id"], f"tenant_id must equal user.id: {u}"
        assert u.get("role") == "admin"
        assert new_user["token"]
        # password_hash never leaked
        assert "password_hash" not in u

    def test_signup_duplicate_email_returns_400(self, new_user):
        body = {"email": new_user["email"], "password": "anotherpass", "name": "Dup"}
        r = requests.post(f"{API}/auth/signup", json=body, timeout=30)
        assert r.status_code == 400, r.text


# ---------- Auth: Login payload includes tenant_id ----------
class TestLoginTenantId:
    def test_admin_login_returns_user_with_tenant_id(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200
        me = r.json()
        assert "tenant_id" in me and me["tenant_id"]

    def test_login_response_includes_tenant_id(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        user = r.json()["user"]
        assert user.get("tenant_id")


# ---------- Multi-tenant isolation ----------
class TestTenantIsolation:
    def test_new_user_dashboard_is_empty(self, new_user_headers):
        r = requests.get(f"{API}/dashboard", headers=new_user_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("clientes_ativos", 0) == 0, d
        assert d.get("pedidos_faturados", 0) == 0, d
        # faturamento_ano may be 0
        assert d.get("faturamento_ano", 0) == 0, d

    def test_admin_dashboard_has_seed_data(self, admin_headers):
        r = requests.get(f"{API}/dashboard", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("clientes_ativos", 0) >= 5, d
        assert d.get("pedidos_faturados", 0) >= 9, d
        assert d.get("faturamento_ano", 0) > 0, d

    def test_new_user_list_endpoints_empty(self, new_user_headers):
        for ep in ["representadas", "clientes", "produtos", "pedidos"]:
            r = requests.get(f"{API}/{ep}", headers=new_user_headers, timeout=30)
            assert r.status_code == 200, (ep, r.text)
            assert r.json() == [], f"{ep} should be empty for new tenant, got {r.json()}"


# ---------- Full CRUD per tenant + cross-tenant access denied ----------
class TestCrossTenantIsolation:
    def test_full_create_flow_and_cross_tenant_block(self, new_user_headers, admin_headers):
        # Create representada
        rep_body = {"razao_social": "TEST_Rep_" + uuid.uuid4().hex[:6], "nome_fantasia": "RepX",
                    "cnpj": "11.222.333/0001-44", "comissao_padrao": 5.0}
        r = requests.post(f"{API}/representadas", headers=new_user_headers, json=rep_body, timeout=30)
        assert r.status_code == 200, r.text
        rep = r.json()
        assert rep.get("tenant_id")

        # Create cliente
        cli_body = {"razao_social": "TEST_Cli", "nome_fantasia": "CliX", "cnpj_cpf": "22.333.444/0001-55",
                    "cidade": "SP", "uf": "SP"}
        r = requests.post(f"{API}/clientes", headers=new_user_headers, json=cli_body, timeout=30)
        assert r.status_code == 200, r.text
        cli = r.json()
        assert cli.get("tenant_id")

        # Create produto
        prod_body = {"nome": "TEST_Prod", "codigo": "P1", "preco": 10.0, "representada_id": rep["id"]}
        r = requests.post(f"{API}/produtos", headers=new_user_headers, json=prod_body, timeout=30)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod.get("tenant_id")

        # Create pedido
        ped_body = {
            "cliente_id": cli["id"], "representada_id": rep["id"],
            "itens": [{"produto_id": prod["id"], "nome": prod["nome"], "quantidade": 2, "preco_unitario": 10.0, "subtotal": 20.0}],
            "total": 20.0, "status": "rascunho", "comissao_percentual": 5.0, "comissao_valor": 1.0,
        }
        r = requests.post(f"{API}/pedidos", headers=new_user_headers, json=ped_body, timeout=30)
        assert r.status_code == 200, r.text
        ped = r.json()
        assert ped.get("tenant_id")

        # List returns only own docs (count == 1)
        for ep in ["representadas", "clientes", "produtos", "pedidos"]:
            lst = requests.get(f"{API}/{ep}", headers=new_user_headers, timeout=30).json()
            assert len(lst) == 1, f"{ep} should have exactly 1 doc for new tenant, got {len(lst)}"

        # Fetch admin's first representada id
        admin_reps = requests.get(f"{API}/representadas", headers=admin_headers, timeout=30).json()
        assert len(admin_reps) > 0
        admin_rep_id = admin_reps[0]["id"]

        # New user attempts to DELETE admin's representada → 404
        r = requests.delete(f"{API}/representadas/{admin_rep_id}", headers=new_user_headers, timeout=30)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

        # New user attempts to UPDATE admin's representada → 404
        r = requests.put(f"{API}/representadas/{admin_rep_id}", headers=new_user_headers,
                         json={"razao_social": "HACK", "nome_fantasia": "HACK", "cnpj": "00.000.000/0001-00", "comissao_padrao": 1.0},
                         timeout=30)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

        # Verify admin rep still present and untouched
        after = requests.get(f"{API}/representadas", headers=admin_headers, timeout=30).json()
        got = next((x for x in after if x["id"] == admin_rep_id), None)
        assert got is not None
        assert got.get("razao_social") != "HACK"


# ---------- MAX AI ----------
class TestMaxAI:
    def test_max_ai_admin_returns_real_values(self, admin_headers):
        r = requests.post(f"{API}/max-ai/chat", headers=admin_headers,
                          json={"message": "Qual meu faturamento total e meus maiores clientes?"}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data
        assert not data.get("error"), data
        reply = data["reply"]
        assert isinstance(reply, str) and len(reply) > 10
        assert "R$" in reply, f"Expected R$ in reply: {reply[:300]}"

    def test_max_ai_new_user_sees_no_data(self, new_user_headers):
        # Create a fresh brand-new user with ZERO data (not the one that CRUD test polluted)
        email = f"TEST_empty_{uuid.uuid4().hex[:10]}@example.com"
        s = requests.post(f"{API}/auth/signup", json={"email": email, "password": "Secret123!", "name": "Empty"}, timeout=30)
        assert s.status_code == 200
        tok = s.json()["token"]
        r = requests.post(f"{API}/max-ai/chat", headers={"Authorization": f"Bearer {tok}"},
                          json={"message": "Qual meu faturamento total?"}, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert not data.get("error"), data
        reply = data["reply"].lower()
        # Should mention absence of data OR be a zero/empty response
        assert any(w in reply for w in ["não cons", "nao cons", "sem dados", "ausên", "ausen", "nenhum", "não há", "nao ha", "0,00", "r$ 0", "zero", "sem registros", "não possui", "nao possui"]), f"Expected 'no data' indication, got: {reply[:400]}"


# ---------- Forgot/Reset password ----------
class TestForgotReset:
    def test_forgot_password_returns_token_dev_mode(self):
        # Create ephemeral user
        email = f"TEST_fp_{uuid.uuid4().hex[:10]}@example.com"
        password = "OldPass123"
        s = requests.post(f"{API}/auth/signup", json={"email": email, "password": password, "name": "FP"}, timeout=30)
        assert s.status_code == 200
        # Forgot
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("token"), data
        token = data["token"]

        # Reset
        new_pw = "NewPass456"
        r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pw}, timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.json().get("ok") is True

        # Login with new password works
        li = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pw}, timeout=30)
        assert li.status_code == 200, li.text

        # Old password fails
        bad = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
        assert bad.status_code == 401

        # Reusing same token fails
        r3 = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another789"}, timeout=30)
        assert r3.status_code == 400, r3.text

    def test_forgot_password_nonexistent_email_still_ok_no_token(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "doesnotexist_xyz@nowhere.local"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "token" not in data  # no enumeration

    def test_reset_password_short_rejected(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "whatever", "password": "123"}, timeout=30)
        assert r.status_code == 400


# ---------- Regression: PATCH /auth/me ----------
class TestPatchMe:
    def test_patch_me_updates_profile(self, admin_headers):
        payload = {"name": "Alvaro Admin TEST", "empresa": "OmniRep TEST", "telefone": "11911112222"}
        r = requests.patch(f"{API}/auth/me", headers=admin_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k, v in payload.items():
            assert d.get(k) == v
        assert "password_hash" not in d


# ---------- Regression: cron backup auth ----------
class TestBackupCron:
    def test_cron_backup_no_auth_401(self):
        r = requests.post(f"{API}/cron/backup", timeout=30)
        assert r.status_code in (401, 403), r.text

    def test_cron_backup_wrong_secret_401(self):
        r = requests.post(f"{API}/cron/backup", headers={"Authorization": "Bearer wrong"}, timeout=30)
        assert r.status_code in (401, 403), r.text

    def test_cron_backup_right_secret_200(self):
        secret = "omni-rep-backup-secret-1f9c47b3e6a2d5f8c1b0e4a9d7f2c6b3"
        r = requests.post(f"{API}/cron/backup", headers={"Authorization": f"Bearer {secret}"}, timeout=60)
        assert r.status_code == 200, r.text
