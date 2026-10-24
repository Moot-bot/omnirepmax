"""Seed de dados de demonstração para o OmniRepMax (Novo Modelo Financeiro)."""
import uuid
from datetime import datetime, timezone, timedelta
import random

def _id():
    return str(uuid.uuid4())

def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()

async def seed_demo(db):
    # Evita duplicar se já existirem representadas
    if await db.representadas.count_documents({}) > 0:
        return

    now = datetime.now(timezone.utc)

    # ==========================================
    # 1. REPRESENTADAS (FÁBRICAS)
    # ==========================================
    reps = [
        {"id": _id(), "razao_social": "Indústria Bella Roupa Ltda", "nome_fantasia": "Bella Moda", "cnpj": "12.345.678/0001-90", "segmento": "Vestuário", "cidade": "São Paulo", "estado": "SP", "comissao_padrao": 5.0, "modalidade_comissao": "faturamento", "base_calculo_comissao": "faturado", "prazo_pagamento": "30/60", "whatsapp": "(11) 99999-1111", "logo": ""},
        {"id": _id(), "razao_social": "Alimentos Terra Boa S/A", "nome_fantasia": "Terra Boa", "cnpj": "23.456.789/0001-01", "segmento": "Alimentos", "cidade": "Curitiba", "estado": "PR", "comissao_padrao": 8.0, "modalidade_comissao": "liquidez", "base_calculo_comissao": "faturado", "prazo_pagamento": "30/60/90", "whatsapp": "(41) 98888-2222", "logo": ""},
        {"id": _id(), "razao_social": "TecnoLar Utilidades Ltda", "nome_fantasia": "TecnoLar", "cnpj": "34.567.890/0001-12", "segmento": "Utilidades Domésticas", "cidade": "Joinville", "estado": "SC", "comissao_padrao": 10.0, "modalidade_comissao": "faturamento", "base_calculo_comissao": "pedido", "prazo_pagamento": "30 dias", "whatsapp": "(47) 97777-3333", "logo": ""},
    ]
    for r in reps:
        r["created_at"] = _iso(now)
        r["updated_at"] = _iso(now)
    await db.representadas.insert_many(reps)

    # ==========================================
    # 2. CLIENTES (CRM)
    # ==========================================
    cli_data = [
        ("Rede Preço Bom Supermercados Ltda", "Preço Bom", "11.222.333/0001-44", "prospect", "Varejo", "São Paulo", "SP"),
        ("Distribuidora Norte Sul Ltda", "Norte Sul Distribuição", "22.333.444/0001-55", "ativo", "Distribuidor", "Campinas", "SP"),
        ("Casa Nova Boutique EIRELI", "Casa Nova", "33.444.555/0001-66", "ativo", "Varejo", "Rio de Janeiro", "RJ"),
        ("Rede Farmais Comércio Ltda", "Farmais", "44.555.666/0001-77", "ativo", "Rede de Lojas", "Curitiba", "PR"),
        ("Empório Sabor & Cia Ltda", "Empório Sabor", "55.666.777/0001-88", "ativo", "Varejo", "Porto Alegre", "RS"),
    ]
    clientes = []
    for rs, nf, cnpj, st, seg, cid, est in cli_data:
        clientes.append({
            "id": _id(), "razao_social": rs, "nome_fantasia": nf, "cnpj_cpf": cnpj,
            "segmento": seg, "cidade": cid, "estado": est, "status": st,
            "email": f"contato@{nf.lower().replace(' ', '')}.com.br", "telefone": "(11) 3000-0000",
            "representadas": [r["id"] for r in reps],
            "created_at": _iso(now - timedelta(days=random.randint(10, 200))), "updated_at": _iso(now),
        })
    await db.clientes.insert_many(clientes)

    # ==========================================
    # 3. PRODUTOS
    # ==========================================
    prod_data = [
        ("Camisa Polo Bella", "BELLA-01", "7891000000011", "Bella", reps[0]["id"], 89.90),
        ("Vestido Midi", "BELLA-02", "7891000000028", "Bella", reps[0]["id"], 149.90),
        ("Arroz 5kg", "TERRA-01", "7892000000012", "Terra", reps[1]["id"], 24.90),
        ("Feijão 1kg", "TERRA-02", "7892000000029", "Terra", reps[1]["id"], 8.90),
        ("Jogo de Panelas", "TEC-01", "7893000000013", "TecnoLar", reps[2]["id"], 199.90),
        ("Liquidificador Pro", "TEC-02", "7893000000020", "TecnoLar", reps[2]["id"], 249.90),
    ]
    produtos = []
    for nome, cod, ean, marca, rid, preco in prod_data:
        produtos.append({
            "id": _id(), "nome": nome, "codigo": cod, "ean": ean, "sku": cod, "marca": marca, "categoria": "Geral",
            "representada_id": rid, "preco_tabela": preco, "status": "ativo",
            "created_at": _iso(now), "updated_at": _iso(now),
        })
    await db.produtos.insert_many(produtos)

    # ==========================================
    # 4. PEDIDOS, FATURAMENTOS, COMISSÕES E CONTAS A RECEBER
    # ==========================================
    pedidos = []
    faturamentos = []
    comissoes = []
    contas_receber = []
    contas_pagar = []
    oportunidades = []
    visitas = []

    # Gera pedidos para os últimos 6 meses para preencher o gráfico
    for i in range(1, 25):
        c = random.choice(clientes)
        r = random.choice(reps)
        r_prods = [p for p in produtos if p["representada_id"] == r["id"]]
        
        itens = []
        subtotal = 0.0
        for p in random.sample(r_prods, k=random.randint(1, 2)):
            qtd = random.randint(10, 50)
            sub = qtd * p["preco_tabela"]
            itens.append({"produto_id": p["id"], "nome": p["nome"], "quantidade": qtd, "preco_unitario": p["preco_tabela"], "desconto": 0, "subtotal": round(sub, 2)})
            subtotal += sub

        total = round(subtotal, 2)
        pid = _id()
        # Espalha os pedidos ao longo dos últimos 180 dias
        data_ped = now - timedelta(days=random.randint(1, 180))
        
        # Define status (maioria faturado, alguns parciais, alguns abertos)
        status = random.choices(["rascunho", "enviado", "aprovado", "faturado_parcial", "faturado"], weights=[1, 1, 2, 3, 5])[0]
        
        pedido = {
            "id": pid, "numero": f"PED-{i:05d}", "cliente_id": c["id"], "representada_id": r["id"],
            "condicao_pagamento": r["prazo_pagamento"], "itens": itens, "subtotal": total,
            "desconto_geral": 0.0, "frete": 0.0, "total": total,
            "comissao_percentual": r["comissao_padrao"], 
            "comissao_valor": round(total * r["comissao_padrao"] / 100, 2),
            "status": status, "data_pedido": _iso(data_ped), "created_at": _iso(data_ped), "updated_at": _iso(data_ped),
            "nf_numero": f"{random.randint(1000, 9999)}" if "faturado" in status else "",
            "parcelas": []
        }
        pedidos.append(pedido)

        # Se foi faturado (parcial ou total)
        if "faturado" in status:
            # Define o valor faturado
            valor_faturado = total if status == "faturado" else round(total * 0.5, 2) # 50% se for parcial
            
            # 1. Registra o Faturamento (Nova tabela)
            faturamentos.append({
                "id": _id(), "pedido_id": pid, "nf_numero": pedido["nf_numero"], "nf_serie": "1",
                "data_faturamento": _iso(data_ped + timedelta(days=2)), "valor_faturado": valor_faturado,
                "created_at": _iso(now), "updated_at": _iso(now)
            })

            # 2. Calcula a comissão com base na regra da representada
            base_calculo = valor_faturado if r["base_calculo_comissao"] == "faturado" else total
            valor_comissao = round(base_calculo * r["comissao_padrao"] / 100, 2)
            
            # Cria as parcelas da comissão
            val_p1 = round(valor_comissao / 2, 2)
            val_p2 = round(valor_comissao - val_p1, 2)
            venc_p1 = data_ped + timedelta(days=30)
            venc_p2 = data_ped + timedelta(days=60)
            
            pedido["parcelas"] = [
                {"vencimento": _iso(venc_p1), "valor": val_p1},
                {"vencimento": _iso(venc_p2), "valor": val_p2}
            ]

            # Define status da comissão
            is_liquidez = r["modalidade_comissao"] == "liquidez"
            c_status = "aguardando_liquidez" if is_liquidez else "pendente"
            c_recebido = 0.0
            c_saldo = valor_comissao
            
            # Simula algumas comissões já recebidas ou vencidas
            if not is_liquidez and i % 4 == 0:
                c_status = "parcialmente_recebida"
                c_recebido = val_p1
                c_saldo = val_p2
            elif not is_liquidez and i % 5 == 0:
                c_status = "recebida"
                c_recebido = valor_comissao
                c_saldo = 0.0

            cid = _id()
            comissao = {
                "id": cid, "pedido_id": pid, "pedido_numero": pedido["numero"],
                "cliente_id": c["id"], "representada_id": r["id"],
                "nf_numero": pedido["nf_numero"], "valor_total_pedido": total, "valor_faturado": valor_faturado,
                "percentual": r["comissao_padrao"], "valor_liquido": valor_comissao,
                "valor_recebido": c_recebido, "saldo_pendente": c_saldo,
                "modalidade": r["modalidade_comissao"], "status": c_status,
                "historico_recebimentos": [],
                "data_prevista": _iso(venc_p1),
                "created_at": _iso(data_ped), "updated_at": _iso(now)
            }
            
            if c_recebido > 0:
                comissao["historico_recebimentos"].append({"data": _iso(venc_p1), "valor": c_recebido, "saldo_restante": c_saldo})
            
            comissoes.append(comissao)

            # Se NÃO for liquidez, cria as parcelas no Contas a Receber
            if not is_liquidez:
                for idx, parc in enumerate(pedido["parcelas"]):
                    p_status = "aberto"
                    p_recebido = 0.0
                    
                    if c_status in ["parcialmente_recebida", "recebida"] and idx == 0:
                        p_status = "recebido"
                        p_recebido = parc["valor"]
                    # Cria uma parcela VENCIDA para testar os avisos do dashboard
                    elif i % 3 == 0 and idx == 0:
                        p_status = "vencido" 
                        venc_p1 = now - timedelta(days=10) # Data no passado
                        parc["vencimento"] = _iso(venc_p1)

                    contas_receber.append({
                        "id": _id(), "comissao_id": cid, "cliente_id": c["id"], "representada_id": r["id"],
                        "pedido_id": pid, "numero_documento": f"{pedido['numero']} (NF {pedido['nf_numero']} - {idx+1}/2)",
                        "valor": parc["valor"], "valor_recebido": p_recebido, "saldo_pendente": parc["valor"] - p_recebido,
                        "vencimento": parc["vencimento"], "status": p_status,
                        "historico_recebimentos": [], "created_at": _iso(data_ped), "updated_at": _iso(now)
                    })

    await db.pedidos.insert_many(pedidos)
    await db.faturamentos.insert_many(faturamentos)
    if comissoes: await db.comissoes.insert_many(comissoes)
    if contas_receber: await db.contas_receber.insert_many(contas_receber)

    # ==========================================
    # 5. CONTAS A PAGAR (Despesas)
    # ==========================================
    cats = ["Combustível", "Viagem", "Alimentação", "Marketing", "Escritório"]
    for i in range(15):
        d = now - timedelta(days=random.randint(1, 60))
        contas_pagar.append({
            "id": _id(), "descricao": f"{random.choice(cats)} - Ref {i+1}",
            "categoria": random.choice(cats), "fornecedor": "Fornecedor Local",
            "valor": round(random.uniform(150, 1500), 2), 
            "vencimento": _iso(d + timedelta(days=random.randint(5, 20))),
            "status": random.choice(["aberto", "pago", "vencido"]), "created_at": _iso(d), "updated_at": _iso(d),
        })
    await db.contas_pagar.insert_many(contas_pagar)

    # ==========================================
    # 6. OPORTUNIDADES E VISITAS
    # ==========================================
    estagios = ["prospeccao", "proposta", "negociacao", "ganho", "perdido"]
    for i in range(10):
        c = random.choice(clientes)
        oportunidades.append({
            "id": _id(), "titulo": f"Negociação {c['nome_fantasia']}", "cliente_id": c["id"],
            "representada_id": random.choice(reps)["id"], "valor_estimado": round(random.uniform(5000, 50000), 2),
            "probabilidade": random.choice([20, 50, 80]), "estagio": random.choice(estagios),
            "data_prevista": _iso(now + timedelta(days=random.randint(5, 30))),
            "created_at": _iso(now), "updated_at": _iso(now)
        })
    await db.oportunidades.insert_many(oportunidades)

    for i in range(8):
        c = random.choice(clientes)
        visitas.append({
            "id": _id(), "cliente_id": c["id"], "tipo": "visita", "data": _iso(now + timedelta(days=random.randint(1, 15))),
            "horario": "14:00", "objetivo": "Apresentar novos produtos", "status": "agendada",
            "created_at": _iso(now), "updated_at": _iso(now)
        })
    await db.visitas.insert_many(visitas)

    print("✅ Mock Data massiva inserida com sucesso!")