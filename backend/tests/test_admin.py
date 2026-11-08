"""Testes do painel admin e segurança. Rodar: python test_admin.py (na pasta do server.py)"""
import os, sys, importlib, time
from types import SimpleNamespace
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({"MONGO_URL": "m", "DB_NAME": "adm", "APP_ENV": "prod", "JWT_SECRET": "w" * 48,
                   "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123",
                   "STRIPE_SECRET_KEY": "sk_test_fake", "STRIPE_WEBHOOK_SECRET": "whsec_x"})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
s = importlib.import_module("server")
s._send_email_sync = lambda *a: True
import stripe
CANCELADAS = []
stripe.Subscription.cancel = staticmethod(lambda sid, **kw: CANCELADAS.append(sid) or SimpleNamespace(id=sid, status="canceled"))

from fastapi.testclient import TestClient
with TestClient(s.app) as c:
    H = lambda t: {"Authorization": f"Bearer {t}"}
    dono = c.post("/api/auth/login", json={"email": "dono@omnirepmax.com.br", "password": "senha-forte-do-dono-123"}).json()
    D = H(dono["token"])

    # segurança
    r = c.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-frame-options"] == "DENY"
    assert "strict-transport-security" in r.headers
    assert c.get("/docs").status_code == 404 and c.get("/openapi.json").status_code == 404
    print("✔ headers de segurança e /docs desligado em produção")

    # cliente com dados
    cli = c.post("/api/auth/signup", json={"email": "Rep@Teste.com", "password": "senha1234", "name": "Rep"}).json()
    uid, T = cli["user"]["id"], H(cli["token"])
    rep = c.post("/api/representadas", headers=T, json={"razao_social": "F"}).json()
    cl = c.post("/api/clientes", headers=T, json={"razao_social": "L"}).json()
    c.post("/api/pedidos", headers=T, json={"cliente_id": cl["id"], "representada_id": rep["id"], "status": "aprovado",
                                            "itens": [{"produto_id": "p", "nome": "i", "quantidade": 1, "preco_unitario": 10}]})
    c.post("/api/auth/login", json={"email": "rep@teste.com", "password": "senha1234"})

    lista = c.get("/api/admin/assinantes", headers=D).json()
    me = next(x for x in lista if x["id"] == uid)
    assert me["dias_restantes"] == 7 and me["uso"] == {"pedidos": 1, "clientes": 1} and me["last_login_at"]
    assert next(x for x in lista if x["email"] == "dono@omnirepmax.com.br")["is_superadmin"] is True
    print("✔ lista com dias restantes, uso e último acesso")

    # edição de dados
    r = c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"name": "Rep Editado", "empresa": "ACME", "telefone": "47999"})
    assert r.status_code == 200
    assert c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"name": "  "}).status_code == 400
    print("✔ edição de nome, empresa e telefone")

    # encerrar teste → trava escrita
    assert c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"encerrar_teste": True}).json()["situacao"]["acesso"] == "somente_leitura"
    assert c.post("/api/clientes", headers=T, json={"razao_social": "X"}).status_code == 402
    assert c.get("/api/clientes", headers=T).status_code == 200
    # estender teste → destrava
    r = c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"dias_extras_trial": 15}).json()
    assert r["situacao"]["acesso"] == "ativo" and r["situacao"]["dias_restantes"] == 15
    assert c.post("/api/clientes", headers=T, json={"razao_social": "X"}).status_code == 200
    # cortesia com data
    r = c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"cortesia_plano": "pro", "cortesia_ate": "2027-01-31"}).json()
    assert r["situacao"]["plano"] == "pro" and r["situacao"]["acesso"] == "ativo"
    assert c.patch(f"/api/admin/assinantes/{dono['user']['id']}", headers=D, json={"encerrar_teste": True}).status_code == 400
    print("✔ encerrar teste trava; estender destrava; cortesia com data; dono protegido")

    # assinatura Stripe ativa: plano bloqueado, dados liberados
    async def ativar():
        await s.db.users.update_one({"id": uid}, {"$set": {"plan": "solo", "subscription_status": "active",
                                                           "stripe_subscription_id": "sub_9", "stripe_customer_id": "cus_9"}})
    c.portal.call(ativar)
    assert c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"dias_extras_trial": 5}).status_code == 409
    assert c.patch(f"/api/admin/assinantes/{uid}", headers=D, json={"telefone": "1"}).status_code == 200
    print("✔ com Stripe ativo: plano protegido, dados editáveis")

    # exclusão
    assert c.post(f"/api/admin/assinantes/{uid}/excluir", headers=T, json={"confirmacao_email": "rep@teste.com"}).status_code == 403
    assert c.post(f"/api/admin/assinantes/{uid}/excluir", headers=D, json={"confirmacao_email": "outro@x.com"}).status_code == 400
    assert c.post(f"/api/admin/assinantes/{dono['user']['id']}/excluir", headers=D, json={"confirmacao_email": "dono@omnirepmax.com.br"}).status_code == 400
    r = c.post(f"/api/admin/assinantes/{uid}/excluir", headers=D, json={"confirmacao_email": "REP@teste.com"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["stripe_cancelado"] is True and CANCELADAS == ["sub_9"]
    assert j["removidos"]["users"] == 1 and j["removidos"]["pedidos"] == 1 and j["removidos"]["leads"] == 1
    assert c.get("/api/auth/me", headers=T).status_code == 401
    assert c.post("/api/auth/login", json={"email": "rep@teste.com", "password": "senha1234"}).status_code == 401
    assert not any(x["id"] == uid for x in c.get("/api/admin/assinantes", headers=D).json())
    # dados do outro tenant intactos
    assert c.get("/api/auth/me", headers=D).status_code == 200
    print("✔ exclusão: confirmação por e-mail, cancela Stripe, apaga tudo do tenant, dono protegido")

print("\nTODOS OS TESTES DO ADMIN PASSARAM")
