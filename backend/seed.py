"""Seed demo data for OmniRep CRM+ERP."""
import uuid
from datetime import datetime, timezone, timedelta
import random

def _id():
    return str(uuid.uuid4())

def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()

async def seed_demo(db):
    if await db.representadas.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    reps = [
        {"id": _id(), "razao_social": "Indústria Bella Roupa Ltda", "nome_fantasia": "Bella Moda", "cnpj": "12.345.678/0001-90", "inscricao_estadual": "123.456.789.000", "segmento": "Vestuário", "cidade": "São Paulo", "estado": "SP", "telefone": "(11) 3456-7890", "whatsapp": "(11) 98765-4321", "email": "comercial@bellamoda.com.br", "contato_nome": "Fernanda Silva", "contato_cargo": "Gerente Comercial", "comissao_padrao": 6.5, "prazo_pagamento": "28/56/84 dias", "observacoes": "Coleção verão em destaque."},
        {"id": _id(), "razao_social": "Alimentos Terra Boa S/A", "nome_fantasia": "Terra Boa", "cnpj": "23.456.789/0001-01", "inscricao_estadual": "234.567.890.111", "segmento": "Alimentos", "cidade": "Curitiba", "estado": "PR", "telefone": "(41) 3222-1010", "whatsapp": "(41) 99988-7766", "email": "vendas@terraboa.com.br", "contato_nome": "Rogério Alves", "contato_cargo": "Diretor Comercial", "comissao_padrao": 4.0, "prazo_pagamento": "30 dias"},
        {"id": _id(), "razao_social": "TecnoLar Utilidades Ltda", "nome_fantasia": "TecnoLar", "cnpj": "34.567.890/0001-12", "inscricao_estadual": "345.678.901.222", "segmento": "Utilidades Domésticas", "cidade": "Joinville", "estado": "SC", "telefone": "(47) 3033-4040", "whatsapp": "(47) 98800-1122", "email": "comercial@tecnolar.com.br", "contato_nome": "Patrícia Melo", "contato_cargo": "Coordenadora", "comissao_padrao": 5.0, "prazo_pagamento": "45 dias"},
        {"id": _id(), "razao_social": "Cosméticos Aura Beauty ME", "nome_fantasia": "Aura Beauty", "cnpj": "45.678.901/0001-23", "inscricao_estadual": "456.789.012.333", "segmento": "Cosméticos", "cidade": "Belo Horizonte", "estado": "MG", "telefone": "(31) 3555-6060", "whatsapp": "(31) 99911-2233", "email": "vendas@aurabeauty.com.br", "contato_nome": "Camila Rocha", "contato_cargo": "Gestora", "comissao_padrao": 8.0, "prazo_pagamento": "30/60 dias"},
    ]
    for r in reps:
        r["created_at"] = _iso(now); r["updated_at"] = _iso(now); r["logo"] = ""
    await db.representadas.insert_many(reps)

    cli_data = [
        ("Rede Preço Bom Supermercados Ltda", "Preço Bom", "11.222.333/0001-44", "prospect", "Varejo", "São Paulo", "SP", -23.5505, -46.6333),
        ("Distribuidora Norte Sul Ltda", "Norte Sul Distribuição", "22.333.444/0001-55", "ativo", "Distribuidor", "Campinas", "SP", -22.9064, -47.0616),
        ("Casa Nova Boutique EIRELI", "Casa Nova", "33.444.555/0001-66", "ativo", "Varejo", "Rio de Janeiro", "RJ", -22.9068, -43.1729),
        ("Rede Farmais Comércio Ltda", "Farmais", "44.555.666/0001-77", "ativo", "Rede de Lojas", "Curitiba", "PR", -25.4284, -49.2733),
        ("Empório Sabor & Cia Ltda", "Empório Sabor", "55.666.777/0001-88", "ativo", "Varejo", "Porto Alegre", "RS", -30.0346, -51.2177),
        ("Beleza Pura Cosméticos", "Beleza Pura", "66.777.888/0001-99", "prospect", "Varejo", "Belo Horizonte", "MG", -19.9167, -43.9345),
        ("SuperVarejo Alfa Distribuidora", "SuperAlfa", "77.888.999/0001-00", "inativo", "Distribuidor", "Salvador", "BA", -12.9714, -38.5014),
        ("Lojas Marisol Confecções", "Marisol", "88.999.000/0001-11", "ativo", "Rede de Lojas", "Fortaleza", "CE", -3.7172, -38.5433),
    ]
    clientes = []
    for rs, nf, cnpj, st, seg, cid, est, lat, lng in cli_data:
        clientes.append({
            "id": _id(), "razao_social": rs, "nome_fantasia": nf, "cnpj_cpf": cnpj,
            "segmento": seg, "cidade": cid, "estado": est, "status": st,
            "email": f"contato@{nf.lower().replace(' ', '')}.com.br", "telefone": "(11) 3000-0000",
            "responsavel": random.choice(["Ana Souza", "Carlos Lima", "Julia Nunes", "Rafael Costa"]),
            "cargo": "Comprador", "potencial": random.choice(["baixo", "medio", "alto"]),
            "representadas": random.sample([r["id"] for r in reps], k=random.randint(1, 3)),
            "lat": lat, "lng": lng, "created_at": _iso(now - timedelta(days=random.randint(1, 120))), "updated_at": _iso(now),
        })
    await db.clientes.insert_many(clientes)

    # Produtos
    prod_data = [
        ("Camisa Polo Bella Verão", "Vestuário", "Bella Moda", reps[0]["id"], 89.90, 129.90),
        ("Vestido Midi Estampado", "Vestuário", "Bella Moda", reps[0]["id"], 149.90, 219.90),
        ("Blusa Cropped Tricot", "Vestuário", "Bella Moda", reps[0]["id"], 69.90, 99.90),
        ("Arroz Terra Boa 5kg", "Alimentos", "Terra Boa", reps[1]["id"], 24.90, 34.90),
        ("Feijão Carioca Terra Boa 1kg", "Alimentos", "Terra Boa", reps[1]["id"], 8.90, 12.90),
        ("Café Terra Boa Torrado 500g", "Alimentos", "Terra Boa", reps[1]["id"], 18.90, 27.90),
        ("Jogo de Panelas TecnoLar 5pçs", "Utilidades", "TecnoLar", reps[2]["id"], 199.90, 299.90),
        ("Liquidificador TecnoLar Pro", "Utilidades", "TecnoLar", reps[2]["id"], 249.90, 349.90),
        ("Batedeira Planetária TecnoLar", "Utilidades", "TecnoLar", reps[2]["id"], 449.90, 649.90),
        ("Sérum Facial Aura Beauty 30ml", "Cosméticos", "Aura Beauty", reps[3]["id"], 79.90, 119.90),
        ("Máscara Capilar Aura 300g", "Cosméticos", "Aura Beauty", reps[3]["id"], 49.90, 79.90),
        ("Kit Skincare Aura 4 Passos", "Cosméticos", "Aura Beauty", reps[3]["id"], 199.90, 299.90),
    ]
    produtos = []
    for i, (nome, cat, marca, rid, custo, preco) in enumerate(prod_data):
        produtos.append({
            "id": _id(), "nome": nome, "codigo": f"P{1000 + i}", "sku": f"SKU-{i+1:04d}",
            "ean": f"789{random.randint(1000000000, 9999999999)}", "categoria": cat, "marca": marca,
            "representada_id": rid, "custo": custo, "preco_tabela": preco, "preco_sugerido": preco * 1.1,
            "unidade": "UN", "qtd_por_caixa": 12, "status": "ativo",
            "created_at": _iso(now), "updated_at": _iso(now),
        })
    await db.produtos.insert_many(produtos)

    # Pedidos - alguns faturados nos últimos 6 meses
    pedidos = []
    contas_receber = []
    comissoes = []
    for i in range(14):
        c = random.choice([c for c in clientes if c["status"] == "ativo"])
        rid = random.choice(c["representadas"])
        rep = next(r for r in reps if r["id"] == rid)
        prods = [p for p in produtos if p["representada_id"] == rid]
        if not prods:
            continue
        chosen = random.sample(prods, k=min(len(prods), random.randint(1, 3)))
        itens = []
        subtotal = 0.0
        for p in chosen:
            qtd = random.randint(10, 60)
            preco = p["preco_tabela"]
            desc = random.choice([0, 0, 5, 10])
            sub = qtd * preco * (1 - desc/100)
            itens.append({"produto_id": p["id"], "nome": p["nome"], "quantidade": qtd, "preco_unitario": preco, "desconto": desc, "subtotal": round(sub, 2)})
            subtotal += sub
        total = subtotal
        pid = _id()
        d = now - timedelta(days=random.randint(3, 150))
        status = random.choices(["faturado", "aprovado", "enviado", "rascunho"], weights=[6, 2, 1, 1])[0]
        ped = {
            "id": pid, "numero": f"PED-{i+1:05d}", "cliente_id": c["id"], "representada_id": rid,
            "condicao_pagamento": rep["prazo_pagamento"], "itens": itens, "subtotal": round(subtotal, 2),
            "desconto_geral": 0.0, "frete": 0.0, "total": round(total, 2),
            "comissao_percentual": rep["comissao_padrao"], "comissao_valor": round(total * rep["comissao_padrao"] / 100, 2),
            "status": status, "data_pedido": _iso(d), "created_at": _iso(d), "updated_at": _iso(d),
            "observacoes": ""
        }
        pedidos.append(ped)
        if status == "faturado":
            vencimento = d + timedelta(days=30)
            ar_status = "recebido" if d < now - timedelta(days=35) else "aberto"
            contas_receber.append({
                "id": _id(), "cliente_id": c["id"], "representada_id": rid, "pedido_id": pid,
                "numero_documento": ped["numero"], "valor": ped["total"], "vencimento": _iso(vencimento),
                "data_recebimento": _iso(vencimento) if ar_status == "recebido" else None,
                "status": ar_status, "forma_pagamento": "Boleto", "created_at": _iso(d), "updated_at": _iso(d),
            })
            com_status = "paga" if d < now - timedelta(days=45) else random.choice(["prevista", "faturada"])
            comissoes.append({
                "id": _id(), "pedido_id": pid, "pedido_numero": ped["numero"],
                "cliente_id": c["id"], "representada_id": rid,
                "valor_faturado": ped["total"], "percentual": rep["comissao_padrao"],
                "valor": ped["comissao_valor"], "status": com_status,
                "data_prevista": _iso(vencimento), "data_pagamento": _iso(vencimento) if com_status == "paga" else None,
                "created_at": _iso(d), "updated_at": _iso(d),
            })
    await db.pedidos.insert_many(pedidos)
    if contas_receber:
        await db.contas_receber.insert_many(contas_receber)
    if comissoes:
        await db.comissoes.insert_many(comissoes)

    # Contas a Pagar
    ap = []
    cats = ["Combustível", "Viagem", "Hotel", "Alimentação", "Telefone", "Escritório", "Marketing"]
    for i in range(10):
        d = now - timedelta(days=random.randint(1, 60))
        ap.append({
            "id": _id(), "descricao": f"{random.choice(cats)} - {d.strftime('%b/%Y')}",
            "categoria": random.choice(cats), "fornecedor": random.choice(["Posto Shell", "Hotel Ibis", "Vivo", "Ifood"]),
            "valor": round(random.uniform(80, 1500), 2), "vencimento": _iso(d + timedelta(days=random.randint(-10, 20))),
            "status": random.choice(["aberto", "pago", "pago"]), "forma_pagamento": "Débito",
            "created_at": _iso(d), "updated_at": _iso(d),
        })
    await db.contas_pagar.insert_many(ap)

    # Oportunidades
    ops = []
    estagios = ["prospeccao", "contato", "apresentacao", "proposta", "negociacao", "ganho", "perdido"]
    for i in range(9):
        c = random.choice(clientes)
        rid = c["representadas"][0] if c["representadas"] else reps[0]["id"]
        ops.append({
            "id": _id(), "titulo": f"Oportunidade {c['nome_fantasia']}",
            "cliente_id": c["id"], "representada_id": rid,
            "valor_estimado": round(random.uniform(3000, 45000), 2),
            "probabilidade": random.choice([25, 50, 75, 90]),
            "estagio": random.choice(estagios),
            "proxima_acao": random.choice(["Ligar amanhã", "Enviar catálogo", "Agendar visita", "Follow-up e-mail"]),
            "data_prevista": _iso(now + timedelta(days=random.randint(3, 45))),
            "created_at": _iso(now - timedelta(days=random.randint(1, 30))), "updated_at": _iso(now),
        })
    await db.oportunidades.insert_many(ops)

    # Visitas
    vis = []
    for i in range(8):
        c = random.choice(clientes)
        d = now + timedelta(days=random.randint(-15, 15))
        vis.append({
            "id": _id(), "cliente_id": c["id"], "representada_id": c["representadas"][0] if c["representadas"] else reps[0]["id"],
            "tipo": random.choice(["visita", "reuniao_online", "ligacao", "whatsapp"]),
            "data": _iso(d), "horario": f"{random.randint(9, 17):02d}:00",
            "objetivo": random.choice(["Apresentar coleção", "Fechamento de pedido", "Cobrança amigável", "Prospecção"]),
            "status": "realizada" if d < now else "agendada",
            "created_at": _iso(now), "updated_at": _iso(now),
        })
    await db.visitas.insert_many(vis)
