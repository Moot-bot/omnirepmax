"""Testes da cobrança (etapa 2). Rodar: python test_etapa2.py  (na pasta do server.py)
Usa Mongo em memória e simula o Stripe; webhooks são assinados de verdade."""
import os, sys, json, time, hmac, hashlib, importlib, re
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta

import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
WH = "whsec_teste123"
os.environ.update({
    "MONGO_URL": "mongodb://x", "DB_NAME": "t2", "APP_ENV": "prod", "JWT_SECRET": "y" * 48,
    "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123",
    "STRIPE_SECRET_KEY": "sk_test_fake", "STRIPE_WEBHOOK_SECRET": WH, "WEBHOOK_CRON_SECRET": "cron123",
    "RESEND_API_KEY": "",
})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
server = importlib.import_module("server")
import stripe

ENVIADOS = []
server._send_email_sync = lambda to, s, h: ENVIADOS.append((to, s, h)) or True

# --- Stripe simulado
CHECKOUTS = []
stripe.Price.list = staticmethod(lambda **kw: SimpleNamespace(data=[SimpleNamespace(
    id="price_" + kw["lookup_keys"][0], recurring={"interval": "month"}, unit_amount=3900, currency="brl")]))
def _fake_checkout(**kw):
    CHECKOUTS.append(kw); return SimpleNamespace(id=f"cs_{len(CHECKOUTS)}", url=f"https://checkout.stripe.com/c/cs_{len(CHECKOUTS)}")
stripe.checkout.Session.create = staticmethod(_fake_checkout)
stripe.billing_portal.Session.create = staticmethod(lambda **kw: SimpleNamespace(url="https://billing.stripe.com/p/sess_1"))

def assinar(payload: dict):
    body = json.dumps(payload)
    ts = int(time.time())
    sig = hmac.new(WH.encode(), f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()
    return body, {"stripe-signature": f"t={ts},v1={sig}", "content-type": "application/json"}

N = [0]
def evento(tipo, obj, created=None):
    N[0] += 1
    return {"id": f"evt_{N[0]}", "type": tipo, "created": created or int(time.time()), "data": {"object": obj}}

def sub_obj(uid, status, lookup="omnirepmax_solo_monthly", cancel=False):
    return {"id": "sub_1", "customer": "cus_1", "status": status, "cancel_at_period_end": cancel,
            "metadata": {"user_id": uid, "plan_id": "solo"},
            "items": {"data": [{"price": {"lookup_key": lookup}, "current_period_end": int(time.time()) + 30 * 86400}]}}

from fastapi.testclient import TestClient
with TestClient(server.app) as c:
    H = lambda tok: {"Authorization": f"Bearer {tok}"}
    post_wh = lambda ev: c.post("/api/stripe/webhook", content=assinar(ev)[0], headers=assinar(ev)[1])

    r = c.post("/api/auth/signup", json={"email": "rep@teste.com", "password": "senha1234", "name": "Rep"})
    tok = r.json()["token"]; uid = r.json()["user"]["id"]
    dono = c.post("/api/auth/login", json={"email": "dono@omnirepmax.com.br", "password": "senha-forte-do-dono-123"}).json()["token"]

    # --- trial ativo: tudo liberado
    s = c.get("/api/subscriptions/me", headers=H(tok)).json()
    assert s["acesso"] == "ativo" and s["plano_efetivo"] == "trial" and s["trial_days_left"] == 7, s
    rep1 = c.post("/api/representadas", headers=H(tok), json={"razao_social": "Fábrica 1"})
    assert rep1.status_code == 200
    print("✔ trial ativo: 7 dias, cadastro liberado")

    # --- checkout durante o trial: cobra só no fim do teste, sem duplicar cliente
    r = c.post("/api/payments/checkout", headers=H(tok), json={"lookup_key": "omnirepmax_solo_monthly", "origin_url": "https://evil.com"})
    assert r.status_code == 200, r.text
    kw = CHECKOUTS[-1]
    assert kw["subscription_data"]["trial_end"] > time.time() + 5 * 86400, "trial_end deveria acompanhar o teste"
    assert kw["customer_email"] == "rep@teste.com" and kw["subscription_data"]["metadata"]["user_id"] == uid
    assert kw["success_url"].startswith("https://www.omnirepmax.com.br/"), "origem desconhecida deve cair no FRONTEND_URL"
    assert kw["locale"] == "pt-BR"
    print("✔ checkout no trial: 1ª cobrança no fim do teste, origem externa bloqueada")

    # --- trial vence → somente leitura
    assert c.patch(f"/api/admin/assinantes/{uid}", headers=H(dono), json={"dias_extras_trial": 1}).status_code == 200
    import asyncio
    async def vencer():
        await server.db.users.update_one({"id": uid}, {"$set": {"trial_ends_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}})
    c.portal.call(vencer)
    s = c.get("/api/subscriptions/me", headers=H(tok)).json()
    assert s["acesso"] == "somente_leitura" and s["motivo"] == "trial_expirado", s
    r = c.post("/api/representadas", headers=H(tok), json={"razao_social": "X"})
    assert r.status_code == 402 and "teste terminou" in r.json()["detail"], r.text
    assert c.get("/api/representadas", headers=H(tok)).status_code == 200
    assert c.get("/api/relatorios/geral", headers=H(tok)).status_code == 200
    assert c.post("/api/feedback", headers=H(tok), json={"mensagem": "oi"}).status_code == 200
    print("✔ trial vencido: escrita 402, leitura/exportação e feedback continuam")

    # checkout com trial vencido: sem trial_end
    c.post("/api/payments/checkout", headers=H(tok), json={"lookup_key": "omnirepmax_solo_monthly"})
    assert "trial_end" not in CHECKOUTS[-1]["subscription_data"]

    # --- webhook: assinatura Solo ativa
    assert c.post("/api/stripe/webhook", content="{}", headers={"stripe-signature": "t=1,v1=errada"}).status_code == 400
    ev = evento("checkout.session.completed", {"id": "cs_2", "customer": "cus_1", "subscription": "sub_1", "metadata": {"user_id": uid, "plan_id": "solo"}})
    assert post_wh(ev).json()["status"] == "ok"
    assert post_wh(ev).json()["status"] == "duplicate"
    t_upd = int(time.time()) + 10
    assert post_wh(evento("customer.subscription.updated", sub_obj(uid, "active"), created=t_upd)).status_code == 200
    s = c.get("/api/subscriptions/me", headers=H(tok)).json()
    assert s["acesso"] == "ativo" and s["plan"] == "solo" and s["subscription_status"] == "active" and s["current_period_end"], s
    print("✔ webhooks: assinatura inválida 400, idempotência, Solo ativo")

    # --- limites do Solo
    assert c.post("/api/representadas", headers=H(tok), json={"razao_social": "Fábrica 2"}).status_code == 200
    r = c.post("/api/representadas", headers=H(tok), json={"razao_social": "Fábrica 3"})
    assert r.status_code == 402 and "até 2 representadas" in r.json()["detail"], r.text
    r = c.post("/api/max-ai/chat", headers=H(tok), json={"message": "oi"})
    assert r.status_code == 402 and "Profissional" in r.json()["detail"]
    assert c.post("/api/xml/import", headers=H(tok), json={"xml_content": "<nfe/>"}).status_code == 402
    # já assinante: não abre outro checkout
    assert c.post("/api/payments/checkout", headers=H(tok), json={"lookup_key": "omnirepmax_pro_monthly"}).status_code == 409
    assert c.post("/api/billing/portal", headers=H(tok)).json()["url"].startswith("https://billing.stripe.com")
    print("✔ Solo: limite de 2 representadas, MAX AI e XML bloqueados, portal OK, sem checkout duplicado")

    # --- upgrade para Pro via portal
    post_wh(evento("customer.subscription.updated", sub_obj(uid, "active", "omnirepmax_pro_monthly"), created=t_upd + 10))
    assert c.post("/api/representadas", headers=H(tok), json={"razao_social": "Fábrica 3"}).status_code == 200
    print("✔ upgrade para Profissional libera representadas")

    # --- evento antigo fora de ordem é ignorado
    post_wh(evento("customer.subscription.updated", sub_obj(uid, "canceled"), created=t_upd - 100))
    assert c.get("/api/subscriptions/me", headers=H(tok)).json()["acesso"] == "ativo"
    print("✔ evento fora de ordem ignorado")

    # --- falha de pagamento: e-mail + continua com acesso (past_due)
    ENVIADOS.clear()
    post_wh(evento("invoice.payment_failed", {"customer": "cus_1", "amount_due": 6900}))
    assert ENVIADOS and "Não conseguimos cobrar" in ENVIADOS[-1][1] and "R$ 69,00" in ENVIADOS[-1][2], ENVIADOS
    post_wh(evento("customer.subscription.updated", sub_obj(uid, "past_due", "omnirepmax_pro_monthly"), created=t_upd + 20))
    s = c.get("/api/subscriptions/me", headers=H(tok)).json()
    assert s["acesso"] == "ativo" and s["aviso"] == "pagamento_pendente"
    print("✔ pagamento recusado: e-mail com valor, acesso mantido com aviso")

    # --- cancelamento definitivo → somente leitura
    post_wh(evento("customer.subscription.deleted", sub_obj(uid, "canceled", "omnirepmax_pro_monthly"), created=t_upd + 30))
    s = c.get("/api/subscriptions/me", headers=H(tok)).json()
    assert s["acesso"] == "somente_leitura" and s["motivo"] == "assinatura_inativa"
    assert c.post("/api/clientes", headers=H(tok), json={"razao_social": "Y"}).status_code == 402
    # pode assinar de novo, reaproveitando o cliente Stripe
    c.post("/api/payments/checkout", headers=H(tok), json={"lookup_key": "omnirepmax_pro_monthly"})
    assert CHECKOUTS[-1].get("customer") == "cus_1" and "customer_email" not in CHECKOUTS[-1]
    print("✔ cancelada: somente leitura; nova assinatura reaproveita o cliente do Stripe")

    # --- cortesia pelo superadmin
    r2 = c.post("/api/auth/signup", json={"email": "piloto@teste.com", "password": "senha1234", "name": "Piloto"}).json()
    assert c.patch(f"/api/admin/assinantes/{r2['user']['id']}", headers=H(tok)).status_code in (403, 422)
    r = c.patch(f"/api/admin/assinantes/{r2['user']['id']}", headers=H(dono), json={"cortesia_plano": "pro"})
    assert r.status_code == 200 and r.json()["situacao"]["acesso"] == "ativo" and r.json()["situacao"]["plano"] == "pro"
    lista = c.get("/api/admin/assinantes", headers=H(dono)).json()
    assert any(x["email"] == "piloto@teste.com" and x["subscription_status"] == "cortesia" for x in lista)
    assert c.get("/api/admin/assinantes", headers=H(tok)).status_code == 403
    print("✔ superadmin concede cortesia Pro (piloto) e lista assinantes")

    # --- cron diário: aviso de fim de teste
    r3 = c.post("/api/auth/signup", json={"email": "quase@teste.com", "password": "senha1234", "name": "Quase"}).json()
    async def quase():
        await server.db.users.update_one({"id": r3["user"]["id"]}, {"$set": {"trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()}})
    c.portal.call(quase)
    assert c.post("/api/cron/diario").status_code == 401
    ENVIADOS.clear()
    r = c.post("/api/cron/diario", headers={"Authorization": "Bearer cron123"})
    assert r.json()["enviados"]["trial_acabando"] >= 1, r.json()
    assert any(to == "quase@teste.com" for to, *_ in ENVIADOS)
    r = c.post("/api/cron/diario", headers={"Authorization": "Bearer cron123"})
    assert not any(to == "quase@teste.com" for to, *_ in ENVIADOS[1:]) or r.json()["enviados"]["trial_acabando"] == 0
    print("✔ cron: avisa fim do teste uma única vez")

    # --- dono (superadmin) nunca é bloqueado
    s = c.get("/api/subscriptions/me", headers=H(dono)).json()
    assert s["acesso"] == "ativo" and s["is_superadmin"] is True
    print("✔ superadmin sempre ativo")

print("\nTODOS OS TESTES DE COBRANÇA PASSARAM")
