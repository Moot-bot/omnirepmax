"""Backend verification for deployment readiness.
Covers: health endpoints, auth, plans, clientes, system reset, comissoes delete protection.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASS = "admin123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- Health ----
def test_root_health(session):
    # /health is served by backend internally (used by K8s liveness probe inside the pod).
    # External ingress routes only /api/* to backend; root paths go to frontend nginx (SPA).
    # So we validate /health against the internal backend URL.
    r = requests.get("http://localhost:8001/health", timeout=10)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    assert r.json().get("status") == "ok"


def test_api_health(session):
    r = session.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    assert r.json().get("status") == "ok"


# ---- Auth ----
def test_login_returns_token(token):
    assert isinstance(token, str) and len(token) > 20


def test_me_returns_admin(session, auth_headers):
    r = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert data.get("email") == ADMIN_EMAIL
    assert data.get("role") == "admin"


# ---- Plans ----
def test_plans_prices(session):
    r = session.get(f"{BASE_URL}/api/plans", timeout=15)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    plans = r.json()
    # support list or {plans:[...]}
    if isinstance(plans, dict):
        plans = plans.get("plans", plans.get("data", []))
    assert isinstance(plans, list) and len(plans) == 3, f"expected 3 plans got {plans}"
    prices = sorted([float(p.get("price_brl", p.get("price", p.get("preco", 0)))) for p in plans])
    assert prices == [69.0, 99.0, 129.0], f"prices mismatch: {prices}"


# ---- Clientes ----
def test_clientes_list(session, auth_headers):
    r = session.get(f"{BASE_URL}/api/clientes", headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert isinstance(data, list) or isinstance(data, dict)


# ---- System reset ----
def test_system_reset_preview(session, auth_headers):
    r = session.get(f"{BASE_URL}/api/system/reset/preview", headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert isinstance(data, dict) and len(data) > 0


def test_system_reset_short_motivo(session, auth_headers):
    r = session.post(
        f"{BASE_URL}/api/system/reset",
        headers=auth_headers,
        json={"motivo": "short", "confirmacao": "RESETAR TUDO"},
        timeout=20,
    )
    assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text}"


def test_system_reset_wrong_confirm(session, auth_headers):
    r = session.post(
        f"{BASE_URL}/api/system/reset",
        headers=auth_headers,
        json={"motivo": "motivo valido com mais de dez caracteres", "confirmacao": "WRONG"},
        timeout=20,
    )
    assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text}"


# ---- Comissoes delete protection ----
def test_comissoes_delete_protection(session, auth_headers):
    r = session.get(f"{BASE_URL}/api/comissoes", headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    comissoes = r.json()
    if isinstance(comissoes, dict):
        comissoes = comissoes.get("data", comissoes.get("items", []))
    if not comissoes:
        pytest.skip("no comissoes to test delete")

    paid = next((c for c in comissoes if (c.get("status") or "").lower() in ("pago", "paid")), None)
    not_paid = next((c for c in comissoes if (c.get("status") or "").lower() not in ("pago", "paid")), None)

    if paid:
        pid = paid.get("id") or paid.get("_id")
        r = session.delete(f"{BASE_URL}/api/comissoes/{pid}", headers=auth_headers, timeout=15)
        assert r.status_code == 400, f"paid comissao delete expected 400 got {r.status_code} {r.text}"

    if not_paid:
        nid = not_paid.get("id") or not_paid.get("_id")
        r = session.delete(f"{BASE_URL}/api/comissoes/{nid}", headers=auth_headers, timeout=15)
        assert r.status_code in (200, 204), f"non-paid delete expected 200 got {r.status_code} {r.text}"
