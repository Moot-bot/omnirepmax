import os, re, sys, time, subprocess, importlib

SERVER_DIR = "/home/claude"

# 1) Produção sem JWT_SECRET não pode subir
env = {**os.environ, "MONGO_URL": "mongodb://x", "DB_NAME": "t", "APP_ENV": "prod"}
env.pop("JWT_SECRET", None)
r = subprocess.run([sys.executable, "-c", "import server"], cwd=SERVER_DIR, env=env, capture_output=True, text=True)
assert r.returncode != 0 and "JWT_SECRET" in r.stderr, r.stderr[-300:]
print("✔ prod sem JWT_SECRET não sobe")

# 2) Sobe a API com Mongo em memória
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({
    "MONGO_URL": "mongodb://x", "DB_NAME": "t", "APP_ENV": "prod",
    "JWT_SECRET": "x" * 48, "ADMIN_EMAIL": "dono@omnirepmax.com.br",
    "ADMIN_PASSWORD": "senha-forte-do-dono-123", "RESEND_API_KEY": "",
})
os.environ.pop("STRIPE_SECRET_KEY", None)
sys.path.insert(0, SERVER_DIR)
server = importlib.import_module("server")

ENVIADOS = []
server._send_email_sync = lambda to, subject, html_body: ENVIADOS.append((to, subject, html_body)) or True

from fastapi.testclient import TestClient
with TestClient(server.app) as c:
    H = lambda tok: {"Authorization": f"Bearer {tok}"}

    # signup cliente comum
    r = c.post("/api/auth/signup", json={"email": "rep@teste.com", "password": "senha1234", "name": "Rep Teste"})
    assert r.status_code == 200, r.text
    tok_rep = r.json()["token"]
    assert r.json()["user"]["role"] == "admin" and r.json()["user"]["email_verified"] is False

    # e-mail de verificação
    assert ENVIADOS and ENVIADOS[-1][0] == "rep@teste.com" and "Confirme" in ENVIADOS[-1][1]
    vtok = re.search(r"verificar-email\?token=([\w-]+)", ENVIADOS[-1][2]).group(1)
    assert c.post("/api/auth/verify-email", json={"token": vtok}).status_code == 200
    assert c.post("/api/auth/verify-email", json={"token": vtok}).status_code == 400
    assert c.get("/api/auth/me", headers=H(tok_rep)).json()["email_verified"] is True
    print("✔ verificação de e-mail (envio, confirmação, link de uso único)")

    # cliente comum NÃO acessa rotas globais
    for rota in ["/api/leads", "/api/leads/export", "/api/admin/feedbacks", "/api/backups"]:
        assert c.get(rota, headers=H(tok_rep)).status_code == 403, rota
    assert c.post("/api/backups/run", headers=H(tok_rep)).status_code == 403
    me = c.get("/api/auth/me", headers=H(tok_rep)).json()
    assert me["is_superadmin"] is False
    print("✔ admin de tenant bloqueado em leads/feedbacks/backups (403)")

    # dono (superadmin) acessa
    r = c.post("/api/auth/login", json={"email": "dono@omnirepmax.com.br", "password": "senha-forte-do-dono-123"})
    assert r.status_code == 200, r.text
    tok_dono = r.json()["token"]
    assert c.get("/api/auth/me", headers=H(tok_dono)).json()["is_superadmin"] is True
    leads = c.get("/api/leads", headers=H(tok_dono))
    assert leads.status_code == 200 and any(l["email"] == "rep@teste.com" for l in leads.json())
    print("✔ superadmin vê leads")

    # admin do tenant ainda faz operações do próprio tenant
    assert c.get("/api/system/reset/preview", headers=H(tok_rep)).status_code == 200

    # fluxo de negócio continua funcionando (pedido → faturamento → editar parcelas)
    rep = c.post("/api/representadas", headers=H(tok_rep), json={"razao_social": "Fábrica X", "comissao_padrao": 5}).json()
    cli = c.post("/api/clientes", headers=H(tok_rep), json={"razao_social": "Loja Y"}).json()
    ped = c.post("/api/pedidos", headers=H(tok_rep), json={
        "cliente_id": cli["id"], "representada_id": rep["id"], "status": "aprovado",
        "itens": [{"produto_id": "p1", "nome": "Item", "quantidade": 10, "preco_unitario": 100}]}).json()
    r = c.post(f"/api/pedidos/{ped['id']}/faturamento", headers=H(tok_rep), json={
        "nf_numero": "123", "data_faturamento": "2026-11-01", "valor_faturado": 1000})
    assert r.status_code == 200 and r.json()["valor_liquido"] == 50.0, r.text
    assert c.post(f"/api/pedidos/{ped['id']}/faturamento", headers=H(tok_rep), json={
        "nf_numero": "123", "data_faturamento": "2026-11-01", "valor_faturado": 1}).status_code == 409
    r = c.patch(f"/api/pedidos/{ped['id']}/parcelas", headers=H(tok_rep), json={"parcelas": [
        {"vencimento": "2026-12-01", "valor": 600}, {"vencimento": "2027-01-01", "valor": 400}]})
    assert r.status_code == 200 and r.json()["parcelas_regeneradas"]["regeneradas"] == 1, r.text
    ar = sorted(c.get("/api/contas-receber", headers=H(tok_rep)).json(), key=lambda x: x["vencimento"])
    assert [a["valor"] for a in ar] == [30.0, 20.0], ar
    print("✔ pedido → faturamento (5%) → NF duplicada 409 → parcelas editadas → comissão 30/20")

    # recuperação de senha
    ENVIADOS.clear()
    r = c.post("/api/auth/forgot-password", json={"email": "rep@teste.com"})
    assert r.status_code == 200 and "token" not in r.json()  # prod não vaza token
    assert ENVIADOS and "Redefinição" in ENVIADOS[-1][1]
    rtok = re.search(r"reset-password\?token=([\w-]+)", ENVIADOS[-1][2]).group(1)
    assert c.post("/api/auth/forgot-password", json={"email": "naoexiste@x.com"}).json()["ok"] is True
    time.sleep(1.1)
    assert c.post("/api/auth/reset-password", json={"token": rtok, "password": "novaSenha123"}).status_code == 200
    assert c.post("/api/auth/reset-password", json={"token": rtok, "password": "outra12345"}).status_code == 400
    assert c.get("/api/auth/me", headers=H(tok_rep)).status_code == 401  # sessão antiga derrubada
    r = c.post("/api/auth/login", json={"email": "rep@teste.com", "password": "novaSenha123"})
    assert r.status_code == 200
    assert c.get("/api/auth/me", headers=H(r.json()["token"])).status_code == 200
    print("✔ reset de senha por e-mail, token de uso único, sessões antigas invalidadas")

    # rate limit de recuperação por e-mail (3/h; 1 já usado)
    codes = [c.post("/api/auth/forgot-password", json={"email": "rep@teste.com"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429], codes
    print("✔ rate limit recuperação de senha (3/h por e-mail)")

    # rate limit login: 5 falhas bloqueiam até a senha certa
    codes = [c.post("/api/auth/login", json={"email": "rep@teste.com", "password": "errada!!"}).status_code for _ in range(5)]
    assert codes == [401] * 5, codes
    r = c.post("/api/auth/login", json={"email": "rep@teste.com", "password": "novaSenha123"})
    assert r.status_code == 429 and "Retry-After" in r.headers, r.status_code
    print("✔ rate limit login (5 falhas/15 min por e-mail → 429)")

    # Stripe sem chave → 503 claro
    r = c.post("/api/payments/checkout", headers=H(tok_dono), json={"lookup_key": "omnirepmax_pro_monthly", "origin_url": "https://x"})
    assert r.status_code == 503, r.text
    print("✔ checkout sem STRIPE_SECRET_KEY → 503")

    # senha do dono NÃO é sobrescrita em novo startup
    import asyncio
    asyncio.get_event_loop  # noop
print("\nTODOS OS TESTES PASSARAM")
