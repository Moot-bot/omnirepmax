"""Backend tests for backup cron endpoints + existing CRUD sanity checks."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sales-hub-pro-44.preview.emergentagent.com").rstrip("/")
WEBHOOK_SECRET = "omni-rep-backup-secret-1f9c47b3e6a2d5f8c1b0e4a9d7f2c6b3"
ADMIN_EMAIL = "alvarofilho39@gmail.com"
ADMIN_PASSWORD = "admin123"


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


# ---------- Cron backup endpoint ----------
class TestCronBackup:
    def test_cron_backup_without_auth_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/cron/backup", timeout=15)
        assert r.status_code == 401, f"expected 401, got {r.status_code} {r.text}"

    def test_cron_backup_with_wrong_token_returns_401(self):
        r = requests.post(
            f"{BASE_URL}/api/cron/backup",
            headers={"Authorization": "Bearer wrong-token", "X-Webhook-Id": str(uuid.uuid4())},
            timeout=15,
        )
        assert r.status_code == 401

    def test_cron_backup_with_valid_auth_returns_accepted(self):
        wid = f"test-{uuid.uuid4()}"
        r = requests.post(
            f"{BASE_URL}/api/cron/backup",
            headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": wid},
            timeout=15,
        )
        assert r.status_code == 200, f"got {r.status_code} {r.text}"
        data = r.json()
        assert data.get("status") == "accepted"
        assert data.get("run_id") == wid

    def test_cron_backup_idempotency_same_webhook_id(self, admin_headers):
        wid = f"idem-{uuid.uuid4()}"
        # first call
        r1 = requests.post(
            f"{BASE_URL}/api/cron/backup",
            headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": wid},
            timeout=15,
        )
        assert r1.status_code == 200
        assert r1.json().get("status") == "accepted"
        # allow the background task to persist the snapshot
        time.sleep(4)
        # second call with same webhook id
        r2 = requests.post(
            f"{BASE_URL}/api/cron/backup",
            headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": wid},
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json().get("status") == "duplicate", f"expected duplicate, got {r2.json()}"

    def test_backups_listed_after_cron(self, admin_headers):
        wid = f"list-{uuid.uuid4()}"
        requests.post(
            f"{BASE_URL}/api/cron/backup",
            headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": wid},
            timeout=15,
        )
        time.sleep(4)
        r = requests.get(f"{BASE_URL}/api/backups", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1
        snap = arr[0]
        for f in ("id", "run_id", "created_at", "total_documents"):
            assert f in snap, f"missing field {f} in {snap.keys()}"
        assert isinstance(snap["total_documents"], int) and snap["total_documents"] > 0

    def test_manual_backup_run(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/backups/run", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "accepted"
        assert "run_id" in data


# ---------- Existing CRUD sanity ----------
class TestExistingEndpoints:
    def test_auth_me(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("email") == ADMIN_EMAIL

    @pytest.mark.parametrize("path", [
        "/api/dashboard",
        "/api/representadas",
        "/api/clientes",
        "/api/produtos",
        "/api/pedidos",
    ])
    def test_crud_list_endpoints(self, admin_headers, path):
        r = requests.get(f"{BASE_URL}{path}", headers=admin_headers, timeout=20)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
