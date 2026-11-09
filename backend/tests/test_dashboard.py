"""Testes de aceite do Dashboard (comparativos, Visão Geral Comercial e metas).
Rodar: python test_dashboard.py  (na pasta do server.py)"""
import os, sys, importlib, time
from datetime import date
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({"MONGO_URL": "m", "DB_NAME": "dash", "APP_ENV": "prod", "JWT_SECRET": "d" * 48,
                   "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123"})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
s = importlib.import_module("server")
s._send_email_sync = lambda *a: True
HOJE = [date(2026, 11, 8)]
s.hoje_br = lambda: HOJE[0]
N = [0]
def nid(): N[0] += 1; return f"x{N[0]}"

from fastapi.testclient import TestClient
with TestClient(s.app) as c:
    def conta(email):
        r = c.post("/api/auth/signup", json={"aceite_termos": True, "email": email, "password": "senha1234", "name": "U"}).json()
        return {"Authorization": f"Bearer {r['token']}"}, r["user"]["tenant_id"]
    H, tid = conta("a@teste.com")
    HB, tidB = conta("b@teste.com")
    db = s.db
    G = lambda q="": c.get(f"/api/dashboard/comercial{q}", headers=H).json()

    async def seed():
        await db.representadas.insert_many([{"id": "R1", "tenant_id": tid, "nome_fantasia": "Fábrica 1"},
                                            {"id": "R2", "tenant_id": tid, "nome_fantasia": "Fábrica 2"}])
        await db.clientes.insert_many([{"id": "C1", "tenant_id": tid, "razao_social": "Loja 1", "grupo_economico": "Rede Sul"},
                                       {"id": "C2", "tenant_id": tid, "razao_social": "Loja 2", "grupo_economico": "rede sul "},
                                       {"id": "C3", "tenant_id": tid, "razao_social": "Loja 3", "grupo_economico": "Rede Norte"}])
        P = lambda data, total, rep="R1", cli="C1", st="aprovado": {"id": nid(), "tenant_id": tid, "data_pedido": data, "total": total,
                                                                     "representada_id": rep, "cliente_id": cli, "status": st, "itens": []}
        peds = [
            P("2026-11-08T13:00:00+00:00", 1000),            # hoje (10h em Brasília)
            P("2026-11-01", 2000, "R2", "C3"),                 # data pura: NÃO pode cair em 31/10
            P("2026-11-09T01:30:00+00:00", 999),              # 08/11 22h30 em Brasília → hoje
            P("2026-10-15", 4000),                             # mês anterior
            P("2026-01-10", 500),                              # ano vigente
            P("2025-06-01", 7000),                             # ano anterior
            P("2024-06-01", 99999),                            # fora da janela
            P("2026-11-05", 777, st="rascunho"), P("2026-11-05", 888, st="cancelado"), P("2026-11-05", 666, st="orcamento"),
        ]
        await db.pedidos.insert_many(peds)
        out = peds[3]["id"]; canc = peds[8]["id"]
        await db.faturamentos.insert_many([
            {"id": nid(), "tenant_id": tid, "pedido_id": out, "representada_id": "R1", "valor_faturado": 4000, "data_faturamento": "2026-11-03"},  # pedido de out, NF em nov
            {"id": nid(), "tenant_id": tid, "pedido_id": out, "representada_id": "R1", "valor_faturado": 300, "data_faturamento": "2025-12-20"},
            {"id": nid(), "tenant_id": tid, "pedido_id": canc, "representada_id": "R1", "valor_faturado": 888, "data_faturamento": "2026-11-05"},
        ])
        await db.comissoes.insert_many([
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor_liquido": 200, "data_faturamento": "2026-11-03", "status": "pendente"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor_liquido": 1060.45, "data_faturamento": "2026-09-10", "status": "pendente"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor_liquido": 50, "data_faturamento": "2026-10-20", "status": "liberada"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor_liquido": 999, "data_faturamento": "2026-11-04", "status": "cancelada"},
        ])
        await db.contas_receber.insert_many([
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor": 100, "valor_recebido": 0, "saldo_pendente": 100, "vencimento": "2026-11-02", "status": "aberto"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor": 80, "valor_recebido": 30, "saldo_pendente": 50, "vencimento": "2026-10-10", "status": "aberto"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R2", "cliente_id": "C3", "valor": 40, "valor_recebido": 0, "saldo_pendente": 40, "vencimento": "2025-03-01", "status": "aberto"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor": 70, "valor_recebido": 70, "saldo_pendente": 0, "vencimento": "2026-09-01", "status": "recebido"},  # pago após vencer
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor": 60, "saldo_pendente": 60, "vencimento": "2026-08-01", "status": "aguardando_liquidez"},
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor": 25, "saldo_pendente": 25, "vencimento": "2026-11-08", "status": "aberto"},   # vence hoje: ainda não atrasou
            {"id": nid(), "tenant_id": tid, "representada_id": "R1", "cliente_id": "C1", "valor": 15, "saldo_pendente": 15, "vencimento": "2026-12-01", "status": "aberto"},
        ])
        await db.contas_pagar.insert_one({"id": nid(), "tenant_id": tid, "descricao": "Aluguel", "valor": 5000, "vencimento": "2026-10-01", "status": "aberto"})
    c.portal.call(seed)

    d = G()
    k = d["cards"]
    assert d["periodo"]["rotulo"] == "NOVEMBRO DE 2026" and d["periodo"]["mes_corrente"]
    v = k["volume_vendas"]
    assert (v["mes"], v["mes_anterior"], v["ano_vigente"], v["ano_anterior"]) == (3999, 4000, 8499, 7000), v
    assert v["variacao_pct"] == 0.0 and v["tendencia"] == "estavel"   # -0,025% arredonda para 0,0%
    f = k["faturamento"]
    assert (f["mes"], f["mes_anterior"], f["ano_vigente"], f["ano_anterior"]) == (4000, 0, 4000, 300), f
    assert f["variacao_pct"] is None
    cm = k["comissoes_previstas"]
    assert (cm["mes"], cm["mes_anterior"], cm["ano_vigente"], cm["ano_anterior"]) == (200, 50, 1310.45, 0), cm
    at = k["em_atraso"]
    assert at["valor"] == at["total"] == 190 and at["qtd"] == 3, at
    assert (at["mes"], at["mes_anterior"], at["ano_vigente"], at["ano_anterior"]) == (100, 50, 150, 40), at
    assert at["variacao_pct"] == 100.0 and at["tendencia"] == "piora"     # atraso subiu = piora
    assert cm["variacao_pct"] == 300.0 and cm["tendencia"] == "melhora"
    print("✔ 4 cards: mês, mês anterior, ano vigente e ano anterior com fontes e datas próprias")
    print("✔ Volume ≠ Faturamento: pedido de outubro faturado em novembro conta em cada card no seu mês")
    print("✔ Comissões previstas pela data de referência (os R$ 1.060,45 de setembro saem do mês); cancelada fora")
    print("✔ Em atraso: só comissões vencidas com saldo; pago após vencer, a vencer, liquidez e contas a pagar fora")
    print("✔ datas sem hora e horário de Brasília (22h30 de hoje conta hoje; 01/11 não cai em outubro)")

    # /dashboard antigo com as mesmas regras
    old = c.get("/api/dashboard", headers=H).json()
    assert old["volume_vendas_mes"] == 3999 and old["valor_faturado_mes"] == 4000 and old["valor_faturado_ano"] == 4000
    assert old["comissoes_previstas"] == 200 and old["em_atraso"] == 190 and "comparativos" in old
    assert [x["mes"] for x in old["serie_faturamento"]] == ["Jun/26", "Jul/26", "Ago/26", "Set/26", "Out/26", "Nov/26"]
    print("✔ cards atuais (/dashboard) corrigidos com as mesmas regras; gráfico com meses de calendário")

    # filtros
    k1 = G("?representada_id=R2")["cards"]
    assert k1["volume_vendas"]["mes"] == 2000 and k1["faturamento"]["mes"] == 0 and k1["em_atraso"]["total"] == 40
    k2 = G("?rede=Rede%20Sul")["cards"]
    assert k2["volume_vendas"]["mes"] == 1999 and k2["em_atraso"]["total"] == 150
    k3 = G("?rede=Rede%20Norte&representada_id=R1")["cards"]
    assert k3["volume_vendas"]["mes"] == 0 and k3["volume_vendas"]["ano_anterior"] == 0
    d = G(); assert d["filtros"]["redes"] == ["Rede Norte", "Rede Sul"] and len(d["filtros"]["representadas"]) == 2
    print("✔ filtros de representada e rede (combinados) aplicados aos 4 cards e à meta")

    # viradas
    HOJE[0] = date(2027, 1, 5)
    k = G()["cards"]
    assert G()["periodo"]["rotulo"] == "JANEIRO DE 2027"
    assert k["volume_vendas"]["mes_anterior"] == 0   # dezembro/2026 sem pedidos
    assert k["volume_vendas"]["ano_anterior"] == 3999 + 4000 + 500 and k["faturamento"]["ano_anterior"] == 4000
    k = G("?ano=2026&mes=12")["cards"]
    assert k["volume_vendas"]["mes_anterior"] == 3999 and k["volume_vendas"]["ano_vigente"] == 8499
    HOJE[0] = date(2026, 12, 2)
    assert G()["cards"]["volume_vendas"]["mes_anterior"] == 3999
    HOJE[0] = date(2026, 11, 8)
    print("✔ virada de mês (dez → nov) e de ano (jan/2027 → dez/2026 e ano anterior = 2026)")

    z = c.get("/api/dashboard/comercial", headers=HB).json()
    assert all(z["cards"][x]["mes"] == 0 and z["cards"][x]["ano_anterior"] == 0 for x in z["cards"])
    assert z["meta"]["status"] == "sem_meta"
    print("✔ período sem registros: R$ 0,00 em tudo; outra conta não enxerga os dados (isolamento por tenant)")

    # dias úteis
    du = s.dias_uteis_do_mes(2026, 11)
    assert len(du) == 19 and date(2026, 11, 2) not in du and date(2026, 11, 20) not in du
    assert s.feriados_nacionais(2026)[date(2026, 4, 3)] == "Sexta-feira Santa"
    m = G()["meta"]
    assert m["dias_uteis_total"] == 19 and m["dias_uteis_passados"] == 4 and m["dias_uteis_restantes"] == 15
    print("✔ dias úteis: seg-sex menos feriados nacionais (Finados, Consciência Negra, Sexta-feira Santa...)")

    # metas
    assert m["valor"] is None and m["percentual"] is None and m["necessario_por_dia"] is None
    r = c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "valor": "R$ 100.000,00"})
    assert r.status_code == 200 and r.json()["valor"] == 100000
    m = G()["meta"]
    assert m["origem"] == "Meta geral" and m["vendido_mes"] == 3999 and m["vendido_hoje"] == 1999
    assert m["percentual"] == 4.0 and m["status"] == "atencao" and m["esperado_pct"] == round(4 / 19 * 100, 2)
    assert m["falta_total"] == 96001 and m["necessario_por_dia"] == round(96001 / 15, 2)
    print("✔ meta: vendido no mês, vendido hoje, % realizado, ATENÇÃO abaixo do ritmo, necessário por dia útil")

    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "valor": 3550})   # edita, não duplica
    async def nmetas(): return await db.metas.count_documents({"tenant_id": tid})
    assert c.portal.call(nmetas) == 1
    m = G()["meta"]
    assert m["percentual"] == 112.65 and m["status"] == "batida" and m["necessario_por_dia"] == 0 and m["falta_total"] == 0
    print("✔ meta batida: 112,65% (passa de 100%), necessário R$ 0,00; editar não duplica")

    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "valor": 4000})
    HOJE[0] = date(2026, 11, 30)
    m = G()["meta"]
    assert m["dias_uteis_restantes"] == 1 and m["ultimo_dia_util"] and m["necessario_por_dia"] == 1.0
    HOJE[0] = date(2026, 12, 1)
    m = G("?ano=2026&mes=11")["meta"]
    assert m["dias_uteis_restantes"] == 0 and m["necessario_por_dia"] is None and m["falta_total"] == 1.0 and m["pendencia_sem_dias"]
    HOJE[0] = date(2026, 11, 8)
    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "valor": 8000})
    async def mais_venda():
        await db.pedidos.insert_one({"id": nid(), "tenant_id": tid, "data_pedido": "2026-11-06", "total": 1000, "representada_id": "R1", "cliente_id": "C1", "status": "aprovado"})
    c.portal.call(mais_venda)
    m = G()["meta"]
    assert m["percentual"] == 62.49 and m["status"] == "andamento"
    print("✔ último dia útil, mês encerrado sem bater (pendência sem dividir por zero) e EM ANDAMENTO no ritmo")

    # precedência
    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "valor": 200000})
    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "representada_id": "R1", "valor": 100000})
    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "representada_id": "R2", "valor": 100000})
    m = G()["meta"]; assert m["valor"] == 200000 and m["origem"] == "Meta geral"
    m = G("?representada_id=R1")["meta"]; assert m["valor"] == 100000 and m["origem"] == "Meta da representada Fábrica 1"
    geral = next(x for x in c.get("/api/metas?ano=2026&mes=11", headers=H).json() if not x["representada_id"])
    assert c.delete(f"/api/metas/{geral['id']}", headers=H).status_code == 200
    m = G()["meta"]; assert m["valor"] == 200000 and m["origem"].startswith("Soma das metas por representada (2)")
    c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "representada_id": "R1", "rede": "Rede Sul", "valor": 30000})
    m = G("?representada_id=R1&rede=rede%20sul")["meta"]; assert m["valor"] == 30000 and "na rede" in m["origem"]
    m = G("?representada_id=R2&rede=Rede%20Sul")["meta"]; assert m["valor"] is None and m["status"] == "sem_meta"
    m = G("?rede=Rede%20Sul")["meta"]; assert m["valor"] == 30000 and m["origem"].startswith("Soma das metas por representada na rede")
    m = G()["meta"]; assert m["valor"] == 200000   # a meta por rede não é somada à das representadas
    print("✔ precedência das metas: geral não soma com específicas; origem sempre informada")

    # permissões e isolamento das metas
    async def vira_vendedor():
        await db.users.update_one({"email": "b@teste.com"}, {"$set": {"role": "vendedor"}})
    c.portal.call(vira_vendedor)
    assert c.put("/api/metas", headers=HB, json={"ano": 2026, "mes": 11, "valor": 1}).status_code == 403
    assert c.get("/api/dashboard/comercial", headers=HB).json()["pode_editar_metas"] is False
    assert c.get("/api/metas", headers=HB).json() == []
    assert c.delete(f"/api/metas/{geral['id']}", headers=HB).status_code in (403, 404)
    assert c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 13, "valor": 1}).status_code == 400
    assert c.put("/api/metas", headers=H, json={"ano": 2026, "mes": 11, "valor": "0"}).status_code == 400
    print("✔ sem perfil de gestão não altera metas; metas isoladas por conta; validações de mês e valor")

    # desempenho
    async def volume():
        docs = [{"id": nid(), "tenant_id": tid, "data_pedido": f"2026-{(i % 12) + 1:02d}-{(i % 27) + 1:02d}", "total": 10,
                 "representada_id": "R1", "cliente_id": "C1", "status": "aprovado"} for i in range(5000)]
        await db.pedidos.insert_many(docs)
    c.portal.call(volume)
    t0 = time.perf_counter(); G(); ms = (time.perf_counter() - t0) * 1000
    print(f"✔ desempenho: 1 requisição para tudo; {ms:.0f} ms com 5.000+ pedidos (banco em memória)")

print("\nTODOS OS TESTES DO DASHBOARD PASSARAM")

# ✅ filtro por cliente
with TestClient(s.app) as c2:
    r = c2.post("/api/auth/login", json={"email": "a@teste.com", "password": "senha1234"}).json()
    H2 = {"Authorization": f"Bearer {r['token']}"}
    d = c2.get("/api/dashboard/comercial?cliente_id=C3", headers=H2).json()
    assert d["cards"]["volume_vendas"]["mes"] == 2000, d["cards"]["volume_vendas"]
    assert d["meta"]["valor"] is None and "cliente" in d["meta"]["origem"]
    assert [x["nome"] for x in d["filtros"]["clientes"]] == ["Loja 1", "Loja 2", "Loja 3"]
    d = c2.get("/api/dashboard/comercial?rede=Rede%20Sul&cliente_id=C3", headers=H2).json()
    assert d["cards"]["volume_vendas"]["mes"] == 0
    print("✔ filtro por cliente: cards só do cliente; lista de clientes no filtro")
