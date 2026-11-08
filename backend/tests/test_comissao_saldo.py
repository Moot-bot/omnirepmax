"""Comissão a receber × Contas a Receber sempre batem.  Rodar: python test_comissao_saldo.py"""
import os, sys, importlib
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({"MONGO_URL": "m", "DB_NAME": "cs", "APP_ENV": "prod", "JWT_SECRET": "z" * 48,
                   "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123"})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
s = importlib.import_module("server"); s._send_email_sync = lambda *a: True
from fastapi.testclient import TestClient

with TestClient(s.app) as c:
    r = c.post("/api/auth/signup", json={"aceite_termos": True, "email": "a@t.com", "password": "senha1234", "name": "U"}).json()
    H = {"Authorization": f"Bearer {r['token']}"}; tid = r["user"]["tenant_id"]; db = s.db

    def com(cid, valor, parcelas, st="pendente", st_ar="aberto"):
        async def f():
            await db.comissoes.insert_one({"id": cid, "tenant_id": tid, "pedido_id": "P" + cid, "pedido_numero": cid,
                                           "valor_liquido": valor, "valor_recebido": 0, "saldo_pendente": valor, "status": st})
            for i, v in enumerate(parcelas):
                await db.contas_receber.insert_one({"id": f"{cid}-{i}", "tenant_id": tid, "comissao_id": cid, "valor": v,
                                                    "valor_recebido": 0, "saldo_pendente": v, "vencimento": f"2026-12-0{i+1}", "status": st_ar})
        c.portal.call(f)
    get = lambda col, i: c.portal.call(lambda: db[col].find_one({"id": i}, {"_id": 0}))
    dash = lambda: c.get("/api/dashboard", headers=H).json()["comissoes_a_receber"]
    soma_ar = lambda: round(sum(a["saldo_pendente"] for a in c.get("/api/contas-receber", headers=H).json()
                                if a.get("comissao_id") and a["status"] == "aberto"), 2)
    soma_com = lambda: round(sum(x["saldo_pendente"] for x in c.portal.call(lambda: db.comissoes.find({"tenant_id": tid}).to_list(None))
                                 if x["status"] not in ("recebida", "aguardando_liquidez", "cancelada")), 2)

    com("A", 300, [100, 100, 100]); com("B", 90, [90]); com("L", 50, [50], "aguardando_liquidez", "aguardando_liquidez")
    assert dash() == soma_ar() == soma_com() == 390

    # 1) "Marcar como recebida" na tela de Comissões vira baixa nas parcelas
    assert c.patch("/api/comissoes/B", headers=H, json={"status": "recebida", "data_pagamento": "2026-11-08"}).status_code == 200
    assert get("contas_receber", "B-0")["status"] == "recebido" and get("comissoes", "B")["status"] == "recebida"
    assert dash() == soma_ar() == soma_com() == 300
    print("✔ marcar comissão como recebida dá baixa em Contas a Receber")

    # 2) baixa parcial em Contas a Receber atualiza a comissão
    c.post("/api/contas-receber/A-0/receber", headers=H, json={"valor": 40, "data": "2026-11-08"})
    ca = get("comissoes", "A"); assert ca["status"] == "parcialmente_recebida" and ca["saldo_pendente"] == 260
    assert dash() == soma_ar() == soma_com() == 260
    # 3) informar valor recebido na comissão distribui pelas parcelas
    c.patch("/api/comissoes/A", headers=H, json={"valor_recebido": 160})
    assert get("contas_receber", "A-0")["status"] == "recebido" and get("contas_receber", "A-1")["saldo_pendente"] == 40
    assert dash() == soma_ar() == soma_com() == 140
    print("✔ baixa parcial e valor recebido mantêm os dois lados iguais")

    # 4) editar valor da parcela / marcar recebido pela edição
    c.put("/api/contas-receber/A-2", headers=H, json={"valor": 120, "vencimento": "2026-12-03", "status": "aberto"})
    assert get("contas_receber", "A-2")["saldo_pendente"] == 120 and dash() == soma_ar() == soma_com() == 160
    c.put("/api/contas-receber/A-1", headers=H, json={"valor": 100, "vencimento": "2026-12-02", "status": "recebido"})
    assert get("contas_receber", "A-1")["status"] == "recebido" and dash() == soma_ar() == soma_com() == 120
    print("✔ edição da parcela em Contas a Receber reflete na comissão")

    # 5) não deixa parcela órfã nem comissão sem parcela
    assert c.delete("/api/contas-receber/A-2", headers=H).status_code == 400
    com("D", 70, [70]); assert c.delete("/api/comissoes/D", headers=H).status_code == 200
    assert get("contas_receber", "D-0") is None and dash() == soma_ar() == 120
    # aguardando liquidez não aceita baixa
    assert c.post("/api/contas-receber/L-0/receber", headers=H, json={"valor": 10}).status_code == 400
    print("✔ excluir comissão leva as parcelas; parcela de comissão não é excluída sozinha")

    # 6) dados antigos fora de sincronia → reparo corrige
    async def bagunca():
        await db.comissoes.insert_one({"id": "V", "tenant_id": tid, "pedido_id": "PV", "valor_liquido": 500, "valor_recebido": 0,
                                       "saldo_pendente": 500, "status": "recebida"})          # marcada à mão, sem baixa
        await db.contas_receber.insert_one({"id": "V-0", "tenant_id": tid, "comissao_id": "V", "valor": 500, "valor_recebido": 0,
                                            "saldo_pendente": 500, "vencimento": "2026-10-01", "status": "aberto"})
        await db.contas_receber.insert_one({"id": "O-0", "tenant_id": tid, "comissao_id": "SUMIU", "valor": 33, "valor_recebido": 0,
                                            "saldo_pendente": 33, "vencimento": "2026-10-01", "status": "aberto"})  # órfã
    c.portal.call(bagunca)
    assert dash() == 620   # o painel já usa a parcela (fonte única): 120 + 500, ignora a órfã
    prev = c.post("/api/manutencao/reparar", headers=H).json()
    assert prev["parcelas_orfas_canceladas"] == 1
    assert any(x["status_antes"] == "Recebida" and x["status_depois"] == "Aguardando pagamento" for x in prev["comissoes_sincronizadas"])
    assert get("comissoes", "V")["status"] == "recebida"   # simulação não altera nada
    rep = c.post("/api/manutencao/reparar?aplicar=true", headers=H).json()
    assert get("contas_receber", "O-0")["status"] == "cancelado"
    assert get("comissoes", "V")["status"] == "pendente"
    assert dash() == soma_ar() == soma_com() == 620
    print("✔ reparo: comissão marcada à mão volta a 'pendente', parcela órfã cancelada, totais iguais")
print("\nTESTES PASSARAM")
