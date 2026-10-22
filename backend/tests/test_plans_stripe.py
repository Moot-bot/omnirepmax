"""Tests for /api/plans, /api/subscriptions/me, /api/payments/*, /api/stripe/webhook."""
import os, time, requests, pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASSWORD = "admin123"
ORIGIN = BASE_URL


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def new_user():
    email = f"TEST_plans_{int(time.time())}@example.com"
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "test1234", "name": "Plans Tester", "empresa": "Acme"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"]}


# ---------- /api/plans ----------
def test_plans_public_returns_three():
    r = requests.get(f"{API}/plans")
    assert r.status_code == 200
    data = r.json()
    assert data["trial_days"] == 7
    assert len(data["plans"]) == 3
    ids = {p["id"] for p in data["plans"]}
    assert ids == {"solo", "pro", "equipe"}
    prices = {p["id"]: p["price_brl"] for p in data["plans"]}
    assert prices == {"solo": 97, "pro": 197, "equipe": 397}
    for p in data["plans"]:
        assert p["lookup_key"].startswith("omnirepmax_") and p["lookup_key"].endswith("_monthly")
        assert isinstance(p["features"], list) and len(p["features"]) > 0


# ---------- /api/subscriptions/me ----------
def test_subscription_me_requires_auth():
    r = requests.get(f"{API}/subscriptions/me")
    assert r.status_code in (401, 403)


def test_subscription_me_admin_is_pro(admin_token):
    r = requests.get(f"{API}/subscriptions/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "pro"
    assert data["is_trial"] is False


def test_subscription_me_new_user_trial(new_user):
    r = requests.get(f"{API}/subscriptions/me", headers={"Authorization": f"Bearer {new_user['token']}"})
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "trial"
    assert data["is_trial"] is True
    # trial_days_left should exist and be close to 7
    assert data["trial_days_left"] is not None
    assert 5 <= data["trial_days_left"] <= 7
    assert data["trial_ends_at"]  # not null


# ---------- /api/payments/checkout ----------
def test_checkout_requires_auth():
    r = requests.post(f"{API}/payments/checkout", json={"lookup_key": "omnirepmax_pro_monthly", "origin_url": ORIGIN})
    assert r.status_code in (401, 403)


def test_checkout_success_admin(admin_token):
    r = requests.post(
        f"{API}/payments/checkout",
        json={"lookup_key": "omnirepmax_pro_monthly", "origin_url": ORIGIN},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["checkout_url"].startswith("https://")
    assert data["session_id"].startswith("cs_test_")
    # persist session_id for status test
    pytest.session_id_pro = data["session_id"]


def test_checkout_invalid_lookup_key(admin_token):
    r = requests.post(
        f"{API}/payments/checkout",
        json={"lookup_key": "omnirepmax_doesnotexist_monthly", "origin_url": ORIGIN},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 500
    assert "não encontrado" in r.text.lower() or "nao encontrado" in r.text.lower()


# ---------- /api/payments/status ----------
def test_payment_status_public_pending():
    sid = getattr(pytest, "session_id_pro", None)
    assert sid, "requires test_checkout_success_admin to run first"
    r = requests.get(f"{API}/payments/status/{sid}")  # no auth
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == sid
    assert data["payment_status"] == "pending"
    assert data["plan_id"] == "pro"


def test_payment_status_not_found():
    r = requests.get(f"{API}/payments/status/cs_test_doesnotexist123")
    assert r.status_code == 404


# ---------- /api/stripe/webhook ----------
def test_webhook_rejects_bad_signature():
    r = requests.post(f"{API}/stripe/webhook", data=b'{"id":"evt_x","type":"checkout.session.completed"}', headers={"stripe-signature": "t=1,v1=badhex"})
    assert r.status_code == 400


def test_webhook_rejects_no_signature():
    r = requests.post(f"{API}/stripe/webhook", data=b'{}')
    assert r.status_code == 400


# ---------- multi-tenant on payment_transactions ----------
def test_checkout_assigns_tenant_id(new_user):
    r = requests.post(
        f"{API}/payments/checkout",
        json={"lookup_key": "omnirepmax_solo_monthly", "origin_url": ORIGIN},
        headers={"Authorization": f"Bearer {new_user['token']}"},
    )
    assert r.status_code == 200
    sid = r.json()["session_id"]
    # Status is public and only exposes session fields; we use it to confirm plan_id mapping
    s = requests.get(f"{API}/payments/status/{sid}")
    assert s.status_code == 200
    assert s.json()["plan_id"] == "solo"
    assert s.json()["payment_status"] == "pending"
