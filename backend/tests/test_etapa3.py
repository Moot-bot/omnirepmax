"""Testes de aceite das correções (documento 'Correções e Melhorias').
Rodar: python test_etapa3.py  (na pasta do server.py)"""
import os, sys, importlib, uuid
from datetime import datetime, timezone, timedelta
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({"MONGO_URL": "m", "DB_NAME": "e3", "APP_ENV": "prod", "JWT_SECRET": "q" * 48,
                   "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123"})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
s = importlib.import_module("server")
s._send_email_sync = lambda *a: True
agora = lambda: datetime.now(timezone.utc).isoformat()

from fastapi.testclient import TestClient
with TestClient(s.app) as c:
    r = c.post("/api/auth/signup", json={"email": "rep@teste.com", "password": "senha1234", "name": "Rep"}).json()
    H = {"Authorization": f"Bearer {r['token']}"}; tid = r["user"]["tenant_id"]
    db = s.db

    # ------------------------------------------------------------------ cenário legado (código antigo)
    rep_liq = c.post("/api/representadas", headers=H, json={"razao_social": "Fábrica Liquidez", "comissao_padrao": 5,
                                                             "modalidade_comissao": "liquidez"}).json()
    rep_fat = c.post("/api/representadas", headers=H, json={"razao_social": "Fábrica Normal", "comissao_padrao": 10}).json()
    cli = c.post("/api/clientes", headers=H, json={"razao_social": "Loja"}).json()

    async def legado():
        await db.clientes.insert_one({"id": "cli-moji", "tenant_id": tid, "razao_social": "SupermercadÃ£o SÃ£o JoÃ£o",
                                      "cidade": "BelÃ©m", "status": "ativo", "created_at": agora()})
        for i in range(9):
            pid, cid = f"ped{i}", f"com{i}"
            await db.pedidos.insert_one({"id": pid, "tenant_id": tid, "numero": f"PED-0{i}", "cliente_id": cli["id"],
                                         "representada_id": rep_liq["id"] if i < 6 else rep_fat["id"], "total": "1000",
                                         "status": "aprovado" if i == 0 else "faturado", "itens": [], "parcelas": [],
                                         "data_pedido": agora(), "created_at": agora()})
            await db.faturamentos.insert_one({"id": f"fat{i}", "tenant_id": tid, "pedido_id": pid, "pedido_numero": f"PED-0{i}",
                                              "nf_numero": f"10{i}", "nf_serie": "1", "valor_faturado": 1000,
                                              "data_faturamento": agora(), "created_at": agora()})
            liq = i < 6
            await db.comissoes.insert_one({"id": cid, "tenant_id": tid, "pedido_id": pid, "pedido_numero": f"PED-0{i}",
                                           "nf_numero": f"10{i}", "nf_serie": "1",
                                           "valor_faturado": 1000, "percentual": 5 if liq else 10,
                                           "base_calculo": "recebido" if i == 5 else "faturado",
                                           "valor_liquido": 0 if i == 5 else (50 if liq else 100),
                                           "saldo_pendente": 0 if i == 5 else (50 if liq else 100), "valor_recebido": 0,
                                           "modalidade": "liquidez" if liq else "faturamento",
                                           "status": "aguardando_liquidez" if liq else "pendente", "created_at": agora()})
        # recebíveis com números em texto; os dos pedidos 0 e 1 já quitados
        for i in range(3):
            await db.recebiveis_industria.insert_one({"id": f"rec{i}", "tenant_id": tid, "representada_id": rep_liq["id"],
                                                      "cliente_id": cli["id"], "pedido_id": f"ped{i}", "valor": "1000",
                                                      "valor_recebido": "1000" if i < 2 else "250", "saldo_pendente": "1000",
                                                      "status": "aberto", "vencimento": "2026-01-10", "created_at": agora()})
    c.portal.call(legado)
    assert c.get("/api/contas-receber", headers=H).json() == []

    # ------------------------------------------------------------------ reparo: simulação não altera nada
    sim = c.post("/api/manutencao/reparar", headers=H).json()
    assert sim["aplicado"] is False
    assert len(sim["lancamentos_criados"]) == 9, sim["lancamentos_criados"]
    assert sorted(sim["comissoes_liberadas_por_liquidez"]) == ["PED-00", "PED-01"]
    assert sim["numeros_em_texto"]["recebiveis_industria"] == 3 and sim["numeros_em_texto"]["pedidos"] == 9
    assert sim["acentos_corrigidos"]["clientes"]["registros"] == 1
    assert "PED-00" in sim["pedidos_status_corrigido"] and sim["pedidos_nf_preenchida"] == 9
    assert c.get("/api/contas-receber", headers=H).json() == []
    print("✔ reparo em simulação: aponta 9 lançamentos faltando, 2 liberações, textos e acentos — sem alterar nada")

    # ------------------------------------------------------------------ reparo aplicado
    ap = c.post("/api/manutencao/reparar?aplicar=true", headers=H).json()
    assert ap["backup_id"]
    ar = c.get("/api/contas-receber", headers=H).json()
    assert len(ar) == 9, len(ar)
    assert all(a["valor"] <= 100 for a in ar), "Contas a Receber deve ter só comissão, nunca o valor do pedido"
    st = {a["pedido_id"]: a["status"] for a in ar}
    assert st["ped0"] == "aberto" and st["ped1"] == "aberto"          # liquidez quitada → liberada
    assert st["ped2"] == "aguardando_liquidez" and st["ped6"] == "aberto"
    assert next(a for a in ar if a["pedido_id"] == "ped5")["valor"] == 50.0   # base 'recebido' provisória
    coms = {x["pedido_id"]: x for x in c.get("/api/comissoes", headers=H).json()}
    assert coms["ped0"]["status"] == "liberada" and coms["ped0"]["status_label"] == "Liberada para pagamento"
    recs = {x["id"]: x for x in c.get("/api/recebiveis-industria", headers=H).json()}
    assert recs["rec0"]["status"] == "recebido" and recs["rec2"]["saldo_pendente"] == 750.0 and isinstance(recs["rec2"]["valor"], float)
    res = c.get("/api/recebiveis-industria/resumo", headers=H).json()
    assert res["total"] == 3000 and res["recebido"] == 2250 and res["a_receber"] == 750 and res["vencido"] == 750
    cl = next(x for x in c.get("/api/clientes", headers=H).json() if x["id"] == "cli-moji")
    assert cl["razao_social"] == "Supermercadão São João" and cl["cidade"] == "Belém"
    peds = {p["id"]: p for p in c.get("/api/pedidos", headers=H).json()}
    assert peds["ped0"]["status"] == "faturado" and peds["ped3"]["nf_numero"] == "103" and peds["ped3"]["data_faturamento"]
    print("✔ reparo aplicado: 9 lançamentos (só comissão), liberações, recebíveis e resumo corretos, acentos corrigidos")

    # idempotente: rodar de novo não duplica
    de_novo = c.post("/api/manutencao/reparar?aplicar=true", headers=H).json()
    assert de_novo["lancamentos_criados"] == [] and len(c.get("/api/contas-receber", headers=H).json()) == 9
    print("✔ reparo idempotente (segunda execução não duplica nada)")

    # restaurar backup
    rb = c.post(f"/api/manutencao/restaurar/{ap['backup_id']}", headers=H).json()
    assert rb["ok"] and c.get("/api/contas-receber", headers=H).json() == []
    c.post("/api/manutencao/reparar?aplicar=true", headers=H)
    assert len(c.get("/api/contas-receber", headers=H).json()) == 9
    print("✔ backup do reparo restaura o estado anterior")

    # ------------------------------------------------------------------ fluxo novo: pedido com campos novos
    ped = c.post("/api/pedidos", headers=H, json={
        "cliente_id": cli["id"], "representada_id": rep_liq["id"], "status": "aprovado",
        "numero_referencia": "OC-7781", "observacoes": "Frete por conta da fábrica",
        "data_pedido": "2026-10-20", "data_emissao": "2026-10-21",
        "itens": [{"produto_id": "p", "nome": "Item", "quantidade": 10, "preco_unitario": 100}],
        "parcelas": [{"vencimento": "2026-12-01", "valor": 500, "valor_base": 500}, {"vencimento": "2027-01-01", "valor": 500, "valor_base": 500}]}).json()
    assert ped["numero_referencia"] == "OC-7781" and ped["data_pedido"].startswith("2026-10-20") and ped["data_emissao"].startswith("2026-10-21")
    # edição sem mandar as datas mantém as datas
    upd = c.put(f"/api/pedidos/{ped['id']}", headers=H, json={
        "cliente_id": cli["id"], "representada_id": rep_liq["id"], "status": "aprovado", "observacoes": "Editado",
        "numero_referencia": "OC-7781-B",
        "itens": [{"produto_id": "p", "nome": "Item", "quantidade": 10, "preco_unitario": 100}]}).json()
    assert upd["data_pedido"].startswith("2026-10-20") and upd["data_emissao"].startswith("2026-10-21") and upd["observacoes"] == "Editado"
    print("✔ pedido: nº de referência, observações, data do pedido e de emissão (mantidas na edição)")

    # faturamento em modalidade liquidez → AR nasce 'aguardando liquidez'
    f = c.post(f"/api/pedidos/{ped['id']}/faturamento", headers=H, json={"nf_numero": "555", "nf_serie": "1",
                                                                           "data_faturamento": "2026-10-25", "valor_faturado": 1000}).json()
    assert f["valor_liquido"] == 50.0
    ars = [a for a in c.get("/api/contas-receber", headers=H).json() if a["pedido_id"] == ped["id"]]
    assert [a["valor"] for a in sorted(ars, key=lambda a: a["vencimento"])] == [25.0, 25.0]
    assert all(a["status"] == "aguardando_liquidez" for a in ars)
    lp = next(p for p in c.get("/api/pedidos", headers=H).json() if p["id"] == ped["id"])
    assert lp["nf_numero"] == "555" and lp["faturamentos"][0]["nf_serie"] == "1"
    print("✔ faturamento: comissão gera Contas a Receber na hora (liquidez = aguardando), NF aparece no pedido")

    # editar NF depois
    fid = lp["faturamentos"][0]["id"]
    assert c.patch(f"/api/faturamentos/{fid}", headers=H, json={"nf_numero": "103"}).status_code == 409  # NF de outro pedido... mesma série
    assert c.patch(f"/api/faturamentos/{fid}", headers=H, json={"nf_numero": "556"}).status_code == 200
    lp = next(p for p in c.get("/api/pedidos", headers=H).json() if p["id"] == ped["id"])
    com = next(x for x in c.get("/api/comissoes", headers=H).json() if x["pedido_id"] == ped["id"])
    assert lp["nf_numero"] == "556" and com["nf_numero"] == "556"
    print("✔ NF corrigida depois do faturamento (pedido, comissão e lançamentos atualizados; duplicada bloqueada)")

    # recebível da indústria quitado → libera comissão e ativa AR
    rec = c.post("/api/recebiveis-industria", headers=H, json={"representada_id": rep_liq["id"], "cliente_id": cli["id"],
                                                                "pedido_id": ped["id"], "valor": "1.000,00" if False else 1000,
                                                                "vencimento": "2026-11-30"}).json()
    rr = c.post(f"/api/recebiveis-industria/{rec['id']}/receber", headers=H, json={"valor": 400}).json()
    assert rr["status"] == "parcial" and rr["comissao_liberada"] is False
    rr = c.post(f"/api/recebiveis-industria/{rec['id']}/receber", headers=H, json={"valor": 600}).json()
    assert rr["status"] == "recebido" and rr["comissao_liberada"] is True
    ars = [a for a in c.get("/api/contas-receber", headers=H).json() if a["pedido_id"] == ped["id"]]
    assert all(a["status"] == "aberto" for a in ars) and len(ars) == 2
    det = c.get(f"/api/comissoes/{com['id']}", headers=H).json()
    assert det["status"] == "liberada" and det["historico_status"][-1]["origem"] == "recebivel_industria"
    print("✔ recebível da indústria quitado libera a comissão e ativa Contas a Receber (bug corrigido)")

    # ------------------------------------------------------------------ status manual de comissão
    disp = c.get("/api/comissoes/status-disponiveis").json()
    assert {d["id"] for d in disp} >= {"aguardando_liquidez", "liberada", "aguardando_pagamento", "parcialmente_recebida", "recebida", "em_atraso", "cancelada"}
    cid3 = coms["ped3"]["id"]  # aguardando liquidez (reparo não liberou)
    r = c.post(f"/api/comissoes/{cid3}/status", headers=H, json={"status": "liberada", "data": "2026-11-05", "observacao": "Fábrica confirmou por e-mail"}).json()
    assert r["comissao"]["status"] == "liberada" and r["comissao"]["lancamentos"][0]["status"] == "aberto"
    h = r["comissao"]["historico_status"][-1]
    assert h["para"] == "liberada" and h["observacao"] == "Fábrica confirmou por e-mail" and h["data"].startswith("2026-11-05")
    r = c.post(f"/api/comissoes/{cid3}/status", headers=H, json={"status": "recebida"}).json()
    assert r["comissao"]["valor_recebido"] == 0 and any("não registra dinheiro" in e for e in r["efeitos"])
    r = c.post(f"/api/comissoes/{cid3}/status", headers=H, json={"status": "em_atraso", "observacao": "Fábrica atrasou"}).json()
    assert len(r["comissao"]["historico_status"]) >= 3
    assert c.post(f"/api/comissoes/{cid3}/status", headers=H, json={"status": "xyz"}).status_code == 400
    print("✔ status manual: muda, registra data e observação, mantém histórico e NÃO dá baixa")

    # baixa parcial e integral
    ar3 = next(a for a in c.get("/api/contas-receber", headers=H).json() if a["comissao_id"] == cid3)
    c.post(f"/api/contas-receber/{ar3['id']}/receber", headers=H, json={"valor": 20, "data": "2026-11-06"})
    d = c.get(f"/api/comissoes/{cid3}", headers=H).json()
    assert d["status"] == "parcialmente_recebida" and d["valor_recebido"] == 20 and d["saldo_pendente"] == 30
    c.post(f"/api/contas-receber/{ar3['id']}/receber", headers=H, json={"valor": 30})
    d = c.get(f"/api/comissoes/{cid3}", headers=H).json()
    assert d["status"] == "recebida" and d["saldo_pendente"] == 0 and d["lancamentos"][0]["status"] == "recebido"
    assert d["historico_status"][-1]["origem"] == "baixa"
    print("✔ baixa parcial e integral em Contas a Receber atualizam a comissão e o histórico")

    # cancelar e reabrir
    cid4 = coms["ped4"]["id"]
    r = c.post(f"/api/comissoes/{cid4}/status", headers=H, json={"status": "cancelada"}).json()
    assert all(l["status"] == "cancelado" for l in r["comissao"]["lancamentos"])
    assert c.post(f"/api/contas-receber/{r['comissao']['lancamentos'][0]['id']}/receber", headers=H, json={"valor": 1}).status_code == 400
    r = c.post(f"/api/comissoes/{cid4}/status", headers=H, json={"status": "aguardando_pagamento"}).json()
    assert r["comissao"]["status"] == "pendente" and all(l["status"] == "aberto" for l in r["comissao"]["lancamentos"])
    assert c.post(f"/api/comissoes/{cid3}/status", headers=H, json={"status": "cancelada"}).status_code == 400  # já recebida
    print("✔ cancelar comissão cancela os lançamentos; reabrir restaura; comissão recebida não cancela")

    # ------------------------------------------------------------------ importação de produtos
    def L(i, **kw): return {"linha": i, **kw}
    linhas = [
        L(2, nome="Produto A", codigo="COD001", ean="7891234567890", preco="49,90", unidade="un"),
        L(3, nome="Produto B", codigo=12345.0, ean=7891234567891, preco="R$ 1.234,56"),
        L(4, nome="Produto C", codigo="00123", ean="7.89123456789E+12", preco=19.9),
        L(5, nome="", codigo="X1", preco="10"),
        L(6, nome="Produto E", codigo="E1", preco="abc"),
        L(7, nome="", codigo="", ean="", preco=""),           # linha em branco
        L(8, nome="Produto A repetido", codigo="cod001", preco="1234.56"),
        L(9, nome="Produto sem código", preco="1.234"),
    ]
    sim = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_fat["id"], "produtos": linhas}).json()
    rs = sim["resumo"]
    assert rs["validos"] == 4 and rs["com_erro"] == 2 and rs["duplicados_no_arquivo"] == 1 and rs["a_criar"] == 4, rs
    motivos = {e["linha"]: e["motivo"] for e in sim["erros"]}
    assert "Nome obrigatório" in motivos[5] and "Preço inválido" in motivos[6]
    assert c.get(f"/api/produtos?representada_id={rep_fat['id']}", headers=H).json() == []
    ok = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_fat["id"], "simular": False, "produtos": linhas}).json()
    assert ok["criados"] == 4
    prods = {p["nome"]: p for p in c.get(f"/api/produtos?representada_id={rep_fat['id']}", headers=H).json()}
    assert prods["Produto A repetido"]["preco_tabela"] == 1234.56 and prods["Produto A repetido"]["codigo"] == "cod001"
    assert prods["Produto B"]["codigo"] == "12345" and prods["Produto B"]["ean"] == "7891234567891" and prods["Produto B"]["preco_tabela"] == 1234.56
    assert prods["Produto C"]["codigo"] == "00123" and prods["Produto C"]["ean"] == "7891234567890" and prods["Produto C"]["preco_tabela"] == 19.9
    assert prods["Produto sem código"]["preco_tabela"] == 1234.0
    print("✔ importação: preços BR, códigos/EAN como texto (sem notação científica, zeros à esquerda), erros por linha")

    # reimportar: ignorar não duplica; atualizar atualiza
    again = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_fat["id"], "simular": False, "modo": "ignorar",
                                                                "produtos": linhas[:3]}).json()
    assert again["criados"] == 0 and again["ignorados"] == 3
    upd = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_fat["id"], "simular": False, "modo": "atualizar",
                                                              "produtos": [L(2, nome="Produto B v2", codigo="12345", preco="59,90")]}).json()
    assert upd["atualizados"] == 1 and upd["criados"] == 0
    assert len(c.get(f"/api/produtos?representada_id={rep_fat['id']}", headers=H).json()) == 4
    # outra representada: mesmo código é outro produto
    outra = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_liq["id"], "simular": False,
                                                                "produtos": linhas[:1]}).json()
    assert outra["criados"] == 1
    # desfazer
    dz = c.post(f"/api/produtos/importar/{upd['import_id']}/desfazer", headers=H).json()
    assert dz["restaurados"] == 1
    assert any(p["nome"] == "Produto B" for p in c.get(f"/api/produtos?representada_id={rep_fat['id']}", headers=H).json())
    print("✔ reimportação sem duplicar (ignorar/atualizar), duplicidade por representada, desfazer importação")

    # 6.000 linhas em lotes
    grande = [L(i + 2, nome=f"Item {i}", codigo=f"G{i:05d}", ean=str(7890000000000 + i), preco=f"{i},99") for i in range(6000)]
    import_id = str(uuid.uuid4())
    sim = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_liq["id"], "produtos": grande}).json()
    assert sim["resumo"]["a_criar"] == 6000
    total = 0
    for i in range(0, 6000, 1000):
        rr = c.post("/api/produtos/importar", headers=H, json={"representada_id": rep_liq["id"], "simular": False,
                                                                 "import_id": import_id, "produtos": grande[i:i + 1000]}).json()
        total += rr["criados"]
    assert total == 6000
    n = len(c.get(f"/api/produtos?representada_id={rep_liq['id']}", headers=H).json())
    assert n >= 1000  # a listagem é limitada; conferimos no banco
    async def conta(): return await db.produtos.count_documents({"tenant_id": tid, "representada_id": rep_liq["id"]})
    assert c.portal.call(conta) == 6001
    dz = c.post(f"/api/produtos/importar/{import_id}/desfazer", headers=H).json()
    assert dz["removidos"] == 6000 and c.portal.call(conta) == 1
    print("✔ 6.000 linhas importadas em 6 lotes de 1.000 e desfeitas por completo")

    # ------------------------------------------------------------------ persistência após novo login
    t2 = c.post("/api/auth/login", json={"email": "rep@teste.com", "password": "senha1234"}).json()["token"]
    H2 = {"Authorization": f"Bearer {t2}"}
    assert next(p for p in c.get("/api/pedidos", headers=H2).json() if p["id"] == ped["id"])["numero_referencia"] == "OC-7781-B"
    assert c.get(f"/api/comissoes/{cid3}", headers=H2).json()["status"] == "recebida"
    print("✔ dados permanecem após sair e entrar de novo")

    # leads CSV com BOM
print("\nTODOS OS TESTES DE ACEITE PASSARAM")
