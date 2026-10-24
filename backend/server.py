from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import hmac
import json
import re
import bcrypt
import jwt as pyjwt
import asyncio
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field, EmailStr
import stripe

# ------------------------------------------------------------
# Setup
# ------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGO = 'HS256'
MAX_LOGO = 700_000

APP_ENV = os.environ.get('APP_ENV', 'prod')
IS_PROD = APP_ENV == 'prod'

ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get(
        'ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000'
    ).split(',') if o.strip()
]

app = FastAPI(title="OMNIREPMAX API", version="2.2.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omnirepmax")

@app.get("/health")
async def health_root():
    return {"status": "ok"}

@app.get("/api/health")
async def health_api():
    return {"status": "ok"}

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
MESES_PT = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
}
MESES_ABR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None: return None
    if isinstance(dt, str): return dt
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False

def make_token(user: dict) -> str:
    payload = {
        "sub": user["id"], "email": user["email"],
        "role": user.get("role", "representante"),
        "tenant_id": user.get("tenant_id", user["id"]),
        "exp": now_utc() + timedelta(days=7), "type": "access"
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def clean_doc(doc: dict) -> dict:
    if doc and "_id" in doc: doc.pop("_id", None)
    return doc

def tid_of(current: dict) -> str:
    return current.get("tenant_id") or current["id"]

def _parse_date(s):
    if not s: return None
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        if d.tzinfo is None: d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception: return None

async def get_current_user(request: Request) -> dict:
    token = None
    # ✅ FIX CRÍTICO MULTI-TENANT: Prioriza o Header Authorization (Token novo) 
    # antes do Cookie (que pode estar velho no navegador).
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    
    if not token:
        token = request.cookies.get("access_token")

    if not token: raise HTTPException(401, "Não autenticado")
    try: payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except pyjwt.ExpiredSignatureError: raise HTTPException(401, "Token expirado")
    except pyjwt.InvalidTokenError: raise HTTPException(401, "Token inválido")
    
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user: raise HTTPException(401, "Usuário não encontrado")
    user["tenant_id"] = user.get("tenant_id") or user["id"]
    return user

async def t_list(name: str, current: dict, filters: Optional[dict] = None, sort_key: str = "created_at", limit: int = 1000):
    q: Dict[str, Any] = {"tenant_id": tid_of(current)}
    if filters: q.update(filters)
    cursor = db[name].find(q, {"_id": 0}).sort(sort_key, -1).limit(limit)
    return [clean_doc(d) async for d in cursor]

async def t_insert(name: str, current: dict, data: dict) -> dict:
    data["id"] = new_id()
    data["tenant_id"] = tid_of(current)
    data["created_at"] = iso(now_utc())
    data["updated_at"] = iso(now_utc())
    await db[name].insert_one(data)
    return {k: v for k, v in data.items() if k != "_id"}

async def t_update(name: str, current: dict, id_: str, updates: dict) -> dict:
    tid = tid_of(current)
    updates["updated_at"] = iso(now_utc())
    res = await db[name].update_one({"id": id_, "tenant_id": tid}, {"$set": updates})
    if res.matched_count == 0: raise HTTPException(404, "Não encontrado")
    doc = await db[name].find_one({"id": id_, "tenant_id": tid}, {"_id": 0})
    return doc

async def t_delete(name: str, current: dict, id_: str):
    res = await db[name].delete_one({"id": id_, "tenant_id": tid_of(current)})
    if res.deleted_count == 0: raise HTTPException(404, "Não encontrado")
    return {"ok": True}

async def next_numero(tid: str, prefix: str, name: str) -> str:
    res = await db.counters.find_one_and_update(
        {"tenant_id": tid, "name": name}, {"$inc": {"seq": 1}},
        upsert=True, return_document=ReturnDocument.AFTER
    )
    return f"{prefix}-{int(res['seq']):05d}"

# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    empresa: Optional[str] = ""
    telefone: Optional[str] = ""
    tamanho_operacao: Optional[str] = "solo"      # <-- NOVO
    controle_atual: Optional[str] = "planilha"    # <-- NOVO

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    empresa: Optional[str] = None
    telefone: Optional[str] = None

class RepresentadaIn(BaseModel):
    razao_social: str
    nome_fantasia: Optional[str] = ""
    cnpj: Optional[str] = ""
    inscricao_estadual: Optional[str] = ""
    segmento: Optional[str] = ""
    endereco: Optional[str] = ""
    cidade: Optional[str] = ""
    estado: Optional[str] = ""
    cep: Optional[str] = ""
    telefone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    email: Optional[str] = ""
    site: Optional[str] = ""
    contato_nome: Optional[str] = ""
    contato_cargo: Optional[str] = ""
    comissao_padrao: float = 5.0
    modalidade_comissao: str = "faturamento"
    base_calculo_comissao: str = "faturado"
    prazo_pagamento: Optional[str] = "30 dias"
    logo: Optional[str] = ""
    observacoes: Optional[str] = ""

class DocumentoIn(BaseModel):
    nome: str
    arquivo_base64: str

class ClienteIn(BaseModel):
    razao_social: str
    nome_fantasia: Optional[str] = ""
    cnpj_cpf: Optional[str] = ""
    inscricao_estadual: Optional[str] = ""
    situacao_cadastral: Optional[str] = "Ativa"
    segmento: Optional[str] = ""
    grupo_economico: Optional[str] = ""
    origem: Optional[str] = ""
    status: str = "ativo"
    potencial: Optional[str] = "medio"
    endereco: Optional[str] = ""
    cidade: Optional[str] = ""
    estado: Optional[str] = ""
    cep: Optional[str] = ""
    codigo_ibge: Optional[str] = ""
    endereco_entrega: Optional[str] = ""
    cidade_entrega: Optional[str] = ""
    estado_entrega: Optional[str] = ""
    cep_entrega: Optional[str] = ""
    telefone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    email: Optional[str] = ""
    site: Optional[str] = ""
    responsavel: Optional[str] = ""
    cargo: Optional[str] = ""
    telefone_comprador: Optional[str] = ""
    email_comprador: Optional[str] = ""
    responsavel_financeiro: Optional[str] = ""
    telefone_financeiro: Optional[str] = ""
    email_financeiro: Optional[str] = ""
    tabela_precos: Optional[str] = ""
    condicao_pagamento: Optional[str] = ""
    limite_credito: float = 0.0
    vendedor_responsavel: Optional[str] = ""
    instrucoes_entrega: Optional[str] = ""
    contribuinte_icms: Optional[str] = "Sim"
    representadas: List[str] = []
    representadas_codigos: Dict[str, str] = {}
    observacoes: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None

class ProdutoIn(BaseModel):
    nome: str
    codigo: Optional[str] = ""
    ean: Optional[str] = ""
    sku: Optional[str] = ""
    descricao: Optional[str] = ""
    categoria: Optional[str] = ""
    subcategoria: Optional[str] = ""
    marca: Optional[str] = ""
    representada_id: Optional[str] = ""
    preco_tabela: float = 0.0
    preco_sugerido: float = 0.0
    custo: float = 0.0
    comissao: Optional[float] = None
    ncm: Optional[str] = ""
    unidade: Optional[str] = "UN"
    embalagem: Optional[str] = ""
    qtd_por_caixa: Optional[int] = 1
    peso: Optional[float] = 0.0
    dimensoes: Optional[str] = ""
    status: str = "ativo"
    imagem: Optional[str] = ""
    observacoes: Optional[str] = ""

class TXTImportIn(BaseModel):
    representada_id: str
    produtos: List[dict]

class PedidoItemIn(BaseModel):
    produto_id: str
    nome: str
    descricao: Optional[str] = ""
    quantidade: float
    preco_unitario: float
    desconto: float = 0.0

class PedidoIn(BaseModel):
    cliente_id: str
    representada_id: str
    condicao_pagamento: Optional[str] = "30 dias"
    prazo_entrega: Optional[str] = ""
    transportadora: Optional[str] = ""
    frete: float = 0.0
    desconto_geral: float = 0.0
    observacoes: Optional[str] = ""
    itens: List[PedidoItemIn]
    parcelas: List[dict] = []
    status: str = "rascunho"

class FaturamentoIn(BaseModel):
    nf_numero: str
    nf_serie: Optional[str] = ""
    data_faturamento: str
    valor_faturado: float
    parcelas: List[dict] = []

class OportunidadeIn(BaseModel):
    titulo: str
    cliente_id: str
    representada_id: Optional[str] = ""
    valor_estimado: float = 0.0
    probabilidade: int = 50
    data_prevista: Optional[str] = ""
    estagio: str = "prospeccao"
    proxima_acao: Optional[str] = ""
    observacoes: Optional[str] = ""

class VisitaIn(BaseModel):
    cliente_id: str
    representada_id: Optional[str] = ""
    tipo: str = "visita"
    data: str
    horario: Optional[str] = ""
    objetivo: Optional[str] = ""
    resultado: Optional[str] = ""
    proxima_acao: Optional[str] = ""
    observacoes: Optional[str] = ""
    status: str = "agendada"

class ARIn(BaseModel):
    cliente_id: Optional[str] = ""
    representada_id: Optional[str] = ""
    pedido_id: Optional[str] = ""
    numero_documento: Optional[str] = ""
    valor: float
    vencimento: str
    data_recebimento: Optional[str] = ""
    status: str = "aberto"
    forma_pagamento: Optional[str] = ""
    observacoes: Optional[str] = ""

class APIn(BaseModel):
    descricao: str
    categoria: str
    fornecedor: Optional[str] = ""
    valor: float
    vencimento: str
    data_pagamento: Optional[str] = ""
    forma_pagamento: Optional[str] = ""
    status: str = "aberto"
    observacoes: Optional[str] = ""

class ComissaoUpdate(BaseModel):
    status: Optional[str] = None
    data_pagamento: Optional[str] = None
    valor_recebido: Optional[float] = None

class ChatIn(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

class FeedBackIn(BaseModel):
    tipo: str = "feedback"
    mensagem: str
    nota: Optional[int] = 5

# ------------------------------------------------------------
# Auth
# ------------------------------------------------------------
def set_cookies(response: Response, token: str):
    response.set_cookie(
        "access_token", token, httponly=True, secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
        max_age=604800, path="/",
    )

@api.post("/auth/signup")
async def signup(body: SignupIn, response: Response):
    # ✅ FIX CRÍTICO: reescrita completa desta função (estava truncada)
    if len(body.password) < 8:
        raise HTTPException(400, "Senha deve ter pelo menos 8 caracteres")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "E-mail já cadastrado")
    uid = new_id()
    user = {
        "id": uid,
        "tenant_id": uid,
        "email": email,
        "name": body.name,
        "empresa": body.empresa or "",
        "telefone": body.telefone or "",
        "role": "admin",
        "plan": "trial",
        "trial_ends_at": iso(now_utc() + timedelta(days=7)),
        "password_hash": hash_pw(body.password),
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user)

    # Salva o lead em coleção separada (nossa "planilha escondida")
    await db.leads.insert_one({
        "name": body.name,
        "email": email,
        "tamanho_operacao": body.tamanho_operacao, # <-- NOVO
        "controle_atual": body.controle_atual,  
        "empresa": body.empresa or "",
        "telefone": body.telefone or "",
        "plan": "trial",
        "created_at": iso(now_utc()),
    })

    token = make_token(user)
    set_cookies(response, token)
    return {"user": {k: v for k, v in user.items() if k not in ("password_hash", "_id")}, "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Credenciais inválidas")
    token = make_token(user)
    set_cookies(response, token)
    user = clean_doc(user); user.pop("password_hash", None)
    user["tenant_id"] = user.get("tenant_id") or user["id"]
    return {"user": user, "token": token}

@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current

@api.patch("/auth/me")
async def update_me(body: UserProfileUpdate, current=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "logo" in updates and updates["logo"] and len(updates["logo"]) > MAX_LOGO:
        raise HTTPException(413, "Logo muito grande.")
    if not updates: return current
    await db.users.update_one({"id": current["id"]}, {"$set": updates})
    doc = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    doc["tenant_id"] = doc.get("tenant_id") or doc["id"]
    return doc

@api.post("/auth/logout")
async def logout(response: Response):
    # ✅ FIX: Para o navegador apagar o cookie, precisamos usar as mesmas flags de segurança
    response.delete_cookie(
        key="access_token", 
        path="/", 
        secure=IS_PROD, 
        samesite="none" if IS_PROD else "lax", 
        httponly=True
    )
    return {"ok": True}

@api.post("/auth/forgot-password")
async def forgot(body: dict):
    email = (body.get("email") or "").lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"ok": True, "message": "Se o e-mail existir, instruções foram enviadas."}
    token = new_id()
    await db.password_resets.insert_one({
        "token": token, "user_id": user["id"],
        "expires_at": iso(now_utc() + timedelta(hours=1)), "used": False
    })
    if not IS_PROD:
        return {"ok": True, "token": token, "message": "DEV: use este token para testar."}
    return {"ok": True, "message": "Se o e-mail existir, instruções foram enviadas."}

@api.post("/auth/reset-password")
async def reset_pw(body: dict):
    token = body.get("token"); new_password = body.get("password")
    if not token or not new_password or len(new_password) < 8:
        raise HTTPException(400, "Senha inválida")
    rec = await db.password_resets.find_one({"token": token, "used": False})
    if not rec: raise HTTPException(400, "Token inválido")
    exp = _parse_date(rec.get("expires_at"))
    if not exp or exp < now_utc(): raise HTTPException(400, "Token expirado")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_pw(new_password)}})
    await db.password_resets.update_one({"token": token}, {"$set": {"used": True}})
    return {"ok": True}

# ------------------------------------------------------------
# Representadas & Documentos
# ------------------------------------------------------------
@api.get("/representadas")
async def get_representadas(current=Depends(get_current_user)):
    return await t_list("representadas", current)

@api.post("/representadas")
async def create_representada(body: RepresentadaIn, current=Depends(get_current_user)):
    data = body.model_dump()
    if data.get("logo") and len(data["logo"]) > MAX_LOGO:
        raise HTTPException(413, "Logo muito grande.")
    return await t_insert("representadas", current, data)

@api.put("/representadas/{rid}")
async def update_representada(rid: str, body: RepresentadaIn, current=Depends(get_current_user)):
    data = body.model_dump()
    if data.get("logo") and len(data["logo"]) > MAX_LOGO:
        raise HTTPException(413, "Logo muito grande.")
    return await t_update("representadas", current, rid, data)

@api.delete("/representadas/{rid}")
async def del_representada(rid: str, current=Depends(get_current_user)):
    tid = tid_of(current)
    has_pedidos = await db.pedidos.count_documents({"representada_id": rid, "tenant_id": tid})
    if has_pedidos > 0:
        raise HTTPException(400, f"Não é possível excluir. Existem {has_pedidos} pedidos vinculados.")
    return await t_delete("representadas", current, rid)

@api.post("/representadas/{rid}/documentos")
async def upload_documento(rid: str, body: DocumentoIn, current=Depends(get_current_user)):
    tid = tid_of(current)
    rep = await db.representadas.find_one({"id": rid, "tenant_id": tid})
    if not rep: raise HTTPException(404, "Representada não encontrada")
    if len(body.arquivo_base64) > 5_000_000:
        raise HTTPException(413, "Arquivo muito grande. Máx 3MB.")
    doc = {
        "id": new_id(), "tenant_id": tid, "representada_id": rid,
        "nome": body.nome, "arquivo_base64": body.arquivo_base64,
        "created_at": iso(now_utc())
    }
    await db.documentos.insert_one(doc)
    return {"ok": True, "id": doc["id"]}

@api.get("/representadas/{rid}/documentos")
async def get_documentos(rid: str, current=Depends(get_current_user)):
    docs = await db.documentos.find(
        {"tenant_id": tid_of(current), "representada_id": rid},
        {"arquivo_base64": 0, "_id": 0}
    ).to_list(100)
    return docs

@api.get("/documentos/{doc_id}/download")
async def download_documento(doc_id: str, current=Depends(get_current_user)):
    doc = await db.documentos.find_one({"id": doc_id, "tenant_id": tid_of(current)})
    if not doc: raise HTTPException(404, "Documento não encontrado")
    return {"nome": doc["nome"], "arquivo_base64": doc["arquivo_base64"]}

@api.delete("/documentos/{doc_id}")
async def del_documento(doc_id: str, current=Depends(get_current_user)):
    res = await db.documentos.delete_one({"id": doc_id, "tenant_id": tid_of(current)})
    if res.deleted_count == 0: raise HTTPException(404, "Documento não encontrado")
    return {"ok": True}

# ------------------------------------------------------------
# Clientes
# ------------------------------------------------------------
@api.get("/clientes")
async def get_clientes(status: Optional[str] = None, representada_id: Optional[str] = None, current=Depends(get_current_user)):
    f: Dict[str, Any] = {}
    if status: f["status"] = status
    if representada_id: f["representadas"] = representada_id
    return await t_list("clientes", current, f)

@api.post("/clientes")
async def create_cliente(body: ClienteIn, current=Depends(get_current_user)):
    return await t_insert("clientes", current, body.model_dump())

@api.put("/clientes/{cid}")
async def update_cliente(cid: str, body: ClienteIn, current=Depends(get_current_user)):
    return await t_update("clientes", current, cid, body.model_dump())

@api.delete("/clientes/{cid}")
async def del_cliente(cid: str, current=Depends(get_current_user)):
    tid = tid_of(current)
    has_pedidos = await db.pedidos.count_documents({"cliente_id": cid, "tenant_id": tid})
    if has_pedidos > 0:
        raise HTTPException(400, f"Não é possível excluir. Existem {has_pedidos} pedidos vinculados.")
    return await t_delete("clientes", current, cid)

# ------------------------------------------------------------
# Produtos
# ------------------------------------------------------------
@api.get("/produtos")
async def get_produtos(representada_id: Optional[str] = None, categoria: Optional[str] = None, current=Depends(get_current_user)):
    f: Dict[str, Any] = {}
    if representada_id: f["representada_id"] = representada_id
    if categoria: f["categoria"] = categoria
    return await t_list("produtos", current, f)

@api.post("/produtos")
async def create_produto(body: ProdutoIn, current=Depends(get_current_user)):
    return await t_insert("produtos", current, body.model_dump())

@api.put("/produtos/{pid}")
async def update_produto(pid: str, body: ProdutoIn, current=Depends(get_current_user)):
    return await t_update("produtos", current, pid, body.model_dump())

@api.delete("/produtos/{pid}")
async def del_produto(pid: str, current=Depends(get_current_user)):
    return await t_delete("produtos", current, pid)

@api.post("/produtos/import-txt")
async def import_txt(body: TXTImportIn, current=Depends(get_current_user)):
    tid = tid_of(current)
    criados = 0
    for p in body.produtos:
        existing = await db.produtos.find_one({"tenant_id": tid, "codigo": p.get("codigo"), "representada_id": body.representada_id})
        if not existing:
            await t_insert("produtos", current, {
                "representada_id": body.representada_id,
                "nome": p.get("nome"),
                "codigo": p.get("codigo"),
                "ean": p.get("ean", ""),
                "marca": p.get("marca", ""),
                "categoria": p.get("categoria", ""),
                "preco_tabela": float(p.get("preco", 0)),
                "unidade": p.get("unidade", "UN"),
                "status": "ativo"
            })
            criados += 1
    return {"ok": True, "criados": criados}

# ------------------------------------------------------------
# Pedidos
# ------------------------------------------------------------
def calc_pedido_totals(data: dict, repr_comissao: float) -> dict:
    subtotal = 0.0
    for it in data.get("itens", []):
        sub = it["quantidade"] * it["preco_unitario"]
        sub -= sub * (it.get("desconto", 0) / 100.0)
        it["subtotal"] = round(sub, 2)
        subtotal += sub
    desc_geral = data.get("desconto_geral", 0.0)
    frete = data.get("frete", 0.0)
    total = subtotal - (subtotal * desc_geral / 100.0) + frete
    data["subtotal"] = round(subtotal, 2)
    data["total"] = round(total, 2)
    data["comissao_percentual"] = repr_comissao
    data["comissao_valor"] = round(total * repr_comissao / 100.0, 2)
    return data

async def gerar_parcelas_comissao(current: dict, ped: dict, comissao: dict, parcelas_override: List[dict] = None):
    """Divide o valor LÍQUIDO da comissão entre as parcelas, ignorando valores do frontend."""
    parcelas = parcelas_override if parcelas_override is not None else ped.get("parcelas", [])
    valor_liquido = comissao["valor_liquido"]

    if not parcelas:
        parcelas = [{"vencimento": iso(now_utc() + timedelta(days=30)), "valor": valor_liquido}]
    else:
        # ✅ FIX: ignorar valor do frontend, calcular do backend
        num = len(parcelas)
        valor_parcela = round(valor_liquido / num, 2)
        diferenca = round(valor_liquido - (valor_parcela * num), 2)
        for i, p in enumerate(parcelas):
            p["valor"] = valor_parcela
            if i == num - 1:
                p["valor"] = round(p["valor"] + diferenca, 2)

    for i, p in enumerate(parcelas):
        await t_insert("contas_receber", current, {
            "comissao_id": comissao["id"],
            "cliente_id": ped.get("cliente_id"),
            "representada_id": ped.get("representada_id"),
            "pedido_id": ped["id"],
            "numero_documento": f"{ped.get('numero')} ({i+1}/{len(parcelas)})",
            "valor": p["valor"],
            "valor_recebido": 0.0,
            "saldo_pendente": p["valor"],
            "vencimento": p["vencimento"],
            "status": "aberto",
            "historico_recebimentos": [],
            "forma_pagamento": "Boleto",
        })

@api.get("/pedidos")
async def get_pedidos(status: Optional[str] = None, cliente_id: Optional[str] = None, representada_id: Optional[str] = None, current=Depends(get_current_user)):
    f: Dict[str, Any] = {}
    if status: f["status"] = status
    if cliente_id: f["cliente_id"] = cliente_id
    if representada_id: f["representada_id"] = representada_id
    
    pedidos = await t_list("pedidos", current, f)
    faturamentos = await t_list("faturamentos", current)

    # ✅ NOVO: Calcula o valor total faturado e o saldo pendente de cada pedido
    fat_dict = {}
    for fat in faturamentos:
        pid = fat.get("pedido_id")
        if pid:
            fat_dict[pid] = fat_dict.get(pid, 0) + fat.get("valor_faturado", 0)

    for p in pedidos:
        valor_faturado = fat_dict.get(p["id"], 0)
        p["valor_faturado_total"] = round(valor_faturado, 2)
        p["saldo_a_faturar"] = round(p["total"] - valor_faturado, 2)

    return pedidos

@api.post("/pedidos")
async def create_pedido(body: PedidoIn, current=Depends(get_current_user)):
    tid = tid_of(current)
    data = body.model_dump()
    rep = await db.representadas.find_one({"id": data["representada_id"], "tenant_id": tid}, {"_id": 0})
    if not rep: raise HTTPException(404, "Representada não encontrada")
    cli = await db.clientes.find_one({"id": data["cliente_id"], "tenant_id": tid}, {"_id": 0})
    if not cli: raise HTTPException(404, "Cliente não encontrado")
    data = calc_pedido_totals(data, rep.get("comissao_padrao", 5.0))
    data["numero"] = await next_numero(tid, "PED", "pedidos")
    data["data_pedido"] = iso(now_utc())
    return await t_insert("pedidos", current, data)

@api.put("/pedidos/{pid}")
async def update_pedido(pid: str, body: PedidoIn, current=Depends(get_current_user)):
    tid = tid_of(current)
    existing = await db.pedidos.find_one({"id": pid, "tenant_id": tid})
    if not existing: raise HTTPException(404, "Pedido não encontrado")
    if existing.get("status") in ("faturado", "faturado_parcial"):
        raise HTTPException(400, "Pedidos faturados não podem ser editados.")
    data = body.model_dump()
    rep = await db.representadas.find_one({"id": data["representada_id"], "tenant_id": tid}, {"_id": 0})
    if not rep: raise HTTPException(404, "Representada não encontrada")
    cli = await db.clientes.find_one({"id": data["cliente_id"], "tenant_id": tid}, {"_id": 0})
    if not cli: raise HTTPException(404, "Cliente não encontrado")
    data = calc_pedido_totals(data, rep.get("comissao_padrao", 5.0))
    data["numero"] = existing["numero"]
    return await t_update("pedidos", current, pid, data)

@api.patch("/pedidos/{pid}/status")
async def status_pedido(pid: str, body: dict, current=Depends(get_current_user)):
    novo = body.get("status")
    if not novo: raise HTTPException(400, "status obrigatório")
    updates = {"status": novo}
    if "nf_numero" in body: updates["nf_numero"] = body["nf_numero"]
    return await t_update("pedidos", current, pid, updates)

@api.post("/pedidos/{pid}/faturamento")
async def registrar_faturamento(pid: str, body: FaturamentoIn, current=Depends(get_current_user)):
    tid = tid_of(current)
    ped = await db.pedidos.find_one({"id": pid, "tenant_id": tid})
    if not ped: raise HTTPException(404, "Pedido não encontrado")

    rep = await db.representadas.find_one({"id": ped["representada_id"], "tenant_id": tid})

    # 1. Salva histórico do faturamento
    await t_insert("faturamentos", current, {
        "pedido_id": pid, "nf_numero": body.nf_numero, "nf_serie": body.nf_serie,
        "data_faturamento": body.data_faturamento,
        "valor_faturado": body.valor_faturado,
    })

    # 2. Calcula comissão com base na regra da representada
    base = rep.get("base_calculo_comissao", "faturado")
    if base == "pedido":
        valor_base = ped.get("total", 0)
    elif base == "recebido":
        valor_base = 0
    else:
        valor_base = body.valor_faturado

    percentual = rep.get("comissao_padrao", 5.0)
    valor_liquido = round(valor_base * (percentual / 100), 2)

    # 3. Cria comissão
    comissao_data = {
        "pedido_id": pid, "pedido_numero": ped.get("numero"),
        "cliente_id": ped.get("cliente_id"),
        "representada_id": ped.get("representada_id"),
        "nf_numero": body.nf_numero,
        "valor_total_pedido": ped.get("total", 0),
        "valor_faturado": body.valor_faturado,
        "percentual": percentual,
        "valor_liquido": valor_liquido,
        "valor_recebido": 0.0,
        "saldo_pendente": valor_liquido,
        "modalidade": rep.get("modalidade_comissao", "faturamento"),
        "status": "pendente" if rep.get("modalidade_comissao") == "faturamento" else "aguardando_liquidez",
        "historico_recebimentos": [],
    }
    comissao = await t_insert("comissoes", current, comissao_data)

    # 4. Gera contas a receber se for faturamento
    if rep.get("modalidade_comissao") == "faturamento" and valor_liquido > 0:
        await gerar_parcelas_comissao(current, ped, comissao, body.parcelas)

    # 5. Atualiza status do pedido
    faturamentos = await t_list("faturamentos", current, {"pedido_id": pid})
    total_faturado = sum(f["valor_faturado"] for f in faturamentos)
    novo_status = "faturado" if total_faturado >= ped["total"] else "faturado_parcial"
    await db.pedidos.update_one({"id": pid}, {"$set": {"status": novo_status}})

    return {"ok": True, "status": novo_status, "valor_liquido": valor_liquido}

@api.post("/pedidos/{pid}/liquidez")
async def confirmar_liquidez(pid: str, current=Depends(get_current_user)):
    tid = tid_of(current)
    ped = await db.pedidos.find_one({"id": pid, "tenant_id": tid})
    if not ped: raise HTTPException(404, "Pedido não encontrado")

    com = await db.comissoes.find_one({"pedido_id": pid, "tenant_id": tid, "status": "aguardando_liquidez"})
    if not com: raise HTTPException(404, "Comissão não encontrada ou já liberada.")

    await db.comissoes.update_one({"id": com["id"]}, {"$set": {"status": "pendente"}})

    rep = await db.representadas.find_one({"id": ped["representada_id"], "tenant_id": tid})
    if rep.get("base_calculo_comissao") == "recebido":
        faturamentos = await t_list("faturamentos", current, {"pedido_id": pid})
        total_faturado = sum(f["valor_faturado"] for f in faturamentos)
        novo_valor = round(total_faturado * (com["percentual"] / 100), 2)
        await db.comissoes.update_one({"id": com["id"]}, {"$set": {
            "valor_liquido": novo_valor, "saldo_pendente": novo_valor
        }})
        com["valor_liquido"] = novo_valor

    await gerar_parcelas_comissao(current, ped, com)
    return {"ok": True, "message": "Comissão liberada."}

@api.delete("/pedidos/{pid}")
async def del_pedido(pid: str, current=Depends(get_current_user)):
    tid = tid_of(current)
    paga = await db.comissoes.find_one({"tenant_id": tid, "pedido_id": pid, "status": "recebida"})
    if paga: raise HTTPException(400, "Pedido possui comissão já recebida. Estorne antes de excluir.")
    await db.comissoes.delete_many({"tenant_id": tid, "pedido_id": pid})
    await db.contas_receber.delete_many({"tenant_id": tid, "pedido_id": pid})
    await db.faturamentos.delete_many({"tenant_id": tid, "pedido_id": pid})
    return await t_delete("pedidos", current, pid)

# ------------------------------------------------------------
# Oportunidades / Visitas
# ------------------------------------------------------------
@api.get("/oportunidades")
async def get_ops(current=Depends(get_current_user)):
    return await t_list("oportunidades", current)

@api.post("/oportunidades")
async def create_op(body: OportunidadeIn, current=Depends(get_current_user)):
    return await t_insert("oportunidades", current, body.model_dump())

@api.put("/oportunidades/{oid}")
async def update_op(oid: str, body: OportunidadeIn, current=Depends(get_current_user)):
    return await t_update("oportunidades", current, oid, body.model_dump())

@api.patch("/oportunidades/{oid}/estagio")
async def move_op(oid: str, body: dict, current=Depends(get_current_user)):
    return await t_update("oportunidades", current, oid, {"estagio": body.get("estagio")})

@api.delete("/oportunidades/{oid}")
async def del_op(oid: str, current=Depends(get_current_user)):
    return await t_delete("oportunidades", current, oid)

@api.get("/visitas")
async def get_visitas(current=Depends(get_current_user)):
    return await t_list("visitas", current, sort_key="data")

@api.post("/visitas")
async def create_visita(body: VisitaIn, current=Depends(get_current_user)):
    return await t_insert("visitas", current, body.model_dump())

@api.put("/visitas/{vid}")
async def update_visita(vid: str, body: VisitaIn, current=Depends(get_current_user)):
    return await t_update("visitas", current, vid, body.model_dump())

@api.delete("/visitas/{vid}")
async def del_visita(vid: str, current=Depends(get_current_user)):
    return await t_delete("visitas", current, vid)

# ------------------------------------------------------------
# Comissões / Contas a Receber
# ------------------------------------------------------------
@api.get("/comissoes")
async def get_comissoes(status: Optional[str] = None, representada_id: Optional[str] = None, current=Depends(get_current_user)):
    f: Dict[str, Any] = {}
    if status: f["status"] = status
    if representada_id: f["representada_id"] = representada_id
    return await t_list("comissoes", current, f)

@api.patch("/comissoes/{cid}")
async def update_comissao(cid: str, body: ComissaoUpdate, current=Depends(get_current_user)):
    return await t_update("comissoes", current, cid, {k: v for k, v in body.model_dump().items() if v is not None})

@api.delete("/comissoes/{cid}")
async def del_comissao(cid: str, current=Depends(get_current_user)):
    doc = await db.comissoes.find_one({"id": cid, "tenant_id": tid_of(current)})
    if not doc: raise HTTPException(404, "Comissão não encontrada")
    if doc.get("status") == "recebida" or doc.get("valor_recebido", 0) > 0:
        raise HTTPException(400, "Comissões já recebidas não podem ser excluídas.")
    return await t_delete("comissoes", current, cid)

@api.get("/contas-receber")
async def get_ar(current=Depends(get_current_user)):
    return await t_list("contas_receber", current, sort_key="vencimento")

@api.post("/contas-receber")
async def create_ar(body: ARIn, current=Depends(get_current_user)):
    return await t_insert("contas_receber", current, body.model_dump())

@api.put("/contas-receber/{rid}")
async def update_ar(rid: str, body: ARIn, current=Depends(get_current_user)):
    return await t_update("contas_receber", current, rid, body.model_dump())

@api.delete("/contas-receber/{rid}")
async def del_ar(rid: str, current=Depends(get_current_user)):
    return await t_delete("contas_receber", current, rid)

@api.post("/contas-receber/{rid}/receber")
async def receber_comissao(rid: str, body: dict, current=Depends(get_current_user)):
    tid = tid_of(current)
    ar = await db.contas_receber.find_one({"id": rid, "tenant_id": tid})
    if not ar: raise HTTPException(404, "Conta não encontrada")

    valor_recebido = float(body.get("valor", 0))
    data_recebimento = body.get("data", iso(now_utc()))
    if valor_recebido <= 0: raise HTTPException(400, "Valor deve ser maior que zero")

    saldo_atual = ar.get("saldo_pendente", ar.get("valor", 0))
    novo_saldo = saldo_atual - valor_recebido
    novo_total_recebido = ar.get("valor_recebido", 0) + valor_recebido
    novo_status = "recebido" if novo_saldo <= 0.01 else "aberto"

    historico = ar.get("historico_recebimentos", [])
    historico.append({"data": data_recebimento, "valor": valor_recebido, "saldo_restante": round(max(0, novo_saldo), 2)})

    await db.contas_receber.update_one({"id": rid}, {"$set": {
        "valor_recebido": round(novo_total_recebido, 2),
        "saldo_pendente": round(max(0, novo_saldo), 2),
        "status": novo_status,
        "historico_recebimentos": historico,
        "updated_at": iso(now_utc())
    }})

    if ar.get("comissao_id"):
        com = await db.comissoes.find_one({"id": ar["comissao_id"], "tenant_id": tid})
        if com:
            c_saldo = com.get("saldo_pendente", com.get("valor_liquido", 0))
            c_novo_saldo = c_saldo - valor_recebido
            c_novo_receb = com.get("valor_recebido", 0) + valor_recebido
            c_status = "recebida" if c_novo_saldo <= 0.01 else "parcialmente_recebida"
            c_hist = com.get("historico_recebimentos", [])
            c_hist.append({"data": data_recebimento, "valor": valor_recebido, "saldo_restante": round(max(0, c_novo_saldo), 2)})
            await db.comissoes.update_one({"id": com["id"]}, {"$set": {
                "valor_recebido": round(c_novo_receb, 2),
                "saldo_pendente": round(max(0, c_novo_saldo), 2),
                "status": c_status,
                "historico_recebimentos": c_hist,
                "updated_at": iso(now_utc())
            }})

    return {"ok": True, "novo_saldo": novo_saldo}

# ------------------------------------------------------------
# Contas a Pagar
# ------------------------------------------------------------
@api.get("/contas-pagar")
async def get_ap(current=Depends(get_current_user)):
    return await t_list("contas_pagar", current, sort_key="vencimento")

@api.post("/contas-pagar")
async def create_ap(body: APIn, current=Depends(get_current_user)):
    return await t_insert("contas_pagar", current, body.model_dump())

@api.put("/contas-pagar/{pid}")
async def update_ap(pid: str, body: APIn, current=Depends(get_current_user)):
    return await t_update("contas_pagar", current, pid, body.model_dump())

@api.delete("/contas-pagar/{pid}")
async def del_ap(pid: str, current=Depends(get_current_user)):
    return await t_delete("contas_pagar", current, pid)

# ------------------------------------------------------------
# Dashboard
# ------------------------------------------------------------
def _in_month(s, y, m):
    d = _parse_date(s); return bool(d and d.year == y and d.month == m)

def _in_year(s, y):
    d = _parse_date(s); return bool(d and d.year == y)

@api.get("/dashboard")
async def dashboard(current=Depends(get_current_user)):
    pedidos, reps, comissoes, ap, ar, clientes, visitas, ops = await asyncio.gather(
        t_list("pedidos", current), t_list("representadas", current), t_list("comissoes", current),
        t_list("contas_pagar", current), t_list("contas_receber", current), t_list("clientes", current),
        t_list("visitas", current), t_list("oportunidades", current)
    )

    faturados = [p for p in pedidos if p.get("status") in ("faturado", "faturado_parcial")]
    now = now_utc(); mes = now.month; ano = now.year

    fat_mes = sum(p.get("total", 0) for p in faturados if _in_month(p.get("data_pedido"), ano, mes))
    fat_ano = sum(p.get("total", 0) for p in faturados if _in_year(p.get("data_pedido"), ano))
    fat_por_rep = [{"nome": r.get("nome_fantasia") or r.get("razao_social"),
                    "valor": round(sum(p.get("total", 0) for p in faturados if p.get("representada_id") == r["id"]), 2)}
                   for r in reps]

    com_recebidas = sum(c.get("valor_recebido", 0) for c in comissoes)
    com_abertas = sum(c.get("saldo_pendente", 0) for c in comissoes if c.get("status") not in ("recebida", "aguardando_liquidez"))

    ap_abertas = sum(a.get("valor", 0) for a in ap if a.get("status") == "aberto")
    ar_abertas = sum(a.get("saldo_pendente", a.get("valor", 0)) for a in ar if a.get("status") == "aberto")

    despesas_mes = sum(a.get("valor", 0) for a in ap if a.get("status") == "pago" and _in_month(a.get("vencimento"), ano, mes))
    saldo_mes = fat_mes - despesas_mes

    em_atraso_valor = 0.0; em_atraso_count = 0
    for a in ap + ar:
        if a.get("status") in ("aberto", "vencido"):
            d = _parse_date(a.get("vencimento"))
            if d and d < now:
                val = a.get("saldo_pendente", a.get("valor", 0)) if "comissao_id" in a else a.get("valor", 0)
                em_atraso_valor += val; em_atraso_count += 1

    projecao_valor = sum(p.get("total", 0) for p in pedidos if p.get("status") in ("aprovado", "enviado"))
    projecao_comissao = sum(p.get("comissao_valor", 0) for p in pedidos if p.get("status") in ("aprovado", "enviado"))

    clientes_ativos = sum(1 for c in clientes if c.get("status") == "ativo")
    novos = sum(1 for c in clientes if _in_month(c.get("created_at"), ano, mes))
    pedidos_abertos = sum(1 for p in pedidos if p.get("status") in ("rascunho", "enviado", "aprovado"))
    pedidos_faturados = len(faturados)
    visitas_realizadas = sum(1 for v in visitas if v.get("status") == "realizada")
    propostas_neg = sum(1 for o in ops if o.get("estagio") in ("proposta", "negociacao"))

    serie = []
    for i in range(5, -1, -1):
        d = (now.replace(day=1) - timedelta(days=30 * i))
        val = sum(p.get("total", 0) for p in faturados if _in_month(p.get("data_pedido"), d.year, d.month))
        serie.append({"mes": f"{MESES_ABR[d.month-1]}/{d.strftime('%y')}", "valor": round(val, 2)})

    prod_total: Dict[str, float] = {}
    for p in faturados:
        for it in p.get("itens", []):
            k = it.get("nome", ""); prod_total[k] = prod_total.get(k, 0) + it.get("subtotal", 0)
    top_produtos = sorted([{"nome": k, "valor": round(v, 2)} for k, v in prod_total.items()], key=lambda x: -x["valor"])[:5]

    cat_total: Dict[str, float] = {}
    for a in ap:
        c = a.get("categoria", "Outros"); cat_total[c] = cat_total.get(c, 0) + a.get("valor", 0)
    gastos_por_categoria = sorted([{"categoria": k, "valor": round(v, 2)} for k, v in cat_total.items()], key=lambda x: -x["valor"])

    if fat_mes <= 0: saude = 50
    else:
        margem = max(0.0, min(1.0, (fat_mes - despesas_mes) / fat_mes))
        pen_atraso = min(0.4, em_atraso_valor / max(1.0, fat_mes))
        saude = int(round(max(0, min(100, (margem * 0.7 + 0.3) * 100 - pen_atraso * 100))))
    saude_label = "Excelente" if saude >= 80 else ("Boa" if saude >= 60 else ("Regular" if saude >= 40 else "Ruim"))

    avisos = []
    cmap = {c["id"]: c for c in clientes}
    for a in ap + ar:
        if a.get("status") in ("aberto", "vencido"):
            d = _parse_date(a.get("vencimento"))
            if d and d < now:
                dias = (now - d).days
                nome = a.get("descricao") or (cmap.get(a.get("cliente_id"), {}).get("nome_fantasia") if a.get("cliente_id") else "") or a.get("numero_documento", "Título")
                val = a.get("saldo_pendente", a.get("valor", 0)) if "comissao_id" in a else a.get("valor", 0)
                avisos.append({"tipo": "atraso", "titulo": f'"{nome}" está vencida há {dias} dias', "valor": val})
    for c in comissoes:
        if c.get("status") in ("pendente", "parcialmente_recebida"):
            d = _parse_date(c.get("data_prevista"))
            if d and 0 <= (d - now).days <= 7:
                nome = cmap.get(c.get("cliente_id"), {}).get("nome_fantasia", "cliente")
                avisos.append({"tipo": "comissao", "titulo": f'Comissão de {nome} vence em {(d - now).days} dias', "valor": c.get("saldo_pendente", 0)})
    avisos = avisos[:5]

    return {
        "mes_atual": f"{MESES_PT[mes]} de {ano}",
        "faturamento_mes": round(fat_mes, 2), "faturamento_ano": round(fat_ano, 2),
        "faturamento_por_representada": fat_por_rep,
        "comissoes_previstas": round(com_abertas, 2), "comissoes_recebidas": round(com_recebidas, 2),
        "comissoes_abertas": round(com_abertas, 2),
        "contas_pagar_abertas": round(ap_abertas, 2), "contas_receber_abertas": round(ar_abertas, 2),
        "despesas_mes": round(despesas_mes, 2), "saldo_mes": round(saldo_mes, 2),
        "em_atraso": round(em_atraso_valor, 2), "em_atraso_count": em_atraso_count,
        "projecao_valor": round(projecao_valor, 2), "projecao_comissao": round(projecao_comissao, 2),
        "pedidos_abertos": pedidos_abertos, "pedidos_faturados": pedidos_faturados,
        "clientes_ativos": clientes_ativos, "novos_clientes": novos,
        "visitas_realizadas": visitas_realizadas, "propostas_negociacao": propostas_neg,
        "serie_faturamento": serie, "top_produtos": top_produtos,
        "gastos_por_categoria": gastos_por_categoria,
        "saude_financeira": saude, "saude_label": saude_label, "avisos": avisos,
    }

# ------------------------------------------------------------
# Insights & IA
# ------------------------------------------------------------
@api.get("/insights/regras")
async def insights_regras(current=Depends(get_current_user)):
    now = now_utc()
    clientes, pedidos, reps = await asyncio.gather(
        t_list("clientes", current), t_list("pedidos", current), t_list("representadas", current)
    )
    insights = []
    for c in clientes:
        if c.get("status") != "ativo": continue
        pc = [p for p in pedidos if p.get("cliente_id") == c["id"]]
        if not pc:
            insights.append({"tipo": "alerta", "titulo": "Cliente sem compras",
                             "descricao": f"{c.get('nome_fantasia') or c.get('razao_social')} ainda não realizou pedidos.",
                             "cliente_id": c["id"]}); continue
        ultimo = max((_parse_date(p.get("data_pedido")) or now for p in pc))
        dias = (now - ultimo).days
        if dias >= 60:
            insights.append({"tipo": "alerta", "titulo": f"Cliente sem compra há {dias} dias",
                             "descricao": f"{c.get('nome_fantasia') or c.get('razao_social')} sem pedidos recentes.",
                             "cliente_id": c["id"]})
    for r in reps:
        pr = [p for p in pedidos if p.get("representada_id") == r["id"] and p.get("status") in ("faturado", "faturado_parcial")]
        if len(pr) >= 2:
            total = sum(p.get("total", 0) for p in pr)
            insights.append({"tipo": "oportunidade",
                             "titulo": f"Boa performance: {r.get('nome_fantasia') or r.get('razao_social')}",
                             "descricao": f"Total faturado: R$ {total:,.2f}."})
    return insights[:15]

async def _build_ai_context(current: dict) -> str:
    clientes, pedidos, reps, comissoes, ap, ar = await asyncio.gather(
        t_list("clientes", current), t_list("pedidos", current), t_list("representadas", current),
        t_list("comissoes", current), t_list("contas_pagar", current), t_list("contas_receber", current)
    )
    now = now_utc()
    top_c = sorted(clientes, key=lambda c: sum(p.get("total", 0) for p in pedidos if p.get("cliente_id") == c["id"]), reverse=True)[:10]
    top_clientes = []
    for c in top_c:
        fat = sum(p.get("total", 0) for p in pedidos if p.get("cliente_id") == c["id"] and p.get("status") in ("faturado", "faturado_parcial"))
        ult = max((_parse_date(p.get("data_pedido")) or now for p in pedidos if p.get("cliente_id") == c["id"]), default=None)
        dias = (now - ult).days if ult else None
        top_clientes.append({"nome": c.get("nome_fantasia") or c.get("razao_social"),
                             "status": c.get("status"), "cidade": c.get("cidade"),
                             "faturamento": round(fat, 2), "dias_ultima_compra": dias})

    inativos = []
    for c in clientes[:30]:
        pc = [p for p in pedidos if p.get("cliente_id") == c["id"]]
        nome = c.get("nome_fantasia") or c.get("razao_social")
        if not pc: inativos.append(nome); continue
        datas = [d for d in (_parse_date(p.get("data_pedido")) for p in pc) if d]
        if not datas or (now - max(datas)).days > 30: inativos.append(nome)
    inativos = inativos[:10]

    por_rep = [{"representada": r.get("nome_fantasia") or r.get("razao_social"),
                "comissao_padrao": r.get("comissao_padrao"),
                "total_faturado": round(sum(p.get("total", 0) for p in pedidos if p.get("representada_id") == r["id"] and p.get("status") in ("faturado", "faturado_parcial")), 2),
                "pedidos_faturados": len([p for p in pedidos if p.get("representada_id") == r["id"] and p.get("status") in ("faturado", "faturado_parcial")])}
               for r in reps]

    ar_aberto = sum(a.get("saldo_pendente", a.get("valor", 0)) for a in ar if a.get("status") == "aberto")

    ctx = {
        "data_de_hoje": now.strftime("%Y-%m-%d"),
        "resumo": {
            "clientes_total": len(clientes),
            "clientes_ativos": sum(1 for c in clientes if c.get("status") == "ativo"),
            "clientes_prospect": sum(1 for c in clientes if c.get("status") == "prospect"),
            "clientes_inativos": sum(1 for c in clientes if c.get("status") == "inativo"),
            "pedidos_total": len(pedidos),
            "pedidos_faturados": sum(1 for p in pedidos if p.get("status") in ("faturado", "faturado_parcial")),
            "pedidos_em_aberto": sum(1 for p in pedidos if p.get("status") in ("rascunho", "enviado", "aprovado")),
            "volume_vendas_total": round(sum(p.get("total", 0) for p in pedidos if p.get("status") in ("faturado", "faturado_parcial")), 2),
            "comissoes_a_receber": round(sum(c.get("saldo_pendente", 0) for c in comissoes if c.get("status") not in ("recebida", "aguardando_liquidez")), 2),
            "comissoes_recebidas": round(sum(c.get("valor_recebido", 0) for c in comissoes), 2),
            "contas_a_pagar_aberto": round(sum(a.get("valor", 0) for a in ap if a.get("status") == "aberto"), 2),
            "contas_a_receber_aberto": round(ar_aberto, 2),
        },
        "representadas": por_rep,
        "top_10_clientes": top_clientes,
        "clientes_sem_compra_30d_ou_mais": inativos,
    }
    return json.dumps(ctx, ensure_ascii=False, default=str)

@api.post("/max-ai/chat")
async def max_ai(body: ChatIn, current=Depends(get_current_user)):
    try: from groq import Groq
    except ImportError: return {"reply": "Módulo 'groq' não instalado.", "error": True}
    key = os.environ.get("GROQ_API_KEY")
    if not key: return {"reply": "GROQ_API_KEY não configurada.", "error": True}

    context = await _build_ai_context(current)
    system = (
        "Você é o MAX AI, assistente comercial do OMNIREPMAX. Responda SEMPRE em português do Brasil, de forma objetiva e profissional. "
        "Use R$ para valores, destaque números com **negrito** e organize em listas. NUNCA invente dados.\n\n"
        f"DADOS DO USUÁRIO (JSON):\n{context}"
    )
    msg_text = body.message.strip()
    if body.history:
        msg_text = "\n\n".join([f"[{h.get('role','user')}]: {h.get('content','')}" for h in body.history[-4:]]) + f"\n\n[user]: {msg_text}"
    try:
        c = Groq(api_key=key)
        r = c.chat.completions.create(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": msg_text}],
            model="openai/gpt-oss-120b"
        )
        return {"reply": r.choices[0].message.content}
    except Exception as e:
        return {"reply": f"Erro na Groq: {e}", "error": True}

@api.post("/insights/ai")
async def insights_ai(current=Depends(get_current_user)):
    try: from groq import Groq
    except ImportError: return {"insights": [], "erro": "Módulo 'groq' não instalado."}
    key = os.environ.get("GROQ_API_KEY")
    if not key: return {"insights": [], "erro": "GROQ_API_KEY não configurada."}
    ctx = await _build_ai_context(current)
    try:
        c = Groq(api_key=key)
        r = c.chat.completions.create(
            messages=[
                {"role": "system", "content": "Analista comercial. Retorne APENAS JSON array 4-6 objetos {tipo:'oportunidade|alerta|dica',titulo:'',descricao:''}."},
                {"role": "user", "content": f"Dados: {ctx}"}
            ],
            model="openai/gpt-oss-120b",
        )
        raw = r.choices[0].message.content
        m = re.search(r"\[.*\]", raw.strip(), re.S)
        return {"insights": json.loads(m.group(0)) if m else []}
    except Exception as e: return {"insights": [], "erro": str(e)}

# ------------------------------------------------------------
# Busca global / XML
# ------------------------------------------------------------
@api.get("/search")
async def global_search(q: str = Query(..., min_length=1), current=Depends(get_current_user)):
    q = q.strip()
    if not q: raise HTTPException(400, "Query vazia")
    ql = q.lower()
    def m(d, keys): return any(d.get(k) and ql in str(d.get(k)).lower() for k in keys)
    return {
        "clientes": [c for c in await t_list("clientes", current) if m(c, ["razao_social", "nome_fantasia", "cnpj_cpf", "cidade"])][:10],
        "produtos": [p for p in await t_list("produtos", current) if m(p, ["nome", "codigo", "sku", "ean", "marca"])][:10],
        "representadas": [r for r in await t_list("representadas", current) if m(r, ["razao_social", "nome_fantasia", "cnpj"])][:10],
        "pedidos": [p for p in await t_list("pedidos", current) if m(p, ["numero"])][:10],
    }

class XMLImportIn(BaseModel):
    xml_content: str
    filename: Optional[str] = ""
    create_pedido: bool = True
    representada_id: Optional[str] = None
    cliente_id: Optional[str] = None

def _only_digits(s: Optional[str]) -> str: return re.sub(r"\D", "", s or "")

def _parse_nfe(x: str) -> dict:
    x_clean = re.sub(r'xmlns(:\w+)?="[^"]+"', '', x)
    def f(pat, default=""):
        m = re.search(pat, x_clean, re.S | re.I)
        return m.group(1).strip() if m else default

    itens = []
    for m in re.finditer(r"<det[^>]*>(.*?)</det>", x_clean, re.S | re.I):
        seg = m.group(1)
        qtd = f(r"<qCom>(.*?)</qCom>", seg)
        preco = f(r"<vUnCom>(.*?)</vUnCom>", seg)
        total = f(r"<vProd>(.*?)</vProd>", seg)
        itens.append({
            "codigo": f(r"<cProd>(.*?)</cProd>", seg),
            "ean": f(r"<cEAN>(.*?)</cEAN>", seg),
            "nome": f(r"<xProd>(.*?)</xProd>", seg),
            "quantidade": float(qtd) if qtd else 0.0,
            "preco": float(preco) if preco else 0.0,
            "total": float(total) if total else 0.0,
        })

    tot = f(r"<vNF>(.*?)</vNF>", "0")
    return {
        "emitente": {"cnpj": f(r"<emit>.*?<CNPJ>(.*?)</CNPJ>"), "nome": f(r"<emit>.*?<xNome>(.*?)</xNome>")},
        "destinatario": {"cnpj": f(r"<dest>.*?<CNPJ>(.*?)</CNPJ>") or f(r"<dest>.*?<CPF>(.*?)</CPF>"),
                         "nome": f(r"<dest>.*?<xNome>(.*?)</xNome>")},
        "numero": f(r"<nNF>(.*?)</nNF>"), "serie": f(r"<serie>(.*?)</serie>"),
        "data_emissao": f(r"<dhEmi>(.*?)</dhEmi>"),
        "valor_total": float(tot) if tot else 0.0,
        "itens": itens,
    }

async def _match_or_create_pedido(current: dict, parsed: dict, representada_id: Optional[str], cliente_id: Optional[str]) -> dict:
    tid = tid_of(current)
    emit = _only_digits(parsed.get("emitente", {}).get("cnpj"))
    dest = _only_digits(parsed.get("destinatario", {}).get("cnpj"))
    reps = await t_list("representadas", current)
    clis = await t_list("clientes", current)

    rep = next((r for r in reps if r["id"] == representada_id), None) if representada_id else next((r for r in reps if _only_digits(r.get("cnpj")) == emit and emit), None)
    cli = next((c for c in clis if c["id"] == cliente_id), None) if cliente_id else next((c for c in clis if _only_digits(c.get("cnpj_cpf")) == dest and dest), None)

    res = {
        "representada_match": rep, "cliente_match": cli,
        "representada_sugestoes": [{"id": r["id"], "nome": r.get("nome_fantasia") or r.get("razao_social"), "cnpj": r.get("cnpj")} for r in reps],
        "cliente_sugestoes": [{"id": c["id"], "nome": c.get("nome_fantasia") or c.get("razao_social"), "cnpj": c.get("cnpj_cpf")} for c in clis],
        "pedido_criado": None, "pedido_erro": None,
    }
    if not rep or not cli:
        res["pedido_erro"] = "match_pendente"
        return res

    nf = parsed.get("numero")
    if nf:
        existing = await db.pedidos.find_one({"tenant_id": tid, "representada_id": rep["id"], "nf_numero": nf}, {"_id": 0})
        if existing:
            res["pedido_criado"] = existing
            res["pedido_erro"] = "duplicado_reutilizado"
            return res

    produtos = await t_list("produtos", current, {"representada_id": rep["id"]})
    itens = []
    for it in parsed.get("itens", []):
        ean = (it.get("ean") or "").strip()
        cod = (it.get("codigo") or "").strip()
        prod = next((p for p in produtos if ean and ean.lower() not in ("", "sem gtin") and (p.get("ean") or "").strip() == ean), None)
        if not prod and cod:
            prod = next((p for p in produtos if (p.get("codigo") or "").strip() == cod), None)
        if not prod:
            prod = await t_insert("produtos", current, {
                "nome": it.get("nome") or f"Produto {cod or ean}",
                "codigo": cod, "ean": ean, "sku": cod,
                "representada_id": rep["id"],
                "preco_tabela": it.get("preco", 0),
                "preco_sugerido": it.get("preco", 0),
                "custo": 0, "unidade": "UN", "qtd_por_caixa": 1, "status": "ativo",
                "marca": rep.get("nome_fantasia", ""),
            })
            produtos.append(prod)
        itens.append({
            "produto_id": prod["id"], "nome": prod.get("nome"),
            "quantidade": it.get("quantidade", 0),
            "preco_unitario": it.get("preco", 0),
            "desconto": 0.0, "subtotal": round(it.get("total", 0), 2)
        })

    comm = rep.get("comissao_padrao", 5.0)
    subtotal = sum(i["subtotal"] for i in itens)
    total = parsed.get("valor_total") or subtotal
    numero = await next_numero(tid, "PED", "pedidos")

    pedido = await t_insert("pedidos", current, {
        "numero": numero, "cliente_id": cli["id"], "representada_id": rep["id"],
        "condicao_pagamento": rep.get("prazo_pagamento") or "30 dias",
        "itens": itens, "subtotal": round(subtotal, 2),
        "desconto_geral": 0.0, "frete": 0.0, "total": round(total, 2),
        "comissao_percentual": comm,
        "comissao_valor": round(total * comm / 100.0, 2),
        "status": "faturado",
        "data_pedido": parsed.get("data_emissao") or iso(now_utc()),
        "observacoes": f"Importado de NF-e nº {parsed.get('numero')}",
        "nf_numero": parsed.get("numero"), "nf_serie": parsed.get("serie"),
    })

    await t_insert("faturamentos", current, {
        "pedido_id": pedido["id"], "nf_numero": parsed.get("numero"),
        "nf_serie": parsed.get("serie"),
        "data_faturamento": parsed.get("data_emissao") or iso(now_utc()),
        "valor_faturado": total,
    })

    valor_liquido = round(total * comm / 100.0, 2)
    modalidade = rep.get("modalidade_comissao", "faturamento")

    comissao = await t_insert("comissoes", current, {
        "pedido_id": pedido["id"], "pedido_numero": pedido["numero"],
        "cliente_id": cli["id"], "representada_id": rep["id"],
        "nf_numero": parsed.get("numero"),
        "valor_total_pedido": total, "valor_faturado": total,
        "percentual": comm, "valor_liquido": valor_liquido,
        "valor_recebido": 0.0, "saldo_pendente": valor_liquido,
        "modalidade": modalidade,
        "status": "pendente" if modalidade == "faturamento" else "aguardando_liquidez",
        "historico_recebimentos": [],
        "data_prevista": iso(now_utc() + timedelta(days=30)),
    })
    if modalidade == "faturamento":
        await gerar_parcelas_comissao(current, pedido, comissao)

    res["pedido_criado"] = pedido
    return res

@api.post("/xml/import")
async def import_xml(body: XMLImportIn, current=Depends(get_current_user)):
    if not body.xml_content or "<" not in body.xml_content:
        raise HTTPException(400, "Conteúdo XML inválido")
    parsed = _parse_nfe(body.xml_content)
    parsed["filename"] = body.filename
    if not parsed.get("numero") and not parsed.get("itens"):
        raise HTTPException(400, "Não foi possível identificar NF-e.")
    match_info = {}
    if body.create_pedido:
        try: match_info = await _match_or_create_pedido(current, parsed, body.representada_id, body.cliente_id)
        except Exception as e:
            logger.exception("falha ao criar pedido a partir do XML")
            match_info = {"pedido_erro": f"erro ao criar pedido: {e}"}
    historico = {**parsed, "pedido_id": (match_info.get("pedido_criado") or {}).get("id"),
                 "representada_id": (match_info.get("representada_match") or {}).get("id"),
                 "cliente_id": (match_info.get("cliente_match") or {}).get("id")}
    await t_insert("xml_files", current, historico)
    return {**parsed, **match_info}

@api.get("/xml/historico")
async def xml_historico(current=Depends(get_current_user)):
    return await t_list("xml_files", current)

# ------------------------------------------------------------
# Relatórios Avançados
# ------------------------------------------------------------
@api.get("/relatorios/geral")
async def relatorio_geral(current=Depends(get_current_user)):
    pedidos, reps, clientes, comissoes, ar, faturas, produtos, visitas = await asyncio.gather(
        t_list("pedidos", current), t_list("representadas", current), t_list("clientes", current),
        t_list("comissoes", current), t_list("contas_receber", current), t_list("faturamentos", current),
        t_list("produtos", current), t_list("visitas", current)
    )

    now = now_utc(); mes = now.month; ano = now.year

    faturados = [p for p in pedidos if p.get("status") in ("faturado", "faturado_parcial")]
    pendentes = [p for p in pedidos if p.get("status") in ("rascunho", "enviado", "aprovado")]

    fat_mes = sum(p.get("total", 0) for p in faturados if _in_month(p.get("data_pedido"), ano, mes))
    total_vendas = sum(p.get("total", 0) for p in faturados)
    ticket_medio = total_vendas / len(faturados) if faturados else 0

    tempos = []
    for f in faturas:
        ped = next((p for p in pedidos if p["id"] == f["pedido_id"]), None)
        if ped and f.get("data_faturamento") and ped.get("data_pedido"):
            d1 = _parse_date(ped["data_pedido"]); d2 = _parse_date(f["data_faturamento"])
            if d1 and d2: tempos.append((d2 - d1).days)
    tempo_medio = sum(tempos) / len(tempos) if tempos else 0

    com_prevista = sum(c.get("valor_liquido", 0) for c in comissoes)
    com_recebida = sum(c.get("valor_recebido", 0) for c in comissoes)
    com_a_receber = sum(c.get("saldo_pendente", 0) for c in comissoes if c.get("status") != "recebida")

    valor_pedido = sum(p.get("total", 0) for p in pedidos)
    valor_faturado = sum(f.get("valor_faturado", 0) for f in faturas)
    valor_recebido = sum(a.get("valor_recebido", 0) for a in ar)

    cli_fat = {}
    for p in faturados:
        cid = p.get("cliente_id")
        cli_fat[cid] = cli_fat.get(cid, 0) + p.get("total", 0)

    top_cli = sorted(cli_fat.items(), key=lambda x: -x[1])
    total_cli = sum(cli_fat.values())

    curva_a, curva_b, curva_c = [], [], []
    acum = 0
    for cid, valor in top_cli:
        acum += valor
        perc = (acum / total_cli * 100) if total_cli > 0 else 0
        obj = next((c for c in clientes if c["id"] == cid), {})
        nome = obj.get("nome_fantasia") or obj.get("razao_social", "Cliente")
        if perc <= 80: curva_a.append({"nome": nome, "valor": valor})
        elif perc <= 95: curva_b.append({"nome": nome, "valor": valor})
        else: curva_c.append({"nome": nome, "valor": valor})

    in30, in60, in90 = [], [], []
    for c in clientes:
        pc = [p for p in faturados if p.get("cliente_id") == c["id"]]
        nome = c.get("nome_fantasia") or c.get("razao_social")
        if not pc:
            in90.append(nome); continue
        ult = max((_parse_date(p.get("data_pedido")) or now for p in pc))
        dias = (now - ult).days
        if dias > 90: in90.append(nome)
        elif dias > 60: in60.append(nome)
        elif dias > 30: in30.append(nome)

    prod_vendas = {}
    for p in faturados:
        for it in p.get("itens", []):
            pid = it.get("produto_id")
            prod_vendas[pid] = prod_vendas.get(pid, {"nome": it.get("nome"), "qtd": 0, "valor": 0})
            prod_vendas[pid]["qtd"] += it.get("quantidade", 0)
            prod_vendas[pid]["valor"] += it.get("subtotal", 0)

    top_prods = sorted(prod_vendas.values(), key=lambda x: -x["valor"])[:10]
    sem_giro = [{"nome": p["nome"], "marca": p.get("marca"), "representada_id": p.get("representada_id")}
                for p in produtos if p["id"] not in prod_vendas]

    vis_re = [v for v in visitas if v.get("status") == "realizada"]
    cli_vis = len(set(v["cliente_id"] for v in vis_re))
    cli_pos = len(set(p["cliente_id"] for p in faturados))
    conv = (cli_pos / cli_vis * 100) if cli_vis > 0 else 0

    return {
        "comercial": {
            "fat_mes": fat_mes, "total_vendas": total_vendas, "ticket_medio": ticket_medio,
            "qtd_pedidos": len(pedidos), "qtd_pendentes": len(pendentes),
            "tempo_medio_faturamento_dias": round(tempo_medio, 1),
            "por_representada": [{"nome": r.get("nome_fantasia"),
                                  "valor": sum(p.get("total", 0) for p in faturados if p.get("representada_id") == r["id"])}
                                 for r in reps]
        },
        "financeiro": {
            "com_prevista": com_prevista, "com_recebida": com_recebida, "com_a_receber": com_a_receber,
            "valor_pedido": valor_pedido, "valor_faturado": valor_faturado, "valor_recebido": valor_recebido
        },
        "clientes": {
            "curva_abc": {"A": curva_a[:10], "B": curva_b[:10], "C": curva_c[:10]},
            "inativos": {"d30": in30, "d60": in60, "d90": in90}
        },
        "produtos": {"top_produtos": top_prods, "sem_giro": sem_giro[:10]},
        "produtividade": {"visitas": len(vis_re), "clientes_atendidos": cli_vis,
                          "clientes_positivados": cli_pos, "conversao": round(conv, 1)}
    }

# ------------------------------------------------------------
# Leads & Feedbacks
# ------------------------------------------------------------
@api.post("/feedback")
async def create_feedback(body: FeedBackIn, current=Depends(get_current_user)):
    await t_insert("feedbacks", current, {
        "user_id": current["id"],
        "user_email": current["email"],
        "user_name": current.get("name"),
        "tipo": body.tipo,
        "mensagem": body.mensagem,
        "nota": body.nota,
    })
    return {"ok": True, "message": "Feedback enviado com sucesso!"}
@api.get("/admin/feedbacks")
async def list_feedbacks(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(403, "Apenas administradores podem ver os feedbacks.")
    
    # Pega os 100 feedbacks mais recentes
    feedbacks = await db.feedbacks.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return feedbacks

@api.get("/leads")
async def get_leads(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(403, "Apenas administradores")
    return await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.get("/leads/export")
async def export_leads_csv(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(403, "Apenas administradores")
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Nome", "Email", "Empresa", "Telefone", "Plano", "Data Cadastro"])
    for l in leads:
        writer.writerow([l.get("name", ""), l.get("email", ""), l.get("empresa", ""),
                         l.get("telefone", ""), l.get("plan", ""), l.get("created_at", "")])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_omnirepmax.csv"}
    )

# ------------------------------------------------------------
# ✅ NOVA ROTA: Recálculo de comissões antigas (não apaga dados)
# ------------------------------------------------------------
@api.post("/admin/recalcular-comissoes")
async def recalcular_comissoes(current=Depends(get_current_user)):
    """
    Corrige comissões e contas a receber JÁ EXISTENTES com base nos dados atuais das representadas.
    Não apaga nada, apenas recalcula os valores.
    Use uma única vez após o deploy desta versão.
    """
    if current.get("role") != "admin":
        raise HTTPException(403, "Apenas administradores")
    tid = tid_of(current)

    reps = {r["id"]: r for r in await db.representadas.find({"tenant_id": tid}).to_list(500)}
    comissoes = await db.comissoes.find({"tenant_id": tid}).to_list(5000)

    total_corrigidas = 0
    detalhes = []

    for com in comissoes:
        rep = reps.get(com.get("representada_id"))
        if not rep:
            continue

        # Valor base: usa o valor faturado da comissão (ou o total do pedido se não tiver)
        valor_base = com.get("valor_faturado") or com.get("valor_total_pedido") or 0
        percentual = rep.get("comissao_padrao", 5.0)
        valor_liquido_correto = round(valor_base * percentual / 100.0, 2)

        valor_liquido_antigo = com.get("valor_liquido", 0)

        # Só corrige se a diferença for significativa (> 1 centavo)
        if abs(valor_liquido_correto - valor_liquido_antigo) < 0.01:
            continue

        # Calcula quanto já foi recebido (para recalcular o saldo)
        valor_recebido = com.get("valor_recebido", 0)
        novo_saldo = round(max(0.0, valor_liquido_correto - valor_recebido), 2)
        novo_status = "recebida" if novo_saldo <= 0.01 else (
            "parcialmente_recebida" if valor_recebido > 0 else com.get("status", "pendente")
        )

        # Atualiza a comissão
        await db.comissoes.update_one(
            {"id": com["id"], "tenant_id": tid},
            {"$set": {
                "valor_liquido": valor_liquido_correto,
                "saldo_pendente": novo_saldo,
                "status": novo_status,
                "percentual": percentual,
                "updated_at": iso(now_utc()),
            }}
        )

        # Corrige as parcelas no contas_receber deste comissao_id
        parcelas = await db.contas_receber.find(
            {"comissao_id": com["id"], "tenant_id": tid}
        ).sort("vencimento", 1).to_list(100)

        if parcelas:
            num = len(parcelas)
            valor_parcela = round(valor_liquido_correto / num, 2)
            diferenca = round(valor_liquido_correto - (valor_parcela * num), 2)

            for i, p in enumerate(parcelas):
                novo_valor = valor_parcela
                if i == num - 1:
                    novo_valor = round(novo_valor + diferenca, 2)

                valor_receb_parcela = p.get("valor_recebido", 0)
                saldo_parcela = round(max(0.0, novo_valor - valor_receb_parcela), 2)
                status_parcela = "recebido" if saldo_parcela <= 0.01 else "aberto"

                await db.contas_receber.update_one(
                    {"id": p["id"], "tenant_id": tid},
                    {"$set": {
                        "valor": novo_valor,
                        "saldo_pendente": saldo_parcela,
                        "status": status_parcela,
                        "updated_at": iso(now_utc()),
                    }}
                )

        total_corrigidas += 1
        detalhes.append({
            "pedido": com.get("pedido_numero"),
            "valor_antigo": valor_liquido_antigo,
            "valor_novo": valor_liquido_correto,
        })

    return {
        "ok": True,
        "total_corrigidas": total_corrigidas,
        "total_comissoes_verificadas": len(comissoes),
        "detalhes": detalhes[:20],  # mostra até 20 exemplos
    }

# ------------------------------------------------------------
# Backup Cron / Stripe / Reset
# ------------------------------------------------------------
async def _run_backup(run_id: str):
    if await db.backups.find_one({"run_id": run_id}): return
    snapshot = {"id": new_id(), "run_id": run_id, "created_at": iso(now_utc()), "collections": {}}
    total = 0
    for name in ["users", "representadas", "clientes", "produtos", "pedidos",
                 "oportunidades", "visitas", "comissoes", "contas_receber",
                 "contas_pagar", "xml_files", "documentos", "faturamentos"]:
        docs = [clean_doc(d) async for d in db[name].find({}, {"_id": 0})]
        if name == "users":
            for u in docs: u.pop("password_hash", None)
        snapshot["collections"][name] = docs; total += len(docs)
    snapshot["total_documents"] = total
    await db.backups.insert_one(snapshot)
    old = db.backups.find({}, {"id": 1, "created_at": 1}).sort("created_at", -1).skip(14)
    to_del = [d["id"] async for d in old if d.get("id")]
    if to_del: await db.backups.delete_many({"id": {"$in": to_del}})

@api.post("/cron/backup")
async def cron_backup(background: BackgroundTasks,
                      authorization: Optional[str] = Header(None),
                      x_webhook_id: Optional[str] = Header(None, alias="X-Webhook-Id")):
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    if not secret or not authorization or not authorization.startswith("Bearer ") or not hmac.compare_digest(authorization[7:], secret):
        raise HTTPException(401, "Unauthorized")
    run_id = x_webhook_id or new_id()
    if await db.backups.find_one({"run_id": run_id}):
        return {"status": "duplicate", "run_id": run_id}
    background.add_task(_run_backup_wrapper, run_id)
    return {"status": "accepted", "run_id": run_id}

async def _run_backup_wrapper(run_id: str):
    try: await _run_backup(run_id)
    except Exception as e: logger.error(f"Backup {run_id} falhou: {e}")

@api.get("/backups")
async def list_backups(current=Depends(get_current_user)):
    if current.get("role") != "admin": raise HTTPException(403, "Apenas administradores")
    return await db.backups.find({}, {"_id": 0, "collections": 0}).sort("created_at", -1).to_list(50)

@api.post("/backups/run")
async def run_backup_now(background: BackgroundTasks, current=Depends(get_current_user)):
    if current.get("role") != "admin": raise HTTPException(403, "Apenas administradores")
    run_id = new_id()
    background.add_task(_run_backup_wrapper, run_id)
    return {"status": "accepted", "run_id": run_id}

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

PLANS = [
    {"id": "solo", "name": "Solo", "lookup_key": "omnirepmax_solo_monthly", "price_brl": 69,
     "features": ["Até 2 representadas", "Clientes e produtos ilimitados", "Funil Kanban",
                  "Pedidos e comissões", "1 usuário", "Suporte por e-mail"]},
    {"id": "pro", "name": "Profissional", "lookup_key": "omnirepmax_pro_monthly", "price_brl": 99,
     "featured": True,
     "features": ["Representadas ilimitadas", "MAX AI ilimitado", "Importação XML NF-e",
                  "Contas a pagar/receber", "Até 5 usuários", "Backup diário automático", "Suporte prioritário"]},
    {"id": "equipe", "name": "Equipe", "lookup_key": "omnirepmax_equipe_monthly", "price_brl": 129,
     "features": ["Tudo do Profissional", "Usuários ilimitados", "Perfis Admin/Supervisor/Financeiro",
                  "Relatórios exportáveis", "API para integração", "Onboarding assistido", "Suporte por WhatsApp"]},
]

@api.get("/plans")
async def get_plans(): return {"plans": PLANS, "trial_days": 7}

@api.get("/subscriptions/me")
async def my_subscription(current=Depends(get_current_user)):
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password_hash": 0})
    now = now_utc()
    trial_ends = user.get("trial_ends_at")
    plan = user.get("plan", "trial")
    trial_days_left = None
    is_trial = plan == "trial" and bool(trial_ends)
    if trial_ends and is_trial:
        te = _parse_date(trial_ends)
        trial_days_left = max(0, (te - now).days) if te else 0
    return {"plan": plan, "subscription_status": user.get("subscription_status"),
            "trial_ends_at": trial_ends, "trial_days_left": trial_days_left,
            "is_trial": is_trial, "stripe_customer_id": user.get("stripe_customer_id"),
            "stripe_subscription_id": user.get("stripe_subscription_id")}

class CheckoutIn(BaseModel): lookup_key: str; origin_url: str

_TAX_MODE_CACHE: Dict[str, Optional[str]] = {"mode": None}
def _tax_mode() -> str:
    if _TAX_MODE_CACHE["mode"]: return _TAX_MODE_CACHE["mode"]
    try: country = (stripe.Account.retrieve().get("country") or "").upper()
    except Exception: country = ""
    smp = {"AU","AT","BE","BG","CA","HR","CY","CZ","DK","EE","FI","FR","DE","GI","GR","HK","HU","IE","IT","JP","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SG","SK","SI","ES","SE","CH","GB","US"}
    mode = "full" if country in smp else "calc_only"
    _TAX_MODE_CACHE["mode"] = mode
    return mode

@api.post("/payments/checkout")
async def create_checkout(req: CheckoutIn, current=Depends(get_current_user)):
    prices = stripe.Price.list(lookup_keys=[req.lookup_key], active=True, limit=1).data
    if not prices: raise HTTPException(400, f"Plano não encontrado: {req.lookup_key}")
    price = prices[0]
    plan_id = req.lookup_key.replace("omnirepmax_", "").replace("_monthly", "")
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": 1}],
        mode="subscription" if price.recurring else "payment",
        success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/planos",
        metadata={"user_id": current["id"], "tenant_id": tid_of(current),
                  "lookup_key": req.lookup_key, "plan_id": plan_id},
        customer_email=current["email"], allow_promotion_codes=True
    )
    mode = _tax_mode()
    try:
        if mode == "full": session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
        else: session = stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
    except stripe.error.InvalidRequestError as e:
        msg = (getattr(e, "user_message", "") or "").lower()
        if "managed payments" in msg or "ineligible" in msg or "tax" in msg:
            session = stripe.checkout.Session.create(**kwargs)
        else: raise HTTPException(400, str(e))
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": current["id"], "tenant_id": tid_of(current),
        "lookup_key": req.lookup_key, "plan_id": plan_id,
        "amount": (price.unit_amount or 0), "currency": price.currency,
        "status": "initiated", "payment_status": "pending",
        "created_at": iso(now_utc()), "updated_at": iso(now_utc())
    })
    return {"checkout_url": session.url, "session_id": session.id}

async def _mark_session_paid(session_id: str, obj: dict):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx or tx.get("payment_status") == "paid": return
    await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": "paid",
                  "stripe_subscription_id": obj.get("subscription"),
                  "stripe_payment_intent_id": obj.get("payment_intent"),
                  "stripe_customer_id": obj.get("customer"),
                  "updated_at": iso(now_utc())}}
    )
    user_id = tx.get("user_id") or (obj.get("metadata") or {}).get("user_id")
    plan_id = tx.get("plan_id") or (obj.get("metadata") or {}).get("plan_id")
    if plan_id not in {"solo", "pro", "equipe"}: plan_id = "pro"
    if user_id:
        await db.users.update_one({"id": user_id}, {"$set": {
            "plan": plan_id, "subscription_status": "active",
            "stripe_customer_id": obj.get("customer"),
            "stripe_subscription_id": obj.get("subscription"),
            "subscription_updated_at": iso(now_utc())
        }})

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, current=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": current["id"]}, {"_id": 0})
    if not tx: raise HTTPException(404, "Sessão não encontrada")
    if tx.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await _mark_session_paid(session_id, {"subscription": s.subscription, "payment_intent": s.payment_intent, "customer": s.customer, "metadata": s.metadata or {}})
                tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": current["id"]}, {"_id": 0})
        except stripe.error.StripeError: pass
    return {"session_id": tx["session_id"], "status": tx["status"],
            "payment_status": tx["payment_status"], "plan_id": tx.get("plan_id")}

@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET: raise HTTPException(500, "STRIPE_WEBHOOK_SECRET não configurado")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try: event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError: raise HTTPException(400, "Assinatura inválida")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed": await _mark_session_paid(obj["id"], obj)
    elif t == "checkout.session.async_payment_succeeded":
        await db.payment_transactions.update_one({"session_id": obj["id"]}, {"$set": {"payment_status": "paid", "updated_at": iso(now_utc())}})
    elif t == "checkout.session.async_payment_failed":
        await db.payment_transactions.update_one({"session_id": obj["id"]}, {"$set": {"status": "failed", "payment_status": "failed", "updated_at": iso(now_utc())}})
    elif t == "customer.subscription.deleted":
        await db.users.update_one({"stripe_subscription_id": obj.get("id")}, {"$set": {"subscription_status": "canceled", "plan": "canceled"}})
    return {"status": "ok"}

# ------------------------------------------------------------
# System Reset
# ------------------------------------------------------------
RESET_COLLECTIONS = ["clientes", "representadas", "produtos", "pedidos",
                     "oportunidades", "visitas", "comissoes", "contas_receber",
                     "contas_pagar", "xml_files", "documentos", "faturamentos",
                     "insights_ai", "max_ai_messages"]

class SystemResetIn(BaseModel):
    motivo: str; confirmacao: str

@api.get("/system/reset/preview")
async def system_reset_preview(current=Depends(get_current_user)):
    if current.get("role") != "admin": raise HTTPException(403, "Apenas administradores")
    tid = tid_of(current)
    counts = {}
    for col in RESET_COLLECTIONS:
        try: counts[col] = await db[col].count_documents({"tenant_id": tid})
        except Exception: counts[col] = 0
    return {"tenant_id": tid, "counts": counts, "total": sum(counts.values())}

@api.post("/system/reset")
async def system_reset(body: SystemResetIn, current=Depends(get_current_user)):
    if current.get("role") != "admin": raise HTTPException(403, "Apenas administradores")
    motivo = (body.motivo or "").strip()
    if len(motivo) < 10: raise HTTPException(400, "Informe um motivo com pelo menos 10 caracteres")
    if (body.confirmacao or "").strip().upper() != "RESETAR": raise HTTPException(400, "Confirmação inválida")
    tid = tid_of(current)
    deleted = {}; errors = []
    for col in RESET_COLLECTIONS:
        try:
            res = await db[col].delete_many({"tenant_id": tid})
            deleted[col] = int(res.deleted_count or 0)
        except Exception as e:
            errors.append({"collection": col, "error": str(e)}); deleted[col] = 0
    audit = {"id": new_id(), "tenant_id": tid, "user_id": current["id"],
             "user_email": current.get("email"), "action": "system_reset",
             "motivo": motivo, "scope": RESET_COLLECTIONS,
             "deleted_by_collection": deleted,
             "total_deleted": sum(deleted.values()),
             "status": "success" if not errors else "partial",
             "errors": errors, "started_at": iso(now_utc()),
             "finished_at": iso(now_utc())}
    try: await db.audit_log.insert_one(audit)
    except Exception: pass
    return {"status": audit["status"], "total_deleted": audit["total_deleted"],
            "deleted_by_collection": deleted, "errors": errors, "motivo": motivo}

@api.get("/system/reset/history")
async def system_reset_history(current=Depends(get_current_user), limit: int = 10):
    if current.get("role") != "admin": raise HTTPException(403, "Apenas administradores")
    tid = tid_of(current)
    cur = db.audit_log.find({"tenant_id": tid, "action": "system_reset"}).sort("finished_at", -1).limit(max(1, min(limit, 50)))
    out = []
    async for d in cur:
        d.pop("_id", None); out.append(d)
    return out

# ------------------------------------------------------------
# Startup / Shutdown
# ------------------------------------------------------------
app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=ALLOWED_ORIGINS,
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    try: await db.counters.create_index([("tenant_id", 1), ("name", 1)], unique=True)
    except Exception: pass
    try: await db.backups.create_index("run_id", unique=True, sparse=True)
    except Exception: pass
    for col in ["users", "representadas", "clientes", "produtos", "pedidos",
                "oportunidades", "visitas", "comissoes", "contas_receber",
                "contas_pagar", "xml_files", "documentos", "faturamentos"]:
        try: await db[col].create_index("id")
        except Exception: pass
        try: await db[col].create_index("tenant_id")
        except Exception: pass

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        uid = new_id()
        await db.users.insert_one({
            "id": uid, "tenant_id": uid, "email": admin_email,
            "password_hash": hash_pw(admin_password), "name": "Álvaro",
            "role": "admin", "plan": "pro", "created_at": iso(now_utc())
        })
        existing = await db.users.find_one({"email": admin_email})
    else:
        patch = {}
        if not verify_pw(admin_password, existing["password_hash"]):
            patch["password_hash"] = hash_pw(admin_password)
        if not existing.get("tenant_id"): patch["tenant_id"] = existing["id"]
        if existing.get("plan") != "pro": patch["plan"] = "pro"
        if existing.get("subscription_status") != "active": patch["subscription_status"] = "active"
        if existing.get("trial_ends_at"): patch["trial_ends_at"] = None
        if patch: await db.users.update_one({"email": admin_email}, {"$set": patch})
    admin_tid = (existing.get("tenant_id") or existing["id"])

    try:
        from seed import seed_demo
        await seed_demo(db)
    except ImportError: pass

    for col in ["representadas", "clientes", "produtos", "pedidos",
                "oportunidades", "visitas", "comissoes", "contas_receber",
                "contas_pagar", "xml_files", "documentos", "faturamentos"]:
        await db[col].update_many({"tenant_id": {"$exists": False}}, {"$set": {"tenant_id": admin_tid}})

@app.on_event("shutdown")
async def shutdown():
    client.close()