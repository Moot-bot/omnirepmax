"""Teste do diagnóstico de cobrança. Rodar: python test_diagnostico.py"""
import os, sys, importlib
from types import SimpleNamespace as NS
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({"MONGO_URL": "m", "DB_NAME": "dg", "APP_ENV": "prod", "JWT_SECRET": "g" * 48,
                   "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123"})
os.environ.pop("STRIPE_SECRET_KEY", None); os.environ.pop("STRIPE_WEBHOOK_SECRET", None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
s = importlib.import_module("server"); s._send_email_sync = lambda *a: True
import stripe
from fastapi.testclient import TestClient
with TestClient(s.app) as c:
    D = {"Authorization": "Bearer " + c.post("/api/auth/login", json={"email": "dono@omnirepmax.com.br", "password": "senha-forte-do-dono-123"}).json()["token"]}
    T = {"Authorization": "Bearer " + c.post("/api/auth/signup", json={"email": "x@y.com", "password": "senha1234", "name": "X"}).json()["token"]}
    assert c.get("/api/admin/diagnostico", headers=T).status_code == 403
    r = c.get("/api/admin/diagnostico", headers=D).json()
    assert r["pronto_para_cobrar"] is False
    k = next(i for i in r["itens"] if i["item"].startswith("Chave secreta"))
    assert k["ok"] is False and "Render" in k["como_resolver"]
    print("✔ sem chave: aponta STRIPE_SECRET_KEY vazia e como resolver (é a causa da mensagem 'em breve')")

    s.STRIPE_SECRET_KEY = "pk_live_abc"; r = c.get("/api/admin/diagnostico", headers=D).json()
    assert "publicável" in next(i for i in r["itens"] if i["item"].startswith("Chave secreta"))["como_resolver"]
    print("✔ chave pk_ colocada por engano: avisa que é a publicável")

    s.STRIPE_SECRET_KEY = "sk_test_abc"; s.STRIPE_WEBHOOK_SECRET = "whsec_x"
    rec = {"interval": "month"}
    stripe.Price.list = staticmethod(lambda **kw: NS(data=[NS(lookup_key="omnirepmax_solo_monthly", recurring=rec, currency="brl", unit_amount=3900),
                                                           NS(lookup_key="omnirepmax_pro_monthly", recurring=rec, currency="brl", unit_amount=7900)]))
    stripe.WebhookEndpoint.list = staticmethod(lambda **kw: NS(data=[NS(url="https://tioalvaro.onrender.com/api/stripe/webhook", status="enabled",
                                                                        enabled_events=s.EVENTOS_WEBHOOK[:-1])]))
    stripe.billing_portal.Configuration.list = staticmethod(lambda **kw: NS(data=[]))
    r = c.get("/api/admin/diagnostico", headers=D).json(); it = {i["item"]: i for i in r["itens"]}
    assert r["modo_stripe"] == "teste" and r["pronto_para_cobrar"] is False
    assert it["Preço do plano Solo"]["ok"] and not it["Preço do plano Profissional"]["ok"] and "R$ 79.00" in it["Preço do plano Profissional"]["detalhe"]
    assert not it["Preço do plano Equipe"]["ok"] and "omnirepmax_equipe_monthly" in it["Preço do plano Equipe"]["detalhe"]
    assert not it["Webhook no Stripe"]["ok"] and "invoice.payment_failed" in it["Webhook no Stripe"]["detalhe"]
    assert not it["Portal do cliente (Gerenciar assinatura)"]["ok"]
    print("✔ modo teste: preço com valor errado, preço sem chave de pesquisa, evento faltando no webhook e portal não salvo")

    stripe.Price.list = staticmethod(lambda **kw: NS(data=[NS(lookup_key=p["lookup_key"], recurring=rec, currency="brl", unit_amount=p["price_brl"] * 100) for p in s.PLANS]))
    stripe.WebhookEndpoint.list = staticmethod(lambda **kw: NS(data=[NS(url="https://tioalvaro.onrender.com/api/stripe/webhook", status="enabled", enabled_events=s.EVENTOS_WEBHOOK)]))
    stripe.billing_portal.Configuration.list = staticmethod(lambda **kw: NS(data=[NS(id="bpc_1")]))
    r = c.get("/api/admin/diagnostico", headers=D).json()
    assert r["pronto_para_cobrar"] is True
    assert c.get("/api/subscriptions/me", headers=T).json()["pagamentos_configurados"] is True
    print("✔ tudo certo: pronto para cobrar e a tela de Planos libera o botão Assinar")
print("\nTESTES DO DIAGNÓSTICO PASSARAM")
