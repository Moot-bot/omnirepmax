"""Importação de notas: XML NF-e em lote, planilha CSV/Excel (mapeamento automático e por IA), XML fora do padrão via IA.
Rodar: python test_importar_notas.py"""
import os, sys, importlib, json
import motor.motor_asyncio, mongomock_motor
motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
os.environ.update({"MONGO_URL": "m", "DB_NAME": "imp", "APP_ENV": "prod", "JWT_SECRET": "q" * 48,
                   "ADMIN_EMAIL": "dono@omnirepmax.com.br", "ADMIN_PASSWORD": "senha-forte-do-dono-123"})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
s = importlib.import_module("server"); s._send_email_sync = lambda *a: True
from fastapi.testclient import TestClient

def nfe(n, emit_cnpj="12345678000199", dest_cnpj="98765432000155", emit_nome="FABRICA NOVA STAR LTDA", fant="NEW STAR",
        dest_nome="LOJA DO JOAO LTDA", itens=((("NS-100", "7891234567895", "TENIS 38", 12, 89.9),)), dups=(("2026-12-05", 539.4), ("2027-01-04", 539.4)),
        prefixo=""):
    p = prefixo
    det = "".join(f'<{p}det nItem="{i+1}"><{p}prod><{p}cProd>{c}</{p}cProd><{p}cEAN>{e}</{p}cEAN><{p}xProd>{x}</{p}xProd><{p}qCom>{q}</{p}qCom>'
                  f'<{p}vUnCom>{v}</{p}vUnCom><{p}vProd>{q*v:.2f}</{p}vProd></{p}prod></{p}det>' for i, (c, e, x, q, v) in enumerate(itens))
    tot = sum(q * v for *_, q, v in itens)
    dup = "".join(f"<{p}dup><{p}nDup>{i+1:03d}</{p}nDup><{p}dVenc>{d}</{p}dVenc><{p}vDup>{v}</{p}vDup></{p}dup>" for i, (d, v) in enumerate(dups))
    ns = f' xmlns:{p[:-1]}="http://www.portalfiscal.inf.br/nfe"' if p else ' xmlns="http://www.portalfiscal.inf.br/nfe"'
    return (f'<?xml version="1.0" encoding="UTF-8"?><{p}nfeProc{ns}><{p}NFe><{p}infNFe Id="NFe4226111234567800019955001{n:09d}1000012345">'
            f'<{p}ide><{p}mod>55</{p}mod><{p}serie>1</{p}serie><{p}nNF>{n}</{p}nNF><{p}dhEmi>2026-11-05T10:15:00-03:00</{p}dhEmi><{p}tpNF>1</{p}tpNF></{p}ide>'
            f'<{p}emit><{p}CNPJ>{emit_cnpj}</{p}CNPJ><{p}xNome>{emit_nome}</{p}xNome><{p}xFant>{fant}</{p}xFant><{p}enderEmit><{p}xMun>Novo Hamburgo</{p}xMun><{p}UF>RS</{p}UF></{p}enderEmit><{p}IE>1</{p}IE></{p}emit>'
            f'<{p}dest><{p}CNPJ>{dest_cnpj}</{p}CNPJ><{p}xNome>{dest_nome}</{p}xNome><{p}enderDest><{p}xLgr>AV B</{p}xLgr><{p}nro>2</{p}nro><{p}xMun>Joinville</{p}xMun><{p}UF>SC</{p}UF></{p}enderDest><{p}email>c@l.com</{p}email></{p}dest>'
            f'{det}<{p}total><{p}ICMSTot><{p}vProd>{tot:.2f}</{p}vProd><{p}vDesc>0</{p}vDesc><{p}vNF>{tot:.2f}</{p}vNF></{p}ICMSTot></{p}total>'
            f'<{p}cobr>{dup}</{p}cobr></{p}infNFe></{p}NFe></{p}nfeProc>')

with TestClient(s.app) as c:
    r = c.post("/api/auth/signup", json={"aceite_termos": True, "email": "a@t.com", "password": "senha1234", "name": "U"}).json()
    H = {"Authorization": f"Bearer {r['token']}"}; db = s.db
    rep = c.post("/api/representadas", headers=H, json={"razao_social": "Fabrica Nova Star", "nome_fantasia": "New Star", "cnpj": "12.345.678/0001-99", "comissao_padrao": 6}).json()
    cli = c.post("/api/clientes", headers=H, json={"razao_social": "Loja do Joao Ltda", "cnpj_cpf": "98.765.432/0001-55"}).json()
    A = lambda body: c.post("/api/importar-notas/analisar", headers=H, json=body)
    C = lambda body: c.post("/api/importar-notas/confirmar", headers=H, json=body)

    # 1) lote de XMLs: pronta, com prefixo de namespace, pendente (cliente novo + fábrica nova), cancelamento, PDF, CT-e
    cancel = '<procEventoNFe><evento><infEvento><chNFe>4226...</chNFe><tpEvento>110111</tpEvento></infEvento></evento></procEventoNFe>'
    d = A({"xmls": [
        {"nome": "a.xml", "conteudo": nfe(101)},
        {"nome": "b.xml", "conteudo": nfe(102, prefixo="nfe:")},
        {"nome": "c.xml", "conteudo": nfe(103, emit_cnpj="11111111000111", emit_nome="CALCADOS SUL LTDA", fant="SUL",
                                         dest_cnpj="22222222000122", dest_nome="MERCADO NOVO ME")},
        {"nome": "d.xml", "conteudo": nfe(104, dest_cnpj="22222222000122", dest_nome="MERCADO NOVO ME")},
        {"nome": "a-copia.xml", "conteudo": nfe(101)},
        {"nome": "cancel.xml", "conteudo": cancel},
        {"nome": "danfe.pdf", "conteudo": "%PDF-1.4 ..."},
        {"nome": "frete.xml", "conteudo": "<cteProc><CTe><infCte/></CTe></cteProc>"},
    ]}).json()
    st = {n["arquivo"]: n["status"] for n in d["notas"]}
    assert st == {"a.xml": "pronta", "b.xml": "pronta", "c.xml": "pendente", "d.xml": "pendente", "a-copia.xml": "duplicada"}, st
    assert {e["arquivo"] for e in d["erros"]} == {"cancel.xml", "danfe.pdf", "frete.xml"}
    n101 = next(n for n in d["notas"] if n["arquivo"] == "a.xml")
    assert n101["representada_por"] == "cnpj" and n101["parcelas"][0]["valor"] == 539.4 and n101["emitente"]["fantasia"] == "NEW STAR"
    assert n101["destinatario"]["cidade"] == "Joinville" and n101["valor_produtos"] == 1078.8
    print("✔ lote de XMLs: prontas, namespace com prefixo, pendentes, duplicada no envio; cancelamento/PDF/CT-e recusados com motivo")

    # 2) confirmar: cria fábrica e cliente novos uma vez só, pedidos + comissão + contas a receber
    sel = [n for n in d["notas"] if n["status"] != "duplicada"]
    corpo = {"notas": [{"nota": n, "representada_id": n["representada_id"], "cliente_id": n["cliente_id"],
                        "criar_representada": not n["representada_id"], "comissao_nova_representada": 4,
                        "criar_cliente": not n["cliente_id"]} for n in sel]}
    r = C(corpo).json()
    assert r["importadas"] == 4 and r["representadas_criadas"] == 1 and r["clientes_criados"] == 1, r
    peds = c.get("/api/pedidos", headers=H).json()
    assert len(peds) == 4 and all(p["status"] == "faturado" for p in peds)
    p103 = next(p for p in peds if p["nf_numero"] == "103")
    assert p103["comissao_percentual"] == 4
    ar = c.get("/api/contas-receber", headers=H).json()
    assert len([a for a in ar if a.get("comissao_id")]) == 8   # 2 duplicatas × 4 notas
    assert c.get("/api/xml/historico", headers=H).json()[0].get("xml") is None
    print("✔ confirmar: representada e cliente novos criados 1 vez; pedidos faturados, comissão e parcelas em Contas a Receber")

    # 3) reimportar = duplicada (nada criado)
    d2 = A({"xmls": [{"nome": "a.xml", "conteudo": nfe(101)}]}).json()
    assert d2["notas"][0]["status"] == "duplicada" and d2["notas"][0]["duplicada_pedido"]
    r = C({"notas": [{"nota": d2["notas"][0], "representada_id": rep["id"], "cliente_id": cli["id"]}]}).json()
    assert r["importadas"] == 0 and r["resultados"][0]["duplicada"]
    print("✔ nota já importada aparece como duplicada e não cria outro pedido")

    # 4) planilha no padrão (uma linha por item, cabeçalho na 2ª linha, números e datas BR)
    linhas = [["Relatório de vendas - out/26"],
              ["Nº NF", "Emissão", "CNPJ Representada", "Cliente", "CNPJ Cliente", "Código", "Descrição", "Qtd", "Valor Unitário", "Vencimentos"],
              ["2001", "03/10/2026", "12.345.678/0001-99", "Loja do Joao", "98.765.432/0001-55", "NS-100", "Tênis 38", "10", "89,90", "02/11/2026; 02/12/2026"],
              ["2001", "03/10/2026", "12.345.678/0001-99", "Loja do Joao", "98.765.432/0001-55", "NS-200", "Sandália", "4", "1.045,50", ""],
              ["2002", "04/10/2026", "12.345.678/0001-99", "Loja Nova", "", "NS-100", "Tênis 38", "2", "89,90", "04/11/2026"],
              ["", "", "", "", "", "", "", "", "", ""]]
    d = A({"planilha": {"nome": "vendas.csv", "linhas": linhas}}).json()
    pl = d["planilha"]
    assert pl["linha_cabecalho"] == 1 and pl["origem_mapeamento"] == "automatico" and not pl["faltando"], pl
    assert len(d["notas"]) == 2
    n1 = next(n for n in d["notas"] if n["numero"] == "2001")
    assert n1["valor_total"] == round(10 * 89.9 + 4 * 1045.5, 2) and len(n1["itens"]) == 2 and len(n1["parcelas"]) == 2
    assert n1["data_emissao"].startswith("2026-10-03") and n1["status"] == "pronta"
    n2 = next(n for n in d["notas"] if n["numero"] == "2002")
    assert n2["status"] == "pendente" and n2["representada_id"] == rep["id"] and not n2["cliente_id"]
    r = C({"notas": [{"nota": n, "representada_id": n["representada_id"], "cliente_id": n["cliente_id"], "criar_cliente": not n["cliente_id"]}
                     for n in d["notas"]]}).json()
    assert r["importadas"] == 2, r
    print("✔ planilha padrão: cabeçalho achado sozinho, itens agrupados por NF, R$ e datas BR, vencimentos viram parcelas")

    # 5) planilha fora do padrão → IA mapeia as colunas (Groq simulada)
    chamadas = []
    async def ia_fake(system, user, max_tokens=2000):
        chamadas.append(user)
        if "Colunas da planilha" in user:
            return {"nf_numero": "Ref. do lançamento", "data_emissao": "Quando", "cliente_nome": "Quem comprou", "valor_total": "Quanto (R$)",
                    "emitente_nome": "Fabricante", "cliente_cnpj": "Coluna Que Nao Existe"}
        return {"numero": "777", "data_emissao": "2026-11-01", "valor_total": 500, "emitente": {"cnpj": "12345678000199", "nome": "Nova Star"},
                "destinatario": {"cnpj": "98765432000155", "nome": "Loja do Joao"}, "itens": [{"nome": "Kit", "quantidade": 1, "preco": 500, "total": 500}],
                "parcelas": [{"vencimento": "2026-12-01", "valor": 500}]}
    s._groq_json = ia_fake
    linhas = [["Ref. do lançamento", "Quando", "Quem comprou", "Quanto (R$)", "Fabricante"], ["3001", "2026-10-10", "Loja do Joao Ltda", "R$ 1.500,00", "New Star"]]
    d = A({"planilha": {"nome": "erp.xlsx", "linhas": linhas}}).json()
    assert d["planilha"]["origem_mapeamento"] == "ia" and not d["planilha"]["faltando"], d["planilha"]
    n = d["notas"][0]
    assert d["planilha"]["mapeamento"]["cliente_cnpj"] is None
    assert n["valor_total"] == 1500 and n["cliente_por"] == "nome" and n["representada_por"] == "nome" and n["status"] == "pronta"
    # usuário corrige o mapeamento na tela → não chama a IA
    antes = len(chamadas)
    d = A({"planilha": {"nome": "erp.xlsx", "linhas": linhas, "mapeamento": {**d["planilha"]["mapeamento"], "valor_total": 3}}}).json()
    assert d["planilha"]["origem_mapeamento"] == "usuario" and len(chamadas) == antes
    print("✔ planilha fora do padrão: IA mapeia colunas (nomes inventados descartados); ajuste manual não chama a IA")

    # 6) XML que não é NF-e → IA lê, marcado como origem 'ia'
    d = A({"xmls": [{"nome": "erp-proprio.xml", "conteudo": "<Venda><Doc>777</Doc><Total>500,00</Total></Venda>"}]}).json()
    assert d["notas"][0]["origem"] == "ia" and d["notas"][0]["numero"] == "777" and d["notas"][0]["status"] == "pronta", d
    d = A({"xmls": [{"nome": "x.xml", "conteudo": "<Venda/>"}], "ia_para_xml_desconhecido": False}).json()
    assert d["erros"] and "não reconhecido" in d["erros"][0]["motivo"]
    print("✔ XML fora do padrão NF-e: lido pela IA (marcado) ou recusado com motivo")

    # 7) IA indisponível: mensagem clara, mapeamento automático continua
    async def ia_off(*a, **k): raise RuntimeError("IA indisponível: GROQ_API_KEY não configurada no servidor.")
    s._groq_json = ia_off
    d = A({"planilha": {"nome": "erp.xlsx", "linhas": linhas}}).json()
    assert "GROQ_API_KEY" in d["planilha"]["erro_ia"] and d["planilha"]["faltando"] and d["notas"] == []
    print("✔ sem IA: aviso claro e escolha manual das colunas")

    # 8) números e datas
    assert s._num_br("1.234,56") == 1234.56 and s._num_br("1234.56") == 1234.56 and s._num_br("1.234") == 1234 and s._num_br("R$ 10,5") == 10.5
    assert s._data_br("05/11/26").startswith("2026-11-05") and s._data_br(46000).startswith("2025-12-09") and s._data_br("2026-02-30") is None
    print("✔ números (1.234,56 / 1234.56 / 1.234) e datas (dd/mm/aa, Excel) corretos")
print("\nTESTES PASSARAM")
