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
import time
import html
import secrets
import hashlib
import urllib.request
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pymongo.errors import DocumentTooLarge, DuplicateKeyError
from pydantic import BaseModel, Field, EmailStr
import stripe

# ------------------------------------------------------------
# Setup
# ------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

APP_ENV = os.environ.get('APP_ENV', 'prod')
IS_PROD = APP_ENV == 'prod'

# ✅ SEGURANÇA: sem segredo padrão em produção. Se faltar, o servidor NÃO sobe.
JWT_SECRET = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET or JWT_SECRET == 'change-me':
    if IS_PROD:
        raise RuntimeError(
            "JWT_SECRET não definido. Gere um com: python -c \"import secrets; print(secrets.token_urlsafe(48))\" "
            "e configure no Render antes de subir."
        )
    JWT_SECRET = 'dev-only-insecure-secret-nao-use-em-producao'
JWT_ALGO = 'HS256'
MAX_LOGO = 700_000

# ✅ Superadmin = dono da plataforma (vê leads, feedbacks e backups de TODOS os tenants).
# Diferente do "admin" de cada empresa cliente, que só enxerga o próprio tenant.
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '').strip().lower()
SUPERADMIN_EMAILS = {e.strip().lower() for e in os.environ.get('SUPERADMIN_EMAILS', '').split(',') if e.strip()}
if ADMIN_EMAIL:
    SUPERADMIN_EMAILS.add(ADMIN_EMAIL)

# ✅ E-mail transacional (Resend)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://www.omnirepmax.com.br').rstrip('/')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'OmniRepMax <nao-responda@omnirepmax.com.br>')

# ✅ CORS: domínios de produção SEMPRE liberados; a env ALLOWED_ORIGINS soma (não substitui).
# rstrip("/") evita erro clássico de "https://site.com.br/" na variável de ambiente.
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://omnirepmax.com.br",
    "https://www.omnirepmax.com.br",
]
ALLOWED_ORIGINS = sorted({
    o.strip().rstrip("/")
    for o in DEFAULT_ORIGINS + os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
})

app = FastAPI(
    title="OMNIREPMAX API", version="2.5.0",
    # ✅ Em produção não publica o mapa completo da API
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None,
    openapi_url=None if IS_PROD else "/openapi.json",
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("Cache-Control", "no-store")
    if IS_PROD:
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return resp
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omnirepmax")
logger.info(f"CORS liberado para: {ALLOWED_ORIGINS}")
if IS_PROD and not RESEND_API_KEY:
    logger.warning("RESEND_API_KEY não definido: e-mails de senha e verificação NÃO serão enviados.")
if IS_PROD and not SUPERADMIN_EMAILS:
    logger.warning("Nenhum superadmin configurado (ADMIN_EMAIL/SUPERADMIN_EMAILS): painel de leads ficará inacessível.")

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
        "iat": now_utc(),
        "exp": now_utc() + timedelta(days=7), "type": "access"
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def clean_doc(doc: dict) -> dict:
    if doc and "_id" in doc: doc.pop("_id", None)
    return doc

def tid_of(current: dict) -> str:
    return current.get("tenant_id") or current["id"]

# ------------------------------------------------------------
# ✅ Superadmin (dono da plataforma)
# ------------------------------------------------------------
def is_superadmin(user: dict) -> bool:
    return (user.get("email") or "").lower() in SUPERADMIN_EMAILS

def require_superadmin(current: dict):
    if not is_superadmin(current):
        raise HTTPException(403, "Acesso restrito à administração da plataforma.")

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

# ------------------------------------------------------------
# ✅ Rate limit em memória (1 instância no Render). Com várias instâncias, trocar por Redis.
# ------------------------------------------------------------
_RL_BUCKETS: Dict[str, deque] = defaultdict(deque)

def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"

def _rl_prune(q: deque, window: int, now: float):
    while q and now - q[0] > window:
        q.popleft()

def _rl_check(key: str, limit: int, window: int):
    """Levanta 429 se `key` já atingiu `limit` eventos na janela (segundos). Não registra."""
    now = time.monotonic()
    q = _RL_BUCKETS[key]
    _rl_prune(q, window, now)
    if len(q) >= limit:
        retry = int(window - (now - q[0])) + 1
        raise HTTPException(429, f"Muitas tentativas. Tente novamente em {retry}s.", headers={"Retry-After": str(retry)})

def _rl_add(key: str):
    _RL_BUCKETS[key].append(time.monotonic())
    if len(_RL_BUCKETS) > 20_000:  # evita crescer sem limite
        for k in [k for k, q in _RL_BUCKETS.items() if not q][:10_000]:
            _RL_BUCKETS.pop(k, None)

def _rl_hit(key: str, limit: int, window: int):
    _rl_check(key, limit, window)
    _rl_add(key)

# ------------------------------------------------------------
# ✅ E-mail transacional via Resend (stdlib, sem dependência nova)
# ------------------------------------------------------------
def _send_email_sync(to: str, subject: str, html_body: str) -> bool:
    if not RESEND_API_KEY:
        logger.error(f"E-mail NÃO enviado para {to} (RESEND_API_KEY ausente): {subject}")
        return False
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps({"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html_body}).encode(),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "omnirepmax-api/2.3",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            ok = 200 <= r.status < 300
            if not ok:
                logger.error(f"Resend respondeu {r.status} para {to}")
            return ok
    except Exception as e:
        logger.error(f"Falha ao enviar e-mail para {to}: {e}")
        return False

async def send_email(to: str, subject: str, html_body: str) -> bool:
    return await asyncio.to_thread(_send_email_sync, to, subject, html_body)

def _email_layout(titulo: str, paragrafos: List[str], cta_label: str, cta_url: str, rodape: str = "") -> str:
    corpo = "".join(f'<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6">{p}</p>' for p in paragrafos)
    return f"""<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>
<div style="font-size:20px;font-weight:bold;color:#0f172a;margin-bottom:4px">OMNIREP<span style="color:#075BFF">MAX</span></div>
<h1 style="font-size:20px;color:#0f172a;margin:24px 0 16px">{html.escape(titulo)}</h1>
{corpo}
<p style="margin:24px 0"><a href="{html.escape(cta_url, quote=True)}" style="background:#075BFF;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block">{html.escape(cta_label)}</a></p>
<p style="margin:0;color:#64748b;font-size:12px;line-height:1.5">Se o botão não funcionar, copie este link no navegador:<br><span style="word-break:break-all">{html.escape(cta_url)}</span></p>
{f'<p style="margin:16px 0 0;color:#64748b;font-size:12px">{rodape}</p>' if rodape else ''}
</td></tr></table></td></tr></table></body></html>"""

async def _enviar_verificacao(user: dict) -> None:
    token = secrets.token_urlsafe(32)
    await db.email_verifications.update_many({"user_id": user["id"], "used": False}, {"$set": {"used": True}})
    await db.email_verifications.insert_one({
        "token_hash": _hash_token(token), "user_id": user["id"],
        "expires_at": iso(now_utc() + timedelta(hours=48)), "used": False,
        "created_at": iso(now_utc()),
    })
    link = f"{FRONTEND_URL}/verificar-email?token={token}"
    nome = html.escape(user.get("name") or "")
    await send_email(user["email"], "Confirme seu e-mail no OmniRepMax", _email_layout(
        "Confirme seu e-mail",
        [f"Olá{', ' + nome if nome else ''}! Seu teste grátis de 7 dias no OmniRepMax já começou.",
         "Confirme seu e-mail para garantir que você vai receber avisos de senha e de cobrança."],
        "Confirmar e-mail", link,
        "O link vale por 48 horas. Se você não criou esta conta, ignore este e-mail.",
    ))

def _parse_date(s):
    if not s: return None
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        if d.tzinfo is None: d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception: return None

# ✅ NOVO: conversão numérica tolerante (aceita "1.234,56", "1234.56", None, strings vazias)
def _to_float(v, default: float = 0.0) -> float:
    if v is None or v == "": return default
    if isinstance(v, bool): return default
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip()
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try: return float(s)
    except ValueError: return default

# ✅ NOVO: rateio de um total por pesos, com ajuste de centavos na última parcela.
# Se algum peso for <= 0 (ou todos ausentes), divide em partes iguais.
def _ratear(total: float, pesos: List[float]) -> List[float]:
    n = len(pesos)
    if n == 0: return []
    soma = sum(pesos)
    if soma > 0 and all(w > 0 for w in pesos):
        vals = [round(total * w / soma, 2) for w in pesos]
    else:
        v = round(total / n, 2)
        vals = [v] * n
    vals[-1] = round(vals[-1] + round(total - sum(vals), 2), 2)
    return vals

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

    # ✅ PERF: não carrega o logo (base64 de até 700 KB) em toda requisição
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0, "logo": 0})
    if not user: raise HTTPException(401, "Usuário não encontrado")

    # ✅ Sessões emitidas antes da última troca de senha deixam de valer
    pwd_changed = _parse_date(user.get("password_changed_at"))
    iat = payload.get("iat")
    if pwd_changed and iat is not None and int(iat) < int(pwd_changed.timestamp()):
        raise HTTPException(401, "Sessão expirada. Faça login novamente.")

    user["tenant_id"] = user.get("tenant_id") or user["id"]
    user["is_superadmin"] = is_superadmin(user)
    return user

# ------------------------------------------------------------
# ✅ ASSINATURA: planos, limites e controle de acesso
# ------------------------------------------------------------
# Preços precisam ser IGUAIS aos cadastrados no Stripe (lookup_key de cada preço mensal).
PLANS = [
    {"id": "solo", "name": "Solo", "lookup_key": "omnirepmax_solo_monthly", "price_brl": 39,
     "descricao": "Para quem está começando.",
     "features": ["Até 2 representadas", "Clientes e produtos ilimitados", "Funil Kanban e agenda",
                  "Pedidos, faturamento e comissões", "Contas a pagar e a receber", "Suporte por e-mail"]},
    {"id": "pro", "name": "Profissional", "lookup_key": "omnirepmax_pro_monthly", "price_brl": 69,
     "featured": True, "descricao": "Para representações em crescimento.",
     "features": ["Tudo do Solo", "Representadas ilimitadas", "MAX AI — assistente com IA",
                  "Importação de XML da NF-e", "Suporte prioritário"]},
    {"id": "equipe", "name": "Equipe", "lookup_key": "omnirepmax_equipe_monthly", "price_brl": 99,
     "descricao": "Para operações maiores.",
     "features": ["Tudo do Profissional", "Onboarding assistido", "Suporte por WhatsApp",
                  "Múltiplos usuários e perfis (em breve)"]},
]
PLANOS_PAGOS = {p["id"] for p in PLANS}
# Status do Stripe que liberam uso. past_due = cartão recusado, Stripe ainda está tentando cobrar.
# "cortesia" = liberado manualmente pelo superadmin (pilotos, parceiros).
STATUS_OK = {"active", "trialing", "past_due", "cortesia"}

# None = ilimitado
PLAN_LIMITS = {
    "trial":  {"representadas": None, "max_ai": True,  "xml": True},   # teste = experimenta tudo
    "solo":   {"representadas": 2,    "max_ai": False, "xml": False},
    "pro":    {"representadas": None, "max_ai": True,  "xml": True},
    "equipe": {"representadas": None, "max_ai": True,  "xml": True},
}

def _plano_por_lookup(lookup_key: Optional[str]) -> Optional[str]:
    return next((p["id"] for p in PLANS if p["lookup_key"] == lookup_key), None)

async def _conta_dona(user: dict) -> dict:
    """A assinatura pertence ao dono do tenant (hoje 1 usuário = 1 tenant)."""
    tid = user.get("tenant_id")
    if tid and tid != user.get("id"):
        dono = await db.users.find_one({"id": tid}, {"_id": 0, "password_hash": 0, "logo": 0})
        if dono:
            return dono
    return user

def _situacao_assinatura(conta: dict, user: Optional[dict] = None) -> dict:
    if user is not None and is_superadmin(user):
        return {"acesso": "ativo", "plano": "pro", "status": "superadmin"}
    now = now_utc()
    plan = conta.get("plan") or "trial"
    status = conta.get("subscription_status")
    if status == "cortesia":
        ate = _parse_date(conta.get("cortesia_ate"))
        if ate and ate < now:
            return {"acesso": "somente_leitura", "plano": plan, "status": status, "motivo": "assinatura_inativa"}
    if plan in PLANOS_PAGOS and status in STATUS_OK:
        return {"acesso": "ativo", "plano": plan, "status": status,
                "aviso": "pagamento_pendente" if status == "past_due" else None}
    if plan == "trial":
        te = _parse_date(conta.get("trial_ends_at"))
        if te is None:  # conta antiga sem data de trial: 7 dias a partir do cadastro
            criado = _parse_date(conta.get("created_at")) or now
            te = criado + timedelta(days=7)
        if te > now:
            dias = int((te - now).total_seconds() // 86400) + 1
            return {"acesso": "ativo", "plano": "trial", "status": "trial", "dias_restantes": dias}
        return {"acesso": "somente_leitura", "plano": "trial", "status": "trial", "motivo": "trial_expirado"}
    return {"acesso": "somente_leitura", "plano": plan, "status": status, "motivo": "assinatura_inativa"}

MSG_BLOQUEIO = {
    "trial_expirado": "Seu período de teste terminou. Você ainda pode consultar e exportar seus dados; "
                      "para voltar a cadastrar e editar, escolha um plano em Planos.",
    "assinatura_inativa": "Sua assinatura está inativa. Você ainda pode consultar e exportar seus dados; "
                          "para voltar a cadastrar e editar, reative em Planos.",
}

async def get_active_user(request: Request, current=Depends(get_current_user)) -> dict:
    """Auth + assinatura. Sem assinatura ativa a conta fica SOMENTE LEITURA:
    GET continua liberado (consultar/exportar dados), escrita retorna 402."""
    conta = await _conta_dona(current)
    sit = _situacao_assinatura(conta, current)
    current["assinatura"] = sit
    if sit["acesso"] != "ativo" and request.method not in ("GET", "HEAD", "OPTIONS"):
        raise HTTPException(402, MSG_BLOQUEIO.get(sit.get("motivo"), MSG_BLOQUEIO["assinatura_inativa"]))
    return current

def _limites(current: dict) -> dict:
    plano = (current.get("assinatura") or {}).get("plano") or "trial"
    return PLAN_LIMITS.get(plano, PLAN_LIMITS["solo"])

def require_feature(current: dict, feature: str, nome: str):
    if not _limites(current).get(feature):
        raise HTTPException(402, f"{nome} está disponível a partir do plano Profissional. Faça upgrade em Planos.")

# Campos grandes (base64) que só a tela de cadastro precisa
CAMPOS_PESADOS = {"logo": 0, "imagem": 0, "arquivo_base64": 0}

async def t_list(name: str, current: dict, filters: Optional[dict] = None, sort_key: str = "created_at",
                 limit: int = 1000, leve: bool = False):
    q: Dict[str, Any] = {"tenant_id": tid_of(current)}
    if filters: q.update(filters)
    proj = {"_id": 0, **CAMPOS_PESADOS} if leve else {"_id": 0}
    cursor = db[name].find(q, proj).sort(sort_key, -1).limit(limit)
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

# ✅ NOVO: Helper de auditoria padronizada
async def _log_auditoria(
    current: dict,
    action: str,
    entity: str,
    entity_id: str,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    extra: Optional[dict] = None,
):
    """Registra uma entrada padronizada no audit_log.
    Não lança exceção em caso de falha para não quebrar a operação principal."""
    try:
        entry = {
            "id": new_id(),
            "tenant_id": tid_of(current),
            "user_id": current["id"],
            "user_email": current.get("email"),
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "before": before,
            "after": after,
            "extra": extra or {},
            "created_at": iso(now_utc()),
        }
        await db.audit_log.insert_one(entry)
        return entry
    except Exception as e:
        logger.error(f"Falha ao registrar auditoria: {e}")
        return None

# ✅ NOVO: Regra de comissão vigente em uma data de referência (fato gerador)
async def comissao_vigente_em(tid: str, representada_id: str, data_ref_iso: Optional[str]) -> dict:
    """
    Retorna a regra de comissão vigente na data informada (fato gerador).
    Usa a coleção regras_comissao; se não houver histórico, cai no valor atual
    da representada (retrocompatível com tenants que ainda não migraram).

    Regras de comparação:
      - vigencia_inicio <= data_ref  (inclusivo no início)
      - vigencia_fim é None OU > data_ref (exclusivo no fim, pois o fim
        coincide com o início da próxima vigência)
    """
    d = _parse_date(data_ref_iso) or now_utc()
    d_iso = iso(d)
    regra = await db.regras_comissao.find_one(
        {
            "tenant_id": tid,
            "representada_id": representada_id,
            "vigencia_inicio": {"$lte": d_iso},
            "$or": [
                {"vigencia_fim": None},
                {"vigencia_fim": {"$gt": d_iso}},
            ],
        },
        {"_id": 0},
        sort=[("vigencia_inicio", -1)],
    )
    if regra:
        return regra
    rep = await db.representadas.find_one(
        {"id": representada_id, "tenant_id": tid}, {"_id": 0}
    )
    return rep or {
        "comissao_padrao": 5.0,
        "base_calculo_comissao": "faturado",
        "modalidade_comissao": "faturamento",
    }

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
    tamanho_operacao: Optional[str] = "solo"
    controle_atual: Optional[str] = "planilha"

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

class RegraComissaoIn(BaseModel):
    representada_id: str
    comissao_padrao: float
    base_calculo_comissao: str
    modalidade_comissao: str
    vigencia_inicio: str
    vigencia_fim: Optional[str] = None
    observacoes: Optional[str] = ""

# ✅ NOVO: Modelo de recebíveis da indústria (item 10 do Prompt Mestre)
class RecebivelIndustriaIn(BaseModel):
    representada_id: str
    cliente_id: str
    pedido_id: Optional[str] = ""
    faturamento_id: Optional[str] = ""
    numero_documento: Optional[str] = ""
    valor: float
    vencimento: str
    data_recebimento: Optional[str] = ""
    status: str = "aberto"
    forma_pagamento: Optional[str] = ""
    observacoes: Optional[str] = ""

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
async def signup(body: SignupIn, response: Response, request: Request, background: BackgroundTasks):
    _rl_hit(f"signup:ip:{_client_ip(request)}", 5, 3600)
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
        "role": "admin",  # admin do PRÓPRIO tenant (não é superadmin)
        "plan": "trial",
        "trial_ends_at": iso(now_utc() + timedelta(days=7)),
        "email_verified": False,
        "password_hash": hash_pw(body.password),
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user)
    background.add_task(_enviar_verificacao, {k: user[k] for k in ("id", "email", "name")})

    await db.leads.insert_one({
        "name": body.name,
        "email": email,
        "tamanho_operacao": body.tamanho_operacao,
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
async def login(body: LoginIn, response: Response, request: Request):
    email = body.email.lower()
    ip = _client_ip(request)
    # ✅ Limites: 20 tentativas/5 min por IP; 5 FALHAS/15 min por e-mail
    _rl_hit(f"login:ip:{ip}", 20, 300)
    _rl_check(f"login:fail:{email}", 5, 900)
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        _rl_add(f"login:fail:{email}")
        raise HTTPException(401, "Credenciais inválidas")
    token = make_token(user)
    set_cookies(response, token)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_at": iso(now_utc())}})
    user = clean_doc(user); user.pop("password_hash", None)
    user["tenant_id"] = user.get("tenant_id") or user["id"]
    user["is_superadmin"] = is_superadmin(user)
    return {"user": user, "token": token}

@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    extra = await db.users.find_one({"id": current["id"]}, {"_id": 0, "logo": 1})
    return {**current, "logo": (extra or {}).get("logo")}

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
    response.delete_cookie(
        key="access_token",
        path="/",
        secure=IS_PROD,
        samesite="none" if IS_PROD else "lax",
        httponly=True
    )
    return {"ok": True}

@api.post("/auth/forgot-password")
async def forgot(body: dict, request: Request, background: BackgroundTasks):
    msg = {"ok": True, "message": "Se o e-mail existir, instruções foram enviadas."}
    _rl_hit(f"forgot:ip:{_client_ip(request)}", 5, 3600)
    email = (body.get("email") or "").strip().lower()
    if not email:
        return msg
    _rl_hit(f"forgot:email:{email}", 3, 3600)
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1, "email": 1, "name": 1})
    if not user:
        return msg

    # ✅ token forte, guardado só como hash; tokens anteriores são invalidados
    token = secrets.token_urlsafe(32)
    await db.password_resets.update_many({"user_id": user["id"], "used": False}, {"$set": {"used": True}})
    await db.password_resets.insert_one({
        "token_hash": _hash_token(token), "user_id": user["id"],
        "expires_at": iso(now_utc() + timedelta(hours=1)), "used": False,
        "created_at": iso(now_utc()),
    })
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    background.add_task(send_email, user["email"], "Redefinição de senha — OmniRepMax", _email_layout(
        "Redefinir sua senha",
        ["Recebemos um pedido para redefinir a senha da sua conta no OmniRepMax.",
         "Clique no botão abaixo para criar uma nova senha."],
        "Criar nova senha", link,
        "O link vale por 1 hora. Se você não pediu a troca, ignore este e-mail — sua senha continua a mesma.",
    ))
    if not IS_PROD:
        return {**msg, "token": token, "dev_link": link}
    return msg

@api.post("/auth/reset-password")
async def reset_pw(body: dict, request: Request):
    _rl_hit(f"reset:ip:{_client_ip(request)}", 10, 3600)
    token = body.get("token"); new_password = body.get("password")
    if not token or not new_password or len(new_password) < 8:
        raise HTTPException(400, "Senha inválida")
    rec = await db.password_resets.find_one({"token_hash": _hash_token(token), "used": False})
    if not rec: raise HTTPException(400, "Token inválido")
    exp = _parse_date(rec.get("expires_at"))
    if not exp or exp < now_utc(): raise HTTPException(400, "Token expirado")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {
        "password_hash": hash_pw(new_password),
        "password_changed_at": iso(now_utc()),  # derruba sessões antigas
    }})
    await db.password_resets.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"ok": True}

# ✅ NOVO: verificação de e-mail
@api.post("/auth/verify-email")
async def verify_email(body: dict, request: Request):
    _rl_hit(f"verify:ip:{_client_ip(request)}", 20, 3600)
    token = (body.get("token") or "").strip()
    if not token: raise HTTPException(400, "Token inválido")
    rec = await db.email_verifications.find_one({"token_hash": _hash_token(token), "used": False})
    if not rec: raise HTTPException(400, "Link inválido ou já utilizado")
    exp = _parse_date(rec.get("expires_at"))
    if not exp or exp < now_utc(): raise HTTPException(400, "Link expirado. Peça um novo no sistema.")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"email_verified": True, "email_verified_at": iso(now_utc())}})
    await db.email_verifications.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"ok": True}

@api.post("/auth/resend-verification")
async def resend_verification(background: BackgroundTasks, current=Depends(get_current_user)):
    if current.get("email_verified"):
        return {"ok": True, "message": "E-mail já confirmado."}
    _rl_hit(f"resendverif:{current['id']}", 3, 3600)
    background.add_task(_enviar_verificacao, {k: current.get(k) for k in ("id", "email", "name")})
    return {"ok": True, "message": "Enviamos um novo link de confirmação."}

# ------------------------------------------------------------
# Representadas & Documentos
# ------------------------------------------------------------
@api.get("/representadas")
async def get_representadas(current=Depends(get_active_user)):
    return await t_list("representadas", current)

@api.post("/representadas")
async def create_representada(body: RepresentadaIn, current=Depends(get_active_user)):
    lim = _limites(current)["representadas"]
    if lim is not None:
        n = await db.representadas.count_documents({"tenant_id": tid_of(current)})
        if n >= lim:
            raise HTTPException(402, f"Seu plano permite até {lim} representadas. Faça upgrade para o Profissional em Planos.")
    data = body.model_dump()
    if data.get("logo") and len(data["logo"]) > MAX_LOGO:
        raise HTTPException(413, "Logo muito grande.")
    return await t_insert("representadas", current, data)

@api.put("/representadas/{rid}")
async def update_representada(rid: str, body: RepresentadaIn, current=Depends(get_active_user)):
    data = body.model_dump()
    if data.get("logo") and len(data["logo"]) > MAX_LOGO:
        raise HTTPException(413, "Logo muito grande.")
    return await t_update("representadas", current, rid, data)

@api.delete("/representadas/{rid}")
async def del_representada(rid: str, current=Depends(get_active_user)):
    tid = tid_of(current)
    has_pedidos = await db.pedidos.count_documents({"representada_id": rid, "tenant_id": tid})
    if has_pedidos > 0:
        raise HTTPException(400, f"Não é possível excluir. Existem {has_pedidos} pedidos vinculados.")
    return await t_delete("representadas", current, rid)

@api.post("/representadas/{rid}/documentos")
async def upload_documento(rid: str, body: DocumentoIn, current=Depends(get_active_user)):
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
async def get_documentos(rid: str, current=Depends(get_active_user)):
    docs = await db.documentos.find(
        {"tenant_id": tid_of(current), "representada_id": rid},
        {"arquivo_base64": 0, "_id": 0}
    ).to_list(100)
    return docs

@api.get("/documentos/{doc_id}/download")
async def download_documento(doc_id: str, current=Depends(get_active_user)):
    doc = await db.documentos.find_one({"id": doc_id, "tenant_id": tid_of(current)})
    if not doc: raise HTTPException(404, "Documento não encontrado")
    return {"nome": doc["nome"], "arquivo_base64": doc["arquivo_base64"]}

@api.delete("/documentos/{doc_id}")
async def del_documento(doc_id: str, current=Depends(get_active_user)):
    res = await db.documentos.delete_one({"id": doc_id, "tenant_id": tid_of(current)})
    if res.deleted_count == 0: raise HTTPException(404, "Documento não encontrado")
    return {"ok": True}

# ------------------------------------------------------------
# Histórico de vigência das regras de comissão
# ------------------------------------------------------------
@api.get("/representadas/{rid}/regras-comissao")
async def listar_regras_comissao(rid: str, current=Depends(get_active_user)):
    tid = tid_of(current)
    rep = await db.representadas.find_one({"id": rid, "tenant_id": tid})
    if not rep:
        raise HTTPException(404, "Representada não encontrada")
    regras = await db.regras_comissao.find(
        {"tenant_id": tid, "representada_id": rid},
        {"_id": 0}
    ).sort("vigencia_inicio", -1).to_list(100)
    return regras

@api.post("/representadas/{rid}/regras-comissao")
async def criar_regra_comissao(rid: str, body: RegraComissaoIn, current=Depends(get_active_user)):
    tid = tid_of(current)
    rep = await db.representadas.find_one({"id": rid, "tenant_id": tid})
    if not rep:
        raise HTTPException(404, "Representada não encontrada")

    now_iso = iso(now_utc())
    await db.regras_comissao.update_many(
        {"tenant_id": tid, "representada_id": rid, "vigencia_fim": None},
        {"$set": {"vigencia_fim": body.vigencia_inicio}}
    )

    nova = {
        "id": new_id(),
        "tenant_id": tid,
        "representada_id": rid,
        "comissao_padrao": body.comissao_padrao,
        "base_calculo_comissao": body.base_calculo_comissao,
        "modalidade_comissao": body.modalidade_comissao,
        "vigencia_inicio": body.vigencia_inicio,
        "vigencia_fim": body.vigencia_fim,
        "observacoes": body.observacoes or "",
        "created_at": now_iso,
        "created_by": current["id"],
    }
    await db.regras_comissao.insert_one(nova)

    await db.representadas.update_one(
        {"id": rid, "tenant_id": tid},
        {"$set": {
            "comissao_padrao": body.comissao_padrao,
            "base_calculo_comissao": body.base_calculo_comissao,
            "modalidade_comissao": body.modalidade_comissao,
            "updated_at": now_iso,
        }}
    )

    # ✅ NOVO: usa o helper padronizado (mantém compatibilidade com o formato antigo)
    await _log_auditoria(
        current, "regra_comissao_criada", "regras_comissao", nova["id"],
        after=nova, extra={"representada_id": rid},
    )
    await db.audit_log.insert_one({
        "id": new_id(),
        "tenant_id": tid,
        "user_id": current["id"],
        "user_email": current.get("email"),
        "action": "regra_comissao_criada",
        "representada_id": rid,
        "payload": nova,
        "created_at": now_iso,
    })

    return {"ok": True, "id": nova["id"]}

# ------------------------------------------------------------
# Clientes
# ------------------------------------------------------------
@api.get("/clientes")
async def get_clientes(status: Optional[str] = None, representada_id: Optional[str] = None, current=Depends(get_active_user)):
    f: Dict[str, Any] = {}
    if status: f["status"] = status
    if representada_id: f["representadas"] = representada_id
    return await t_list("clientes", current, f)

@api.post("/clientes")
async def create_cliente(body: ClienteIn, current=Depends(get_active_user)):
    return await t_insert("clientes", current, body.model_dump())

@api.put("/clientes/{cid}")
async def update_cliente(cid: str, body: ClienteIn, current=Depends(get_active_user)):
    return await t_update("clientes", current, cid, body.model_dump())

@api.delete("/clientes/{cid}")
async def del_cliente(cid: str, current=Depends(get_active_user)):
    tid = tid_of(current)
    has_pedidos = await db.pedidos.count_documents({"cliente_id": cid, "tenant_id": tid})
    if has_pedidos > 0:
        raise HTTPException(400, f"Não é possível excluir. Existem {has_pedidos} pedidos vinculados.")
    return await t_delete("clientes", current, cid)

# ------------------------------------------------------------
# Produtos
# ------------------------------------------------------------
@api.get("/produtos")
async def get_produtos(representada_id: Optional[str] = None, categoria: Optional[str] = None, current=Depends(get_active_user)):
    f: Dict[str, Any] = {}
    if representada_id: f["representada_id"] = representada_id
    if categoria: f["categoria"] = categoria
    return await t_list("produtos", current, f)

@api.post("/produtos")
async def create_produto(body: ProdutoIn, current=Depends(get_active_user)):
    return await t_insert("produtos", current, body.model_dump())

@api.put("/produtos/{pid}")
async def update_produto(pid: str, body: ProdutoIn, current=Depends(get_active_user)):
    return await t_update("produtos", current, pid, body.model_dump())

@api.delete("/produtos/{pid}")
async def del_produto(pid: str, current=Depends(get_active_user)):
    return await t_delete("produtos", current, pid)

@api.post("/produtos/import-txt")
async def import_txt(body: TXTImportIn, current=Depends(get_active_user)):
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

# ✅ NOVO: monta as parcelas de comissão sem mutar a entrada
def _calcular_parcelas_comissao(parcelas_in: Optional[List[dict]], valor_liquido: float) -> List[dict]:
    """
    - Duplicatas da NF-e (todas com `valor_base` > 0): rateio PROPORCIONAL ao valor
      de cada duplicata, mantendo os vencimentos reais (dVenc).
    - Parcelas do frontend (sem `valor_base`): divisão igual; valores enviados são ignorados.
    - Parcela sem vencimento válido: hoje + 30*(i+1) dias.
    - Sem parcelas: parcela única em 30 dias.
    """
    base = now_utc()
    parcelas = [dict(p) for p in (parcelas_in or []) if isinstance(p, dict)]
    if not parcelas:
        return [{"vencimento": iso(base + timedelta(days=30)), "valor": round(valor_liquido, 2)}]

    for i, p in enumerate(parcelas):
        d = _parse_date(p.get("vencimento"))
        p["vencimento"] = iso(d) if d else iso(base + timedelta(days=30 * (i + 1)))

    pesos = [_to_float(p.get("valor_base")) for p in parcelas]
    valores = _ratear(valor_liquido, pesos)
    for p, v in zip(parcelas, valores):
        p["valor"] = v
    return parcelas

async def gerar_parcelas_comissao(current: dict, ped: dict, comissao: dict, parcelas_override: Optional[List[dict]] = None):
    """Distribui o valor LÍQUIDO da comissão entre as parcelas.
    Usa `parcelas_override` quando informado (não vazio); senão, as parcelas do pedido."""
    parcelas_in = parcelas_override if parcelas_override else ped.get("parcelas", [])
    parcelas = _calcular_parcelas_comissao(parcelas_in, _to_float(comissao.get("valor_liquido")))
    n = len(parcelas)

    for i, p in enumerate(parcelas):
        await t_insert("contas_receber", current, {
            "comissao_id": comissao["id"],
            "cliente_id": ped.get("cliente_id"),
            "representada_id": ped.get("representada_id"),
            "pedido_id": ped["id"],
            "numero_documento": f"{ped.get('numero')} ({i+1}/{n})",
            "numero_duplicata": str(p.get("numero") or ""),
            "valor": p["valor"],
            "valor_recebido": 0.0,
            "saldo_pendente": p["valor"],
            "vencimento": p["vencimento"],
            "status": "aberto",
            "historico_recebimentos": [],
            "forma_pagamento": "Boleto",
        })

# ✅ NOVO: regenera as parcelas das comissões de um pedido já faturado após edição.
# Não mexe em comissões que já tiveram qualquer recebimento (preserva histórico).
async def _regerar_parcelas_pedido(current: dict, ped: dict) -> dict:
    tid = tid_of(current)
    resultado = {"regeneradas": 0, "bloqueadas_por_recebimento": 0}
    comissoes = await db.comissoes.find({
        "tenant_id": tid,
        "pedido_id": ped["id"],
        "modalidade": "faturamento",
        "status": {"$nin": ["cancelada", "recebida"]},
    }, {"_id": 0}).to_list(100)

    for com in comissoes:
        ja_recebeu = _to_float(com.get("valor_recebido")) > 0 or await db.contas_receber.count_documents({
            "tenant_id": tid, "comissao_id": com["id"], "valor_recebido": {"$gt": 0},
        }) > 0
        if ja_recebeu:
            resultado["bloqueadas_por_recebimento"] += 1
            continue

        updates: Dict[str, Any] = {}
        if com.get("base_calculo") == "pedido":
            novo = round(_to_float(ped.get("total")) * _to_float(com.get("percentual")) / 100.0, 2)
            if abs(novo - _to_float(com.get("valor_liquido"))) >= 0.01:
                updates = {"valor_liquido": novo, "saldo_pendente": novo,
                           "valor_total_pedido": ped.get("total", 0)}
                com.update(updates)

        await db.contas_receber.delete_many({"tenant_id": tid, "comissao_id": com["id"]})
        if updates:
            await db.comissoes.update_one(
                {"id": com["id"], "tenant_id": tid},
                {"$set": {**updates, "updated_at": iso(now_utc())}}
            )
        if _to_float(com.get("valor_liquido")) > 0:
            await gerar_parcelas_comissao(current, ped, com)
        resultado["regeneradas"] += 1

    return resultado

@api.get("/pedidos")
async def get_pedidos(status: Optional[str] = None, cliente_id: Optional[str] = None, representada_id: Optional[str] = None, current=Depends(get_active_user)):
    f: Dict[str, Any] = {}
    if status: f["status"] = status
    if cliente_id: f["cliente_id"] = cliente_id
    if representada_id: f["representada_id"] = representada_id

    pedidos = await t_list("pedidos", current, f)
    faturamentos = await t_list("faturamentos", current)

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

# ✅ NOVO: Painel de pedidos aguardando faturamento (item 7 do Prompt Mestre)
@api.get("/pedidos/aguardando-faturamento")
async def pedidos_aguardando_faturamento(
    representada_id: Optional[str] = None,
    cliente_id: Optional[str] = None,
    dias_min: int = 0,
    current=Depends(get_active_user),
):
    """
    Pedidos com saldo a faturar. Retorna dias_aguardando desde a criação.
    Filtro `dias_min` permite focar nos mais antigos (ex.: >15 dias).
    """
    tid = tid_of(current)
    f: Dict[str, Any] = {
        "status": {"$in": ["rascunho", "aprovado", "enviado", "faturado_parcial"]},
    }
    if representada_id: f["representada_id"] = representada_id
    if cliente_id: f["cliente_id"] = cliente_id

    pedidos = await db.pedidos.find({"tenant_id": tid, **f}, {"_id": 0}).to_list(2000)
    faturamentos = await db.faturamentos.find({"tenant_id": tid}, {"_id": 0}).to_list(5000)

    fat_dict: Dict[str, float] = {}
    for fat in faturamentos:
        pid = fat.get("pedido_id")
        if pid:
            fat_dict[pid] = fat_dict.get(pid, 0) + fat.get("valor_faturado", 0)

    now = now_utc()
    result = []
    for p in pedidos:
        valor_fat = fat_dict.get(p["id"], 0)
        saldo = round(p.get("total", 0) - valor_fat, 2)
        if saldo <= 0.01:
            continue
        data_ped = _parse_date(p.get("data_pedido"))
        dias = (now - data_ped).days if data_ped else 0
        if dias < dias_min:
            continue
        p["valor_faturado_total"] = round(valor_fat, 2)
        p["saldo_a_faturar"] = saldo
        p["dias_aguardando"] = dias
        p["alerta"] = dias > 15
        result.append(p)

    result.sort(key=lambda x: -x["dias_aguardando"])
    return result

@api.post("/pedidos")
async def create_pedido(body: PedidoIn, current=Depends(get_active_user)):
    tid = tid_of(current)
    data = body.model_dump()
    rep = await db.representadas.find_one({"id": data["representada_id"], "tenant_id": tid}, {"_id": 0})
    if not rep: raise HTTPException(404, "Representada não encontrada")
    cli = await db.clientes.find_one({"id": data["cliente_id"], "tenant_id": tid}, {"_id": 0})
    if not cli: raise HTTPException(404, "Cliente não encontrado")
    # ✅ NOVO: usa a regra VIGENTE na data do pedido (não a atual)
    regra = await comissao_vigente_em(tid, data["representada_id"], iso(now_utc()))
    data = calc_pedido_totals(data, regra.get("comissao_padrao", 5.0))
    data["numero"] = await next_numero(tid, "PED", "pedidos")
    data["data_pedido"] = iso(now_utc())
    return await t_insert("pedidos", current, data)

@api.put("/pedidos/{pid}")
async def update_pedido(pid: str, body: PedidoIn, current=Depends(get_active_user)):
    tid = tid_of(current)
    existing = await db.pedidos.find_one({"id": pid, "tenant_id": tid}, {"_id": 0})
    if not existing: raise HTTPException(404, "Pedido não encontrado")
    data = body.model_dump()
    rep = await db.representadas.find_one({"id": data["representada_id"], "tenant_id": tid}, {"_id": 0})
    if not rep: raise HTTPException(404, "Representada não encontrada")
    cli = await db.clientes.find_one({"id": data["cliente_id"], "tenant_id": tid}, {"_id": 0})
    if not cli: raise HTTPException(404, "Cliente não encontrado")
    # ✅ NOVO: usa a regra vigente na data ORIGINAL do pedido (preserva o fato gerador)
    data_ref = existing.get("data_pedido") or iso(now_utc())
    regra = await comissao_vigente_em(tid, data["representada_id"], data_ref)
    data = calc_pedido_totals(data, regra.get("comissao_padrao", 5.0))
    data["numero"] = existing["numero"]

    # ✅ NOVO: status de pedido faturado/cancelado só muda via faturamento/cancelamento.
    # Evita que o default "rascunho" do PedidoIn rebaixe um pedido já faturado.
    if existing.get("status") in ("faturado", "faturado_parcial", "cancelado"):
        data["status"] = existing["status"]

    # ✅ NOVO: não apaga as parcelas existentes (ex.: duplicatas da NF-e) se o front não enviar
    if not data.get("parcelas") and existing.get("parcelas"):
        data["parcelas"] = existing["parcelas"]

    atualizado = await t_update("pedidos", current, pid, data)

    # ✅ NOVO: pedido faturado editado → regenera parcelas das comissões ainda não recebidas
    if atualizado.get("status") in ("faturado", "faturado_parcial"):
        res = await _regerar_parcelas_pedido(current, atualizado)
        await _log_auditoria(
            current, "pedido_editado_pos_faturamento", "pedidos", pid,
            before=existing, after=atualizado, extra=res,
        )
        atualizado["parcelas_regeneradas"] = res

    return atualizado

# ✅ NOVO: edição só das parcelas (não recalcula itens/total — seguro para pedidos importados de XML)
class ParcelasUpdateIn(BaseModel):
    parcelas: List[dict]

@api.patch("/pedidos/{pid}/parcelas")
async def atualizar_parcelas_pedido(pid: str, body: ParcelasUpdateIn, current=Depends(get_active_user)):
    tid = tid_of(current)
    existing = await db.pedidos.find_one({"id": pid, "tenant_id": tid}, {"_id": 0})
    if not existing: raise HTTPException(404, "Pedido não encontrado")
    if existing.get("status") == "cancelado":
        raise HTTPException(400, "Pedido cancelado não pode ter parcelas alteradas.")

    parcelas = []
    for i, p in enumerate(body.parcelas or []):
        d = _parse_date(p.get("vencimento"))
        if not d: raise HTTPException(400, f"Parcela {i+1}: vencimento inválido")
        v = round(_to_float(p.get("valor_base", p.get("valor"))), 2)
        if v <= 0: raise HTTPException(400, f"Parcela {i+1}: valor deve ser maior que zero")
        parcelas.append({
            "numero": str(p.get("numero") or f"{i+1:03d}"),
            "vencimento": iso(d),
            "valor": v,
            "valor_base": v,
            "origem": p.get("origem") or "manual",
        })
    if not parcelas: raise HTTPException(400, "Informe ao menos uma parcela")

    atualizado = await t_update("pedidos", current, pid, {"parcelas": parcelas})
    res = None
    if atualizado.get("status") in ("faturado", "faturado_parcial"):
        res = await _regerar_parcelas_pedido(current, atualizado)
    await _log_auditoria(
        current, "pedido_parcelas_alteradas", "pedidos", pid,
        before={"parcelas": existing.get("parcelas", [])}, after={"parcelas": parcelas},
        extra=res or {},
    )
    atualizado["parcelas_regeneradas"] = res
    return atualizado

@api.patch("/pedidos/{pid}/status")
async def status_pedido(pid: str, body: dict, current=Depends(get_active_user)):
    novo = body.get("status")
    if not novo: raise HTTPException(400, "status obrigatório")
    updates = {"status": novo}
    if "nf_numero" in body: updates["nf_numero"] = body["nf_numero"]
    return await t_update("pedidos", current, pid, updates)

@api.post("/pedidos/{pid}/faturamento")
async def registrar_faturamento(pid: str, body: FaturamentoIn, current=Depends(get_active_user)):
    tid = tid_of(current)
    ped = await db.pedidos.find_one({"id": pid, "tenant_id": tid})
    if not ped: raise HTTPException(404, "Pedido não encontrado")

    # ✅ NOVO: Idempotência de NF-e — bloqueia duplicata na mesma representada/emitente
    if body.nf_numero:
        pids_rep = [p["id"] async for p in db.pedidos.find(
            {"tenant_id": tid, "representada_id": ped["representada_id"]},
            {"id": 1, "_id": 0}
        )]
        dup = await db.faturamentos.find_one({
            "tenant_id": tid,
            "nf_numero": body.nf_numero,
            "nf_serie": body.nf_serie or "",
            "pedido_id": {"$in": pids_rep},
        })
        if dup:
            raise HTTPException(
                409,
                f"NF {body.nf_numero}/{body.nf_serie or ''} já registrada no pedido "
                f"{dup.get('pedido_numero') or dup.get('pedido_id')}. "
                f"Se precisa corrigir, estorne o faturamento anterior."
            )

    # ✅ NOVO: usa a regra VIGENTE na data do faturamento (fato gerador real)
    data_fat = body.data_faturamento or iso(now_utc())
    regra = await comissao_vigente_em(tid, ped["representada_id"], data_fat)

    # 1. Salva histórico do faturamento (com representada_id para futuras checagens)
    await t_insert("faturamentos", current, {
        "pedido_id": pid,
        "pedido_numero": ped.get("numero"),
        "representada_id": ped["representada_id"],
        "nf_numero": body.nf_numero,
        "nf_serie": body.nf_serie or "",
        "data_faturamento": data_fat,
        "valor_faturado": body.valor_faturado,
    })

    # 2. Calcula comissão com base na regra vigente
    base = regra.get("base_calculo_comissao", "faturado")
    if base == "pedido":
        valor_base = ped.get("total", 0)
    elif base == "recebido":
        valor_base = 0
    else:
        valor_base = body.valor_faturado

    percentual = regra.get("comissao_padrao", 5.0)
    valor_liquido = round(valor_base * (percentual / 100), 2)

    # 3. Cria comissão (guarda base_calculo e data_faturamento para rastreabilidade)
    modalidade = regra.get("modalidade_comissao", "faturamento")
    comissao_data = {
        "pedido_id": pid, "pedido_numero": ped.get("numero"),
        "cliente_id": ped.get("cliente_id"),
        "representada_id": ped.get("representada_id"),
        "nf_numero": body.nf_numero,
        "nf_serie": body.nf_serie or "",
        "data_faturamento": data_fat,
        "valor_total_pedido": ped.get("total", 0),
        "valor_faturado": body.valor_faturado,
        "percentual": percentual,
        "base_calculo": base,
        "valor_liquido": valor_liquido,
        "valor_recebido": 0.0,
        "saldo_pendente": valor_liquido,
        "modalidade": modalidade,
        "status": "pendente" if modalidade == "faturamento" else "aguardando_liquidez",
        "historico_recebimentos": [],
    }
    comissao = await t_insert("comissoes", current, comissao_data)

    # 4. Gera contas a receber se for faturamento
    #    (parcelas do body; se vierem vazias, usa as parcelas do pedido)
    if modalidade == "faturamento" and valor_liquido > 0:
        await gerar_parcelas_comissao(current, ped, comissao, body.parcelas or None)

    # 5. Atualiza status do pedido
    faturamentos = await t_list("faturamentos", current, {"pedido_id": pid})
    total_faturado = sum(f["valor_faturado"] for f in faturamentos)
    novo_status = "faturado" if total_faturado >= ped["total"] else "faturado_parcial"
    await db.pedidos.update_one({"id": pid, "tenant_id": tid}, {"$set": {"status": novo_status}})

    return {"ok": True, "status": novo_status, "valor_liquido": valor_liquido}

@api.post("/pedidos/{pid}/liquidez")
async def confirmar_liquidez(pid: str, current=Depends(get_active_user)):
    tid = tid_of(current)
    ped = await db.pedidos.find_one({"id": pid, "tenant_id": tid})
    if not ped: raise HTTPException(404, "Pedido não encontrado")

    com = await db.comissoes.find_one({"pedido_id": pid, "tenant_id": tid, "status": "aguardando_liquidez"})
    if not com: raise HTTPException(404, "Comissão não encontrada ou já liberada.")

    await db.comissoes.update_one({"id": com["id"]}, {"$set": {"status": "pendente"}})

    # ✅ NOVO: usa base_calculo GUARDADA na comissão (regra vigente no faturamento),
    # não o valor atual da representada. Preserva o histórico.
    base = com.get("base_calculo") or "faturado"
    if base == "recebido":
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
async def del_pedido(pid: str, current=Depends(get_active_user)):
    tid = tid_of(current)
    paga = await db.comissoes.find_one({"tenant_id": tid, "pedido_id": pid, "status": "recebida"})
    if paga: raise HTTPException(400, "Pedido possui comissão já recebida. Estorne antes de excluir.")
    await db.comissoes.delete_many({"tenant_id": tid, "pedido_id": pid})
    await db.contas_receber.delete_many({"tenant_id": tid, "pedido_id": pid})
    await db.faturamentos.delete_many({"tenant_id": tid, "pedido_id": pid})
    return await t_delete("pedidos", current, pid)

@api.post("/pedidos/{pid}/cancelar")
async def cancelar_pedido(pid: str, current=Depends(get_active_user)):
    tid = tid_of(current)
    ped = await db.pedidos.find_one({"id": pid, "tenant_id": tid})
    if not ped:
        raise HTTPException(404, "Pedido não encontrado")

    if ped.get("status") == "cancelado":
        return {"ok": True, "message": "Pedido já está cancelado."}

    com_paga = await db.comissoes.find_one({"pedido_id": pid, "tenant_id": tid, "valor_recebido": {"$gt": 0}})
    if com_paga:
        raise HTTPException(400, "Não é possível cancelar. Existe comissão já recebida. Estorne o recebimento primeiro.")

    await db.pedidos.update_one(
        {"id": pid, "tenant_id": tid},
        {"$set": {"status": "cancelado", "updated_at": iso(now_utc())}}
    )

    await db.comissoes.update_many(
        {"pedido_id": pid, "tenant_id": tid},
        {"$set": {"status": "cancelada", "saldo_pendente": 0.0, "updated_at": iso(now_utc())}}
    )

    await db.contas_receber.update_many(
        {"pedido_id": pid, "tenant_id": tid, "status": {"$ne": "recebido"}},
        {"$set": {"status": "cancelado", "saldo_pendente": 0.0, "updated_at": iso(now_utc())}}
    )

    return {"ok": True, "message": "Pedido cancelado e valores estornados com sucesso."}

# ------------------------------------------------------------
# Oportunidades / Visitas
# ------------------------------------------------------------
@api.get("/oportunidades")
async def get_ops(current=Depends(get_active_user)):
    return await t_list("oportunidades", current)

@api.post("/oportunidades")
async def create_op(body: OportunidadeIn, current=Depends(get_active_user)):
    return await t_insert("oportunidades", current, body.model_dump())

@api.put("/oportunidades/{oid}")
async def update_op(oid: str, body: OportunidadeIn, current=Depends(get_active_user)):
    return await t_update("oportunidades", current, oid, body.model_dump())

@api.patch("/oportunidades/{oid}/estagio")
async def move_op(oid: str, body: dict, current=Depends(get_active_user)):
    return await t_update("oportunidades", current, oid, {"estagio": body.get("estagio")})

@api.delete("/oportunidades/{oid}")
async def del_op(oid: str, current=Depends(get_active_user)):
    return await t_delete("oportunidades", current, oid)

@api.get("/visitas")
async def get_visitas(current=Depends(get_active_user)):
    return await t_list("visitas", current, sort_key="data")

@api.post("/visitas")
async def create_visita(body: VisitaIn, current=Depends(get_active_user)):
    return await t_insert("visitas", current, body.model_dump())

@api.put("/visitas/{vid}")
async def update_visita(vid: str, body: VisitaIn, current=Depends(get_active_user)):
    return await t_update("visitas", current, vid, body.model_dump())

@api.delete("/visitas/{vid}")
async def del_visita(vid: str, current=Depends(get_active_user)):
    return await t_delete("visitas", current, vid)

# ------------------------------------------------------------
# Comissões / Contas a Receber
# ------------------------------------------------------------
@api.get("/comissoes")
async def get_comissoes(status: Optional[str] = None, representada_id: Optional[str] = None, current=Depends(get_active_user)):
    f: Dict[str, Any] = {}
    if status: f["status"] = status
    if representada_id: f["representada_id"] = representada_id
    return await t_list("comissoes", current, f)

# ✅ NOVO: auditoria em alterações de comissão (before/after)
@api.patch("/comissoes/{cid}")
async def update_comissao(cid: str, body: ComissaoUpdate, current=Depends(get_active_user)):
    tid = tid_of(current)
    before = await db.comissoes.find_one({"id": cid, "tenant_id": tid}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Comissão não encontrada")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return before
    result = await t_update("comissoes", current, cid, updates)
    await _log_auditoria(
        current,
        action="comissao_alterada",
        entity="comissoes",
        entity_id=cid,
        before=before,
        after=result,
        extra={"campos_alterados": list(updates.keys())},
    )
    return result

@api.delete("/comissoes/{cid}")
async def del_comissao(cid: str, current=Depends(get_active_user)):
    doc = await db.comissoes.find_one({"id": cid, "tenant_id": tid_of(current)})
    if not doc: raise HTTPException(404, "Comissão não encontrada")
    if doc.get("status") == "recebida" or doc.get("valor_recebido", 0) > 0:
        raise HTTPException(400, "Comissões já recebidas não podem ser excluídas.")
    return await t_delete("comissoes", current, cid)

@api.get("/contas-receber")
async def get_ar(current=Depends(get_active_user)):
    return await t_list("contas_receber", current, sort_key="vencimento")

@api.post("/contas-receber")
async def create_ar(body: ARIn, current=Depends(get_active_user)):
    return await t_insert("contas_receber", current, body.model_dump())

@api.put("/contas-receber/{rid}")
async def update_ar(rid: str, body: ARIn, current=Depends(get_active_user)):
    return await t_update("contas_receber", current, rid, body.model_dump())

@api.delete("/contas-receber/{rid}")
async def del_ar(rid: str, current=Depends(get_active_user)):
    return await t_delete("contas_receber", current, rid)

@api.post("/contas-receber/{rid}/receber")
async def receber_comissao(rid: str, body: dict, current=Depends(get_active_user)):
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
# ✅ NOVO: Recebíveis da Indústria (item 10 do Prompt Mestre)
# O representante acompanha o que a FÁBRICA tem a receber do cliente.
# NÃO é receita própria do representante.
# ------------------------------------------------------------
@api.get("/recebiveis-industria")
async def list_recebiveis_industria(
    representada_id: Optional[str] = None,
    cliente_id: Optional[str] = None,
    status: Optional[str] = None,
    current=Depends(get_active_user),
):
    f: Dict[str, Any] = {}
    if representada_id: f["representada_id"] = representada_id
    if cliente_id: f["cliente_id"] = cliente_id
    if status: f["status"] = status
    return await t_list("recebiveis_industria", current, f, sort_key="vencimento")

@api.post("/recebiveis-industria")
async def create_recebivel_industria(body: RecebivelIndustriaIn, current=Depends(get_active_user)):
    tid = tid_of(current)
    rep = await db.representadas.find_one({"id": body.representada_id, "tenant_id": tid})
    if not rep: raise HTTPException(404, "Representada não encontrada")
    cli = await db.clientes.find_one({"id": body.cliente_id, "tenant_id": tid})
    if not cli: raise HTTPException(404, "Cliente não encontrado")

    # ✅ NOVO: força float numérico — saldo_pendente nunca é gravado como string
    valor = round(_to_float(body.valor), 2)
    if valor <= 0: raise HTTPException(400, "Valor deve ser maior que zero")

    data = body.model_dump()
    data["valor"] = valor
    data["valor_recebido"] = 0.0
    data["saldo_pendente"] = valor
    data["historico_recebimentos"] = []
    doc = await t_insert("recebiveis_industria", current, data)
    await _log_auditoria(
        current, "recebivel_industria_criado", "recebiveis_industria", doc["id"],
        after=doc,
    )
    return doc

@api.post("/recebiveis-industria/{rid}/receber")
async def receber_recebivel_industria(rid: str, body: dict, current=Depends(get_active_user)):
    tid = tid_of(current)
    rec = await db.recebiveis_industria.find_one({"id": rid, "tenant_id": tid})
    if not rec: raise HTTPException(404, "Recebível não encontrado")

    valor = _to_float(body.get("valor"))
    if valor <= 0: raise HTTPException(400, "Valor deve ser maior que zero")
    data_receb = body.get("data", iso(now_utc()))

    # ✅ NOVO: tolera registros legados com valores gravados como string
    saldo_atual = _to_float(rec.get("saldo_pendente"), _to_float(rec.get("valor")))
    novo_saldo = max(0.0, saldo_atual - valor)
    novo_total = _to_float(rec.get("valor_recebido")) + valor
    novo_status = "recebido" if novo_saldo <= 0.01 else "parcial"

    historico = rec.get("historico_recebimentos", [])
    historico.append({
        "data": data_receb,
        "valor": round(valor, 2),
        "saldo_restante": round(novo_saldo, 2),
    })

    await db.recebiveis_industria.update_one(
        {"id": rid, "tenant_id": tid},
        {"$set": {
            "valor_recebido": round(novo_total, 2),
            "saldo_pendente": round(novo_saldo, 2),
            "status": novo_status,
            "historico_recebimentos": historico,
            "updated_at": iso(now_utc()),
        }}
    )

    # ✅ AUTO-LIQUIDEZ: se o recebível cobre o valor total e existe uma comissão
    # aguardando liquidez para o mesmo pedido, libera automaticamente.
    liberou_comissao = False
    if rec.get("pedido_id") and novo_saldo <= 0.01:
        com = await db.comissoes.find_one({
            "pedido_id": rec["pedido_id"],
            "tenant_id": tid,
            "status": "aguardando_liquidez",
        })
        if com:
            await db.comissoes.update_one(
                {"id": com["id"]},
                {"$set": {"status": "pendente", "updated_at": iso(now_utc())}}
            )
            liberou_comissao = True
            await _log_auditoria(
                current, "comissao_liberada_por_liquidez", "comissoes", com["id"],
                extra={"recebivel_id": rid},
            )

    await _log_auditoria(
        current, "recebivel_industria_recebido", "recebiveis_industria", rid,
        extra={"valor_recebido": round(valor, 2), "novo_saldo": round(novo_saldo, 2),
               "liberou_comissao": liberou_comissao},
    )

    return {
        "ok": True,
        "novo_saldo": round(novo_saldo, 2),
        "status": novo_status,
        "comissao_liberada": liberou_comissao,
    }

@api.delete("/recebiveis-industria/{rid}")
async def del_recebivel_industria(rid: str, current=Depends(get_active_user)):
    rec = await db.recebiveis_industria.find_one({"id": rid, "tenant_id": tid_of(current)}, {"_id": 0})
    if not rec: raise HTTPException(404, "Recebível não encontrado")
    if _to_float(rec.get("valor_recebido")) > 0:
        raise HTTPException(400, "Recebíveis com valor recebido não podem ser excluídos. Use estorno.")
    await _log_auditoria(
        current, "recebivel_industria_excluido", "recebiveis_industria", rid,
        before=rec,
    )
    return await t_delete("recebiveis_industria", current, rid)

# ------------------------------------------------------------
# Contas a Pagar
# ------------------------------------------------------------
@api.get("/contas-pagar")
async def get_ap(current=Depends(get_active_user)):
    return await t_list("contas_pagar", current, sort_key="vencimento")

@api.post("/contas-pagar")
async def create_ap(body: APIn, current=Depends(get_active_user)):
    return await t_insert("contas_pagar", current, body.model_dump())

@api.put("/contas-pagar/{pid}")
async def update_ap(pid: str, body: APIn, current=Depends(get_active_user)):
    return await t_update("contas_pagar", current, pid, body.model_dump())

@api.delete("/contas-pagar/{pid}")
async def del_ap(pid: str, current=Depends(get_active_user)):
    return await t_delete("contas_pagar", current, pid)

# ------------------------------------------------------------
# Dashboard
# ------------------------------------------------------------
def _in_month(s, y, m):
    d = _parse_date(s); return bool(d and d.year == y and d.month == m)

def _in_year(s, y):
    d = _parse_date(s); return bool(d and d.year == y)

@api.get("/dashboard")
async def dashboard(current=Depends(get_active_user)):
    pedidos, reps, comissoes, ap, ar, clientes, visitas, ops, faturamentos = await asyncio.gather(
        t_list("pedidos", current), t_list("representadas", current, leve=True), t_list("comissoes", current),
        t_list("contas_pagar", current), t_list("contas_receber", current), t_list("clientes", current),
        t_list("visitas", current), t_list("oportunidades", current), t_list("faturamentos", current)
    )

    faturados = [p for p in pedidos if p.get("status") in ("faturado", "faturado_parcial")]
    now = now_utc(); mes = now.month; ano = now.year

    volume_vendas_mes = sum(p.get("total", 0) for p in faturados if _in_month(p.get("data_pedido"), ano, mes))
    volume_vendas_ano = sum(p.get("total", 0) for p in faturados if _in_year(p.get("data_pedido"), ano))

    valor_faturado_mes = sum(f.get("valor_faturado", 0) for f in faturamentos if _in_month(f.get("data_faturamento"), ano, mes))
    valor_faturado_ano = sum(f.get("valor_faturado", 0) for f in faturamentos if _in_year(f.get("data_faturamento"), ano))

    fat_por_rep = []
    for r in reps:
        v_vendas = sum(p.get("total", 0) for p in faturados if p.get("representada_id") == r["id"])
        p_ids = [p["id"] for p in pedidos if p.get("representada_id") == r["id"]]
        v_fat = sum(f.get("valor_faturado", 0) for f in faturamentos if f.get("pedido_id") in p_ids)
        fat_por_rep.append({
            "nome": r.get("nome_fantasia") or r.get("razao_social"),
            "volume": round(v_vendas, 2),
            "faturado": round(v_fat, 2)
        })

    com_recebidas = sum(c.get("valor_recebido", 0) for c in comissoes)
    com_abertas = sum(c.get("saldo_pendente", 0) for c in comissoes if c.get("status") not in ("recebida", "aguardando_liquidez"))

    ap_abertas = sum(a.get("valor", 0) for a in ap if a.get("status") == "aberto")
    ar_abertas = sum(a.get("saldo_pendente", a.get("valor", 0)) for a in ar if a.get("status") == "aberto")

    despesas_mes = sum(a.get("valor", 0) for a in ap if a.get("status") == "pago" and _in_month(a.get("vencimento"), ano, mes))

    saldo_mes = valor_faturado_mes - despesas_mes

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
        val = sum(f.get("valor_faturado", 0) for f in faturamentos if _in_month(f.get("data_faturamento"), d.year, d.month))
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

    if valor_faturado_mes <= 0:
        saude = 50
    else:
        margem = max(0.0, min(1.0, (valor_faturado_mes - despesas_mes) / valor_faturado_mes))
        pen_atraso = min(0.4, em_atraso_valor / max(1.0, valor_faturado_mes))
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
        "volume_vendas_mes": round(volume_vendas_mes, 2),
        "volume_vendas_ano": round(volume_vendas_ano, 2),
        "valor_faturado_mes": round(valor_faturado_mes, 2),
        "valor_faturado_ano": round(valor_faturado_ano, 2),
        "faturamento_por_representada": fat_por_rep,
        "comissoes_previstas": round(com_abertas, 2),
        "comissoes_recebidas": round(com_recebidas, 2),
        "comissoes_abertas": round(com_abertas, 2),
        "contas_pagar_abertas": round(ap_abertas, 2),
        "contas_receber_abertas": round(ar_abertas, 2),
        "despesas_mes": round(despesas_mes, 2),
        "saldo_mes": round(saldo_mes, 2),
        "em_atraso": round(em_atraso_valor, 2),
        "em_atraso_count": em_atraso_count,
        "projecao_valor": round(projecao_valor, 2),
        "projecao_comissao": round(projecao_comissao, 2),
        "pedidos_abertos": pedidos_abertos,
        "pedidos_faturados": pedidos_faturados,
        "clientes_ativos": clientes_ativos,
        "novos_clientes": novos,
        "visitas_realizadas": visitas_realizadas,
        "propostas_negociacao": propostas_neg,
        "serie_faturamento": serie,
        "top_produtos": top_produtos,
        "gastos_por_categoria": gastos_por_categoria,
        "saude_financeira": saude,
        "saude_label": saude_label,
        "avisos": avisos,
    }

# ------------------------------------------------------------
# Insights & IA
# ------------------------------------------------------------
@api.get("/insights/regras")
async def insights_regras(current=Depends(get_active_user)):
    now = now_utc()
    clientes, pedidos, reps = await asyncio.gather(
        t_list("clientes", current, leve=True), t_list("pedidos", current), t_list("representadas", current, leve=True)
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
        t_list("clientes", current, leve=True), t_list("pedidos", current), t_list("representadas", current, leve=True),
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

AI_LIMIT_POR_HORA = int(os.environ.get("AI_LIMIT_POR_HORA", "60"))

@api.post("/max-ai/chat")
async def max_ai(body: ChatIn, current=Depends(get_active_user)):
    require_feature(current, "max_ai", "O MAX AI")
    _rl_hit(f"ai:{tid_of(current)}", AI_LIMIT_POR_HORA, 3600)
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
async def insights_ai(current=Depends(get_active_user)):
    require_feature(current, "max_ai", "Os insights com IA")
    _rl_hit(f"ai:{tid_of(current)}", AI_LIMIT_POR_HORA, 3600)
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
async def global_search(q: str = Query(..., min_length=1), current=Depends(get_active_user)):
    q = q.strip()
    if not q: raise HTTPException(400, "Query vazia")
    ql = q.lower()
    def m(d, keys): return any(d.get(k) and ql in str(d.get(k)).lower() for k in keys)
    return {
        "clientes": [c for c in await t_list("clientes", current, leve=True) if m(c, ["razao_social", "nome_fantasia", "cnpj_cpf", "cidade"])][:10],
        "produtos": [p for p in await t_list("produtos", current, leve=True) if m(p, ["nome", "codigo", "sku", "ean", "marca"])][:10],
        "representadas": [r for r in await t_list("representadas", current, leve=True) if m(r, ["razao_social", "nome_fantasia", "cnpj"])][:10],
        "pedidos": [p for p in await t_list("pedidos", current) if m(p, ["numero"])][:10],
    }

class XMLImportIn(BaseModel):
    xml_content: str
    filename: Optional[str] = ""
    create_pedido: bool = True
    representada_id: Optional[str] = None
    cliente_id: Optional[str] = None

def _only_digits(s: Optional[str]) -> str: return re.sub(r"\D", "", s or "")

# ✅ NOVO: regex em um trecho específico do XML
def _rx(pat: str, text: str, default: str = "") -> str:
    m = re.search(pat, text or "", re.S | re.I)
    return m.group(1).strip() if m else default

# ✅ NOVO: normaliza XML com/sem namespace — remove BOM, declarações xmlns
# e prefixos de tag (<nfe:det>, </ns2:vNF>), cobrindo layouts antigos e proc.
def _normalizar_xml_nfe(x: str) -> str:
    x = (x or "").lstrip("\ufeff")
    x = re.sub(r'\s+xmlns(:[\w.-]+)?\s*=\s*"[^"]*"', "", x)
    x = re.sub(r"<(/?)[A-Za-z_][\w.-]*:", r"<\1", x)
    return x

def _parse_nfe(x: str) -> dict:
    xc = _normalizar_xml_nfe(x)

    def f(pat, default=""):
        return _rx(pat, xc, default)

    # ✅ FIX: antes, f(pat, seg) usava `seg` como DEFAULT e buscava no documento
    # inteiro → todos os itens herdavam qCom/vUnCom/vProd do primeiro item.
    # `\b` evita casar <detPag>.
    itens = []
    for m in re.finditer(r"<det\b[^>]*>(.*?)</det>", xc, re.S | re.I):
        seg = m.group(1)
        itens.append({
            "codigo": _rx(r"<cProd>(.*?)</cProd>", seg),
            "ean": _rx(r"<cEAN>(.*?)</cEAN>", seg),
            "nome": _rx(r"<xProd>(.*?)</xProd>", seg),
            "quantidade": _to_float(_rx(r"<qCom>(.*?)</qCom>", seg)),
            "preco": _to_float(_rx(r"<vUnCom>(.*?)</vUnCom>", seg)),
            "total": _to_float(_rx(r"<vProd>(.*?)</vProd>", seg)),
        })

    # ✅ NOVO: duplicatas de cobrança <cobr><dup> (nDup, dVenc, vDup)
    parcelas = []
    cobr = f(r"<cobr\b[^>]*>(.*?)</cobr>")
    for i, m in enumerate(re.finditer(r"<dup\b[^>]*>(.*?)</dup>", cobr, re.S | re.I)):
        seg = m.group(1)
        venc = _parse_date(_rx(r"<dVenc>(.*?)</dVenc>", seg))
        parcelas.append({
            "numero": _rx(r"<nDup>(.*?)</nDup>", seg) or f"{i+1:03d}",
            "vencimento": iso(venc) if venc else None,
            "valor_base": round(_to_float(_rx(r"<vDup>(.*?)</vDup>", seg)), 2),
            "origem": "nfe_dup",
        })

    # ✅ NOVO: dhEmi (layout 3.10/4.00) com fallback dEmi (layout 2.00)
    emissao_raw = f(r"<dhEmi>(.*?)</dhEmi>") or f(r"<dEmi>(.*?)</dEmi>")
    emissao_dt = _parse_date(emissao_raw)

    return {
        "emitente": {"cnpj": f(r"<emit\b[^>]*>.*?<CNPJ>(.*?)</CNPJ>"), "nome": f(r"<emit\b[^>]*>.*?<xNome>(.*?)</xNome>")},
        "destinatario": {"cnpj": f(r"<dest\b[^>]*>.*?<CNPJ>(.*?)</CNPJ>") or f(r"<dest\b[^>]*>.*?<CPF>(.*?)</CPF>"),
                         "nome": f(r"<dest\b[^>]*>.*?<xNome>(.*?)</xNome>")},
        "numero": f(r"<nNF>(.*?)</nNF>"), "serie": f(r"<serie>(.*?)</serie>"),
        "data_emissao": iso(emissao_dt) if emissao_dt else emissao_raw,
        "valor_total": _to_float(f(r"<vNF>(.*?)</vNF>")),
        "fatura": {
            "numero": _rx(r"<nFat>(.*?)</nFat>", cobr),
            "valor_liquido": _to_float(_rx(r"<vLiq>(.*?)</vLiq>", cobr)),
        },
        "parcelas": parcelas,
        "itens": itens,
    }

async def _match_or_create_pedido(current: dict, parsed: dict, representada_id: Optional[str], cliente_id: Optional[str]) -> dict:
    tid = tid_of(current)
    emit = _only_digits(parsed.get("emitente", {}).get("cnpj"))
    dest = _only_digits(parsed.get("destinatario", {}).get("cnpj"))
    reps = await t_list("representadas", current, leve=True)
    clis = await t_list("clientes", current, leve=True)

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

    # ✅ NOVO: usa a regra vigente na data de emissão da NF-e
    data_emissao = parsed.get("data_emissao") or iso(now_utc())
    regra = await comissao_vigente_em(tid, rep["id"], data_emissao)
    comm = regra.get("comissao_padrao", 5.0)

    subtotal = sum(i["subtotal"] for i in itens)
    total = parsed.get("valor_total") or subtotal
    numero = await next_numero(tid, "PED", "pedidos")

    # ✅ NOVO: duplicatas da NF-e viram as parcelas do pedido
    parcelas_nfe = parsed.get("parcelas") or []

    pedido = await t_insert("pedidos", current, {
        "numero": numero, "cliente_id": cli["id"], "representada_id": rep["id"],
        "condicao_pagamento": rep.get("prazo_pagamento") or "30 dias",
        "itens": itens, "subtotal": round(subtotal, 2),
        "desconto_geral": 0.0, "frete": 0.0, "total": round(total, 2),
        "comissao_percentual": comm,
        "comissao_valor": round(total * comm / 100.0, 2),
        "status": "faturado",
        "data_pedido": data_emissao,
        "observacoes": f"Importado de NF-e nº {parsed.get('numero')}",
        "nf_numero": parsed.get("numero"), "nf_serie": parsed.get("serie"),
        "parcelas": parcelas_nfe,
    })

    await t_insert("faturamentos", current, {
        "pedido_id": pedido["id"],
        "pedido_numero": pedido["numero"],
        "representada_id": rep["id"],
        "nf_numero": parsed.get("numero"),
        "nf_serie": parsed.get("serie") or "",
        "data_faturamento": data_emissao,
        "valor_faturado": total,
    })

    valor_liquido = round(total * comm / 100.0, 2)
    modalidade = regra.get("modalidade_comissao", "faturamento")

    # ✅ NOVO: data prevista = 1º vencimento real da duplicata (fallback 30 dias)
    venc_validos = [p["vencimento"] for p in parcelas_nfe if p.get("vencimento")]
    data_prevista = min(venc_validos) if venc_validos else iso(now_utc() + timedelta(days=30))

    comissao = await t_insert("comissoes", current, {
        "pedido_id": pedido["id"], "pedido_numero": pedido["numero"],
        "cliente_id": cli["id"], "representada_id": rep["id"],
        "nf_numero": parsed.get("numero"),
        "nf_serie": parsed.get("serie") or "",
        "data_faturamento": data_emissao,
        "valor_total_pedido": total, "valor_faturado": total,
        "percentual": comm,
        "base_calculo": regra.get("base_calculo_comissao", "faturado"),
        "valor_liquido": valor_liquido,
        "valor_recebido": 0.0, "saldo_pendente": valor_liquido,
        "modalidade": modalidade,
        "status": "pendente" if modalidade == "faturamento" else "aguardando_liquidez",
        "historico_recebimentos": [],
        "data_prevista": data_prevista,
    })
    if modalidade == "faturamento" and valor_liquido > 0:
        # ✅ NOVO: passa as duplicatas → rateio proporcional com vencimentos reais
        await gerar_parcelas_comissao(current, pedido, comissao, parcelas_nfe or None)

    res["pedido_criado"] = pedido
    return res

@api.post("/xml/import")
async def import_xml(body: XMLImportIn, current=Depends(get_active_user)):
    require_feature(current, "xml", "A importação de XML")
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
async def xml_historico(current=Depends(get_active_user)):
    return await t_list("xml_files", current)

# ------------------------------------------------------------
# Relatórios Avançados
# ------------------------------------------------------------
@api.get("/relatorios/geral")
async def relatorio_geral(current=Depends(get_active_user)):
    pedidos, reps, clientes, comissoes, ar, faturas, produtos, visitas = await asyncio.gather(
        t_list("pedidos", current), t_list("representadas", current, leve=True), t_list("clientes", current, leve=True),
        t_list("comissoes", current), t_list("contas_receber", current), t_list("faturamentos", current),
        t_list("produtos", current, leve=True), t_list("visitas", current)
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
    require_superadmin(current)
    feedbacks = await db.feedbacks.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return feedbacks

@api.get("/leads")
async def get_leads(current=Depends(get_current_user)):
    require_superadmin(current)
    return await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.get("/leads/export")
async def export_leads_csv(current=Depends(get_current_user)):
    require_superadmin(current)
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
# Recálculo de comissões antigas — ✅ NOVO: usa vigência histórica
# ------------------------------------------------------------
@api.post("/admin/recalcular-comissoes")
async def recalcular_comissoes(current=Depends(get_active_user)):
    """
    Recalcula comissões históricas usando a regra VIGENTE NA DATA DO FATURAMENTO
    de cada comissão (não a regra atual da representada).
    Preserva o item 9 do Prompt Mestre: alterações de percentual não retroagem.
    Idempotente: só corrige o que divergir > 1 centavo.
    """
    if current.get("role") != "admin":
        raise HTTPException(403, "Apenas administradores")
    tid = tid_of(current)

    comissoes = await db.comissoes.find({"tenant_id": tid}).to_list(5000)

    total_corrigidas = 0
    detalhes = []

    for com in comissoes:
        representada_id = com.get("representada_id")
        if not representada_id:
            continue

        # Referência temporal: data do faturamento (fato gerador).
        # Fallback: created_at (sempre igual à data do faturamento na criação).
        data_ref = com.get("data_faturamento") or com.get("created_at")
        regra = await comissao_vigente_em(tid, representada_id, data_ref)

        valor_base = com.get("valor_faturado") or com.get("valor_total_pedido") or 0
        percentual = regra.get("comissao_padrao", 5.0)
        valor_liquido_correto = round(valor_base * percentual / 100.0, 2)

        valor_liquido_antigo = com.get("valor_liquido", 0)
        if abs(valor_liquido_correto - valor_liquido_antigo) < 0.01:
            continue

        valor_recebido = com.get("valor_recebido", 0)
        novo_saldo = round(max(0.0, valor_liquido_correto - valor_recebido), 2)
        novo_status = "recebida" if novo_saldo <= 0.01 else (
            "parcialmente_recebida" if valor_recebido > 0 else com.get("status", "pendente")
        )

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

        parcelas = await db.contas_receber.find(
            {"comissao_id": com["id"], "tenant_id": tid}
        ).sort("vencimento", 1).to_list(100)

        if parcelas:
            # ✅ NOVO: preserva a proporção atual entre parcelas (ex.: duplicatas da NF-e
            # com valores diferentes) em vez de redistribuir em partes iguais.
            novos_valores = _ratear(valor_liquido_correto, [_to_float(p.get("valor")) for p in parcelas])

            for p, novo_valor in zip(parcelas, novos_valores):
                valor_receb_parcela = _to_float(p.get("valor_recebido"))
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
            "data_ref": data_ref,
            "regra_vigente_inicio": regra.get("vigencia_inicio"),
        })

    return {
        "ok": True,
        "total_corrigidas": total_corrigidas,
        "total_comissoes_verificadas": len(comissoes),
        "detalhes": detalhes[:20],
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
                 "contas_pagar", "xml_files", "documentos", "faturamentos",
                 "regras_comissao", "recebiveis_industria"]:
        docs = [clean_doc(d) async for d in db[name].find({}, {"_id": 0})]
        if name == "users":
            for u in docs: u.pop("password_hash", None)
        snapshot["collections"][name] = docs; total += len(docs)
    snapshot["total_documents"] = total
    try:
        await db.backups.insert_one(snapshot)
    except DocumentTooLarge:
        logger.error(
            f"Backup {run_id} excedeu 16 MB ({total} documentos) e NÃO foi salvo. "
            "Use os backups nativos do MongoDB Atlas."
        )
        return
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
    require_superadmin(current)
    return await db.backups.find({}, {"_id": 0, "collections": 0}).sort("created_at", -1).to_list(50)

@api.post("/backups/run")
async def run_backup_now(background: BackgroundTasks, current=Depends(get_current_user)):
    require_superadmin(current)
    run_id = new_id()
    background.add_task(_run_backup_wrapper, run_id)
    return {"status": "accepted", "run_id": run_id}

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
stripe.api_key = STRIPE_SECRET_KEY or None
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
if IS_PROD and STRIPE_SECRET_KEY and not STRIPE_WEBHOOK_SECRET:
    logger.warning("STRIPE_WEBHOOK_SECRET ausente: pagamentos não vão atualizar as assinaturas.")

def _require_stripe():
    if not STRIPE_SECRET_KEY:
        raise HTTPException(503, "Pagamentos ainda não configurados.")

def _origem_segura(origin_url: Optional[str]) -> str:
    """Evita redirecionar o checkout para domínio de terceiros."""
    o = (origin_url or "").strip().rstrip("/")
    return o if o in ALLOWED_ORIGINS else FRONTEND_URL

def _ts_para_iso(ts) -> Optional[str]:
    try: return iso(datetime.fromtimestamp(int(ts), tz=timezone.utc)) if ts else None
    except Exception: return None

@api.get("/plans")
async def get_plans(): return {"plans": PLANS, "trial_days": 7}

@api.get("/subscriptions/me")
async def my_subscription(current=Depends(get_current_user)):
    conta = await _conta_dona(current)
    sit = _situacao_assinatura(conta, current)
    n_rep = await db.representadas.count_documents({"tenant_id": tid_of(current)})
    plan = conta.get("plan") or "trial"
    return {
        "plan": plan,
        "plano_efetivo": sit["plano"],
        "subscription_status": conta.get("subscription_status"),
        "trial_ends_at": conta.get("trial_ends_at"),
        "trial_days_left": sit.get("dias_restantes"),
        "is_trial": plan == "trial",
        "acesso": sit["acesso"],
        "motivo": sit.get("motivo"),
        "aviso": sit.get("aviso"),
        "cancel_at_period_end": bool(conta.get("cancel_at_period_end")),
        "current_period_end": conta.get("current_period_end"),
        "limites": PLAN_LIMITS.get(sit["plano"], PLAN_LIMITS["solo"]),
        "uso": {"representadas": n_rep},
        "tem_assinatura_stripe": bool(conta.get("stripe_customer_id")),
        "pagamentos_configurados": bool(STRIPE_SECRET_KEY),
        "is_superadmin": is_superadmin(current),
    }

class CheckoutIn(BaseModel): lookup_key: str; origin_url: Optional[str] = None

@api.post("/payments/checkout")
async def create_checkout(req: CheckoutIn, current=Depends(get_current_user)):
    _require_stripe()
    plano = next((p for p in PLANS if p["lookup_key"] == req.lookup_key), None)
    if not plano: raise HTTPException(400, "Plano inválido.")
    conta = await _conta_dona(current)
    if (conta.get("plan") in PLANOS_PAGOS and conta.get("subscription_status") in STATUS_OK
            and conta.get("stripe_subscription_id")):
        raise HTTPException(409, "Você já tem uma assinatura ativa. Use 'Gerenciar assinatura' para trocar de plano.")

    try:
        prices = await asyncio.to_thread(
            lambda: stripe.Price.list(lookup_keys=[req.lookup_key], active=True, limit=1).data)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Price.list falhou: {e}")
        raise HTTPException(502, "Não foi possível falar com o provedor de pagamento. Tente novamente.")
    if not prices or not getattr(prices[0], "recurring", None):
        logger.error(f"Preço mensal não encontrado no Stripe para lookup_key={req.lookup_key}")
        raise HTTPException(400, "Plano indisponível no momento. Fale com o suporte.")
    price = prices[0]
    origin = _origem_segura(req.origin_url)
    meta = {"user_id": conta["id"], "tenant_id": tid_of(current), "plan_id": plano["id"], "lookup_key": req.lookup_key}

    sub_data: Dict[str, Any] = {"metadata": meta}
    # Ainda no teste? A 1ª cobrança só acontece quando o teste acabar (Stripe exige >48h no futuro).
    te = _parse_date(conta.get("trial_ends_at")) if (conta.get("plan") or "trial") == "trial" else None
    if te and te - now_utc() > timedelta(hours=49):
        sub_data["trial_end"] = int(te.timestamp())

    kwargs: Dict[str, Any] = dict(
        mode="subscription",
        line_items=[{"price": price.id, "quantity": 1}],
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/planos",
        metadata=meta,
        subscription_data=sub_data,
        client_reference_id=conta["id"],
        allow_promotion_codes=True,
        locale="pt-BR",
    )
    if conta.get("stripe_customer_id"):
        kwargs["customer"] = conta["stripe_customer_id"]  # não duplica cliente no Stripe
    else:
        kwargs["customer_email"] = conta["email"]
    if os.environ.get("STRIPE_AUTOMATIC_TAX") == "1":
        kwargs["automatic_tax"] = {"enabled": True}

    try:
        session = await asyncio.to_thread(lambda: stripe.checkout.Session.create(**kwargs))
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Checkout falhou: {e}")
        raise HTTPException(400, getattr(e, "user_message", None) or "Não foi possível iniciar o pagamento.")

    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": conta["id"], "tenant_id": tid_of(current),
        "lookup_key": req.lookup_key, "plan_id": plano["id"],
        "amount": getattr(price, "unit_amount", 0) or 0, "currency": getattr(price, "currency", "brl"),
        "status": "initiated", "payment_status": "pending",
        "created_at": iso(now_utc()), "updated_at": iso(now_utc())
    })
    return {"checkout_url": session.url, "session_id": session.id}

async def _mark_session_paid(session_id: str, obj: dict):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    meta = obj.get("metadata") or {}
    user_id = (tx or {}).get("user_id") or meta.get("user_id") or obj.get("client_reference_id")
    plan_id = (tx or {}).get("plan_id") or meta.get("plan_id")
    if tx and tx.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": "paid",
                      "stripe_subscription_id": obj.get("subscription"),
                      "stripe_customer_id": obj.get("customer"),
                      "updated_at": iso(now_utc())}}
        )
    if not user_id: return
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "subscription_status": 1})
    if not user: return
    updates = {"stripe_customer_id": obj.get("customer"), "subscription_updated_at": iso(now_utc())}
    if obj.get("subscription"): updates["stripe_subscription_id"] = obj.get("subscription")
    if plan_id in PLANOS_PAGOS: updates["plan"] = plan_id
    if user.get("subscription_status") not in STATUS_OK:
        updates["subscription_status"] = "active"  # o evento customer.subscription.* refina (trialing etc.)
    await db.users.update_one({"id": user_id}, {"$set": updates})

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, current=Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id, "tenant_id": tid_of(current)}, {"_id": 0})
    if not tx: raise HTTPException(404, "Sessão não encontrada")
    if tx.get("payment_status") != "paid" and STRIPE_SECRET_KEY:
        try:
            s = await asyncio.to_thread(lambda: stripe.checkout.Session.retrieve(session_id))
            if s.status == "complete":
                await _mark_session_paid(session_id, {"subscription": s.subscription, "customer": s.customer,
                                                      "metadata": dict(s.metadata or {})})
                tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError: pass
    return {"session_id": tx["session_id"], "status": tx["status"],
            "payment_status": tx["payment_status"], "plan_id": tx.get("plan_id")}

# ✅ Portal do cliente Stripe: trocar cartão, mudar de plano, ver faturas, cancelar
@api.post("/billing/portal")
async def billing_portal(current=Depends(get_current_user)):
    _require_stripe()
    conta = await _conta_dona(current)
    cid = conta.get("stripe_customer_id")
    if not cid: raise HTTPException(400, "Você ainda não tem uma assinatura. Escolha um plano para assinar.")
    try:
        sess = await asyncio.to_thread(lambda: stripe.billing_portal.Session.create(
            customer=cid, return_url=f"{FRONTEND_URL}/planos", locale="pt-BR"))
    except stripe.error.StripeError as e:
        logger.error(f"Stripe portal falhou: {e}")
        raise HTTPException(400, "Não foi possível abrir o portal de assinatura. Fale com o suporte.")
    return {"url": sess.url}

async def _sincronizar_assinatura(sub: dict, event_ts: Optional[int] = None):
    """Aplica no usuário o estado da assinatura vindo do Stripe (created/updated/deleted)."""
    meta = sub.get("metadata") or {}
    q = {"id": meta["user_id"]} if meta.get("user_id") else ({"stripe_customer_id": sub.get("customer")} if sub.get("customer") else None)
    if not q: return
    user = await db.users.find_one(q, {"_id": 0, "id": 1, "stripe_event_ts": 1})
    if not user:
        logger.warning(f"Assinatura {sub.get('id')} sem usuário correspondente ({q})")
        return
    # Stripe pode entregar eventos fora de ordem: ignora evento mais antigo que o último aplicado
    if event_ts and user.get("stripe_event_ts") and int(event_ts) < int(user["stripe_event_ts"]):
        return
    items = ((sub.get("items") or {}).get("data")) or []
    item = items[0] if items else {}
    plano = _plano_por_lookup((item.get("price") or {}).get("lookup_key")) or meta.get("plan_id")
    updates = {
        "subscription_status": sub.get("status"),
        "stripe_subscription_id": sub.get("id"),
        "stripe_customer_id": sub.get("customer"),
        "cancel_at_period_end": bool(sub.get("cancel_at_period_end")),
        # versões novas da API do Stripe movem current_period_end para o item
        "current_period_end": _ts_para_iso(sub.get("current_period_end") or item.get("current_period_end")),
        "subscription_updated_at": iso(now_utc()),
    }
    if event_ts: updates["stripe_event_ts"] = int(event_ts)
    if plano in PLANOS_PAGOS: updates["plan"] = plano
    await db.users.update_one({"id": user["id"]}, {"$set": updates})

async def _pagamento_falhou(invoice: dict):
    cid = invoice.get("customer")
    if not cid: return
    user = await db.users.find_one({"stripe_customer_id": cid}, {"_id": 0, "id": 1, "email": 1, "name": 1})
    if not user: return
    valor = (invoice.get("amount_due") or 0) / 100
    await send_email(user["email"], "Não conseguimos cobrar sua assinatura — OmniRepMax", _email_layout(
        "Problema no pagamento da assinatura",
        [f"Tentamos cobrar R$ {valor:,.2f} da sua assinatura do OmniRepMax, mas o pagamento não foi aprovado."
         .replace(",", "X").replace(".", ",").replace("X", "."),
         "Seu acesso continua liberado por enquanto. Atualize a forma de pagamento para evitar a suspensão."],
        "Atualizar pagamento", f"{FRONTEND_URL}/planos",
        "Vamos tentar cobrar novamente nos próximos dias.",
    ))

@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET: raise HTTPException(500, "STRIPE_WEBHOOK_SECRET não configurado")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)  # só valida a assinatura
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Assinatura inválida")
    event = json.loads(payload)  # dicts puros (independe da versão da lib)
    eid, t, ts = event.get("id"), event.get("type"), event.get("created")
    obj = (event.get("data") or {}).get("object") or {}

    # Idempotência: o Stripe reenvia eventos; cada um é processado uma vez só
    try:
        await db.stripe_events.insert_one({"id": eid, "type": t, "created_at": iso(now_utc())})
    except DuplicateKeyError:
        return {"status": "duplicate"}

    try:
        if t == "checkout.session.completed":
            await _mark_session_paid(obj["id"], obj)
        elif t == "checkout.session.async_payment_succeeded":
            await db.payment_transactions.update_one({"session_id": obj["id"]}, {"$set": {"payment_status": "paid", "updated_at": iso(now_utc())}})
            await _mark_session_paid(obj["id"], obj)
        elif t == "checkout.session.async_payment_failed":
            await db.payment_transactions.update_one({"session_id": obj["id"]}, {"$set": {"status": "failed", "payment_status": "failed", "updated_at": iso(now_utc())}})
        elif t in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
            await _sincronizar_assinatura(obj, ts)
        elif t == "invoice.payment_failed":
            await _pagamento_falhou(obj)
    except Exception:
        logger.exception(f"Falha processando evento Stripe {eid} ({t})")
        await db.stripe_events.delete_one({"id": eid})  # libera para o reenvio do Stripe
        raise HTTPException(500, "Erro ao processar evento")
    return {"status": "ok"}

# ------------------------------------------------------------
# ✅ Cron diário: avisos de fim de teste (acionar 1x/dia com WEBHOOK_CRON_SECRET)
# ------------------------------------------------------------
def _check_cron_secret(authorization: Optional[str]):
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    if not secret or not authorization or not authorization.startswith("Bearer ") or not hmac.compare_digest(authorization[7:], secret):
        raise HTTPException(401, "Unauthorized")

@api.post("/cron/diario")
async def cron_diario(authorization: Optional[str] = Header(None)):
    _check_cron_secret(authorization)
    now = now_utc()
    enviados = {"trial_acabando": 0, "trial_expirado": 0}
    async for u in db.users.find({"plan": "trial"}, {"_id": 0, "id": 1, "email": 1, "name": 1, "trial_ends_at": 1,
                                                    "aviso_trial_acabando": 1, "aviso_trial_expirado": 1}):
        te = _parse_date(u.get("trial_ends_at"))
        if not te or is_superadmin(u): continue
        restante = te - now
        nome = html.escape(u.get("name") or "")
        if timedelta(0) < restante <= timedelta(days=2) and not u.get("aviso_trial_acabando"):
            await send_email(u["email"], "Seu teste do OmniRepMax termina em breve", _email_layout(
                "Seu teste está acabando",
                [f"Olá{', ' + nome if nome else ''}! Seu teste grátis termina em {fmt_data_br(te)}.",
                 "Assine agora para não perder o acesso — a primeira cobrança só acontece quando o teste acabar."],
                "Escolher meu plano", f"{FRONTEND_URL}/planos"))
            await db.users.update_one({"id": u["id"]}, {"$set": {"aviso_trial_acabando": iso(now)}})
            enviados["trial_acabando"] += 1
        elif timedelta(days=-3) < restante <= timedelta(0) and not u.get("aviso_trial_expirado"):
            await send_email(u["email"], "Seu teste do OmniRepMax terminou", _email_layout(
                "Seu teste terminou",
                [f"Olá{', ' + nome if nome else ''}! Seu período de teste acabou e sua conta ficou em modo consulta.",
                 "Seus dados continuam guardados. Assine um plano para voltar a lançar pedidos e comissões."],
                "Assinar agora", f"{FRONTEND_URL}/planos"))
            await db.users.update_one({"id": u["id"]}, {"$set": {"aviso_trial_expirado": iso(now)}})
            enviados["trial_expirado"] += 1
    return {"ok": True, "enviados": enviados}

def fmt_data_br(d: datetime) -> str:
    return d.astimezone(timezone(timedelta(hours=-3))).strftime("%d/%m/%Y")

# ------------------------------------------------------------
# ✅ Superadmin: assinantes e cortesias (pilotos, parceiros, extensão de teste)
# ------------------------------------------------------------
class AssinanteUpdateIn(BaseModel):
    # dados cadastrais
    name: Optional[str] = None
    empresa: Optional[str] = None
    telefone: Optional[str] = None
    # acesso
    dias_extras_trial: Optional[int] = None   # estende o teste a partir de hoje (ou do fim atual, se maior)
    encerrar_teste: bool = False              # vence o teste agora (conta vai para modo consulta)
    cortesia_plano: Optional[str] = None      # "solo" | "pro" | "equipe" → acesso liberado sem cobrança
    cortesia_ate: Optional[str] = None        # opcional: data em que a cortesia termina
    remover_cortesia: bool = False

class ExcluirContaIn(BaseModel):
    confirmacao_email: str

def _tem_assinatura_stripe_ativa(u: dict) -> bool:
    return bool(u.get("stripe_subscription_id")) and u.get("subscription_status") in {"active", "trialing", "past_due"}

async def _contagem_por_tenant(colecao: str) -> Dict[str, int]:
    out: Dict[str, int] = {}
    async for d in db[colecao].aggregate([{"$group": {"_id": "$tenant_id", "n": {"$sum": 1}}}]):
        if d.get("_id"): out[d["_id"]] = d["n"]
    return out

@api.get("/admin/assinantes")
async def listar_assinantes(current=Depends(get_current_user)):
    require_superadmin(current)
    pedidos, clientes = await asyncio.gather(_contagem_por_tenant("pedidos"), _contagem_por_tenant("clientes"))
    out = []
    async for u in db.users.find({}, {"_id": 0, "password_hash": 0, "logo": 0}).sort("created_at", -1).limit(2000):
        sit = _situacao_assinatura(u, u)
        tid = u.get("tenant_id") or u["id"]
        out.append({k: u.get(k) for k in ("id", "email", "name", "empresa", "telefone", "plan", "subscription_status",
                                           "trial_ends_at", "current_period_end", "cancel_at_period_end", "cortesia_ate",
                                           "stripe_customer_id", "email_verified", "created_at", "last_login_at")} | {
            "acesso": sit["acesso"], "plano_efetivo": sit["plano"], "motivo": sit.get("motivo"),
            "dias_restantes": sit.get("dias_restantes"), "is_superadmin": is_superadmin(u),
            "stripe_ativo": _tem_assinatura_stripe_ativa(u),
            "uso": {"pedidos": pedidos.get(tid, 0), "clientes": clientes.get(tid, 0)},
        })
    return out

@api.patch("/admin/assinantes/{uid}")
async def atualizar_assinante(uid: str, body: AssinanteUpdateIn, current=Depends(get_current_user)):
    require_superadmin(current)
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0, "logo": 0})
    if not u: raise HTTPException(404, "Usuário não encontrado")
    updates: Dict[str, Any] = {}

    # Dados cadastrais: sempre editáveis
    for campo in ("name", "empresa", "telefone"):
        v = getattr(body, campo)
        if v is not None:
            updates[campo] = v.strip()
    if "name" in updates and not updates["name"]:
        raise HTTPException(400, "O nome não pode ficar vazio")

    # Acesso: bloqueado se houver cobrança ativa no Stripe (evita cobrar e liberar ao mesmo tempo)
    mexe_acesso = body.remover_cortesia or body.encerrar_teste or body.dias_extras_trial or body.cortesia_plano
    if mexe_acesso:
        if is_superadmin(u):
            raise HTTPException(400, "A conta de administrador da plataforma não tem teste nem plano.")
        if _tem_assinatura_stripe_ativa(u):
            raise HTTPException(409, "Este cliente tem assinatura ativa no Stripe. Altere o plano pelo painel do Stripe.")
    if body.remover_cortesia or body.encerrar_teste:
        updates.update({"plan": "trial", "subscription_status": None, "cortesia_ate": None,
                        "trial_ends_at": iso(now_utc() - timedelta(seconds=1))})
    if body.dias_extras_trial:
        dias = int(body.dias_extras_trial)
        if not 1 <= dias <= 365: raise HTTPException(400, "Informe entre 1 e 365 dias")
        base = max(now_utc(), _parse_date(u.get("trial_ends_at")) or now_utc()) if u.get("plan") in (None, "trial") else now_utc()
        updates.update({"plan": "trial", "subscription_status": None, "cortesia_ate": None,
                        "trial_ends_at": iso(base + timedelta(days=dias)),
                        "aviso_trial_acabando": None, "aviso_trial_expirado": None})
    if body.cortesia_plano:
        if body.cortesia_plano not in PLANOS_PAGOS: raise HTTPException(400, "Plano inválido")
        if body.cortesia_ate and not _parse_date(body.cortesia_ate): raise HTTPException(400, "Data da cortesia inválida")
        updates.update({"plan": body.cortesia_plano, "subscription_status": "cortesia",
                        "cortesia_ate": iso(_parse_date(body.cortesia_ate)) if body.cortesia_ate else None})
    if not updates: raise HTTPException(400, "Nada para alterar")

    await db.users.update_one({"id": uid}, {"$set": updates})
    await _log_auditoria(current, "assinante_alterado_superadmin", "users", uid,
                         before={k: u.get(k) for k in ("name", "empresa", "telefone", "plan", "subscription_status", "trial_ends_at", "cortesia_ate")},
                         after=updates)
    novo = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0, "logo": 0})
    return {"ok": True, "situacao": _situacao_assinatura(novo, novo), "plan": novo.get("plan"),
            "subscription_status": novo.get("subscription_status"), "trial_ends_at": novo.get("trial_ends_at")}

@api.post("/admin/assinantes/{uid}/excluir")
async def excluir_conta(uid: str, body: ExcluirContaIn, current=Depends(get_current_user)):
    """Exclui a conta e TODOS os dados da empresa (LGPD). Cancela a cobrança no Stripe antes."""
    require_superadmin(current)
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0, "logo": 0})
    if not u: raise HTTPException(404, "Usuário não encontrado")
    if uid == current["id"] or is_superadmin(u):
        raise HTTPException(400, "Não é possível excluir a conta de administrador da plataforma.")
    if (body.confirmacao_email or "").strip().lower() != (u.get("email") or "").lower():
        raise HTTPException(400, "O e-mail digitado não confere com o da conta.")

    # 1) Para a cobrança primeiro. Se não conseguir, NÃO apaga (evita cobrar quem não tem mais conta).
    stripe_cancelado = False
    if _tem_assinatura_stripe_ativa(u):
        if not STRIPE_SECRET_KEY:
            raise HTTPException(409, "Esta conta tem assinatura ativa. Cancele no painel do Stripe antes de excluir.")
        try:
            await asyncio.to_thread(lambda: stripe.Subscription.cancel(u["stripe_subscription_id"]))
            stripe_cancelado = True
        except stripe.error.InvalidRequestError as e:
            if "No such subscription" not in str(e):
                raise HTTPException(502, f"Não foi possível cancelar a assinatura no Stripe: {getattr(e, 'user_message', None) or e}")
        except stripe.error.StripeError as e:
            raise HTTPException(502, f"Não foi possível cancelar a assinatura no Stripe: {getattr(e, 'user_message', None) or e}")

    # 2) Apaga os dados da empresa
    tid = u.get("tenant_id") or u["id"]
    removidos: Dict[str, int] = {}
    for col in RESET_COLLECTIONS + ["counters", "audit_log"]:
        try:
            r = await db[col].delete_many({"tenant_id": tid})
            if r.deleted_count: removidos[col] = r.deleted_count
        except Exception as e:
            logger.error(f"Exclusão de conta {uid}: falha em {col}: {e}")
    ids = [x["id"] async for x in db.users.find({"$or": [{"tenant_id": tid}, {"id": uid}]}, {"id": 1, "_id": 0})]
    for col in ("password_resets", "email_verifications"):
        await db[col].delete_many({"user_id": {"$in": ids}})
    r = await db.leads.delete_many({"email": (u.get("email") or "").lower()})
    if r.deleted_count: removidos["leads"] = r.deleted_count
    r = await db.users.delete_many({"id": {"$in": ids}})
    removidos["users"] = r.deleted_count

    # 3) Registro mínimo (sem dados pessoais além do e-mail, para rastrear a solicitação)
    await _log_auditoria(current, "conta_excluida_superadmin", "users", uid,
                         extra={"email": u.get("email"), "tenant_id": tid, "removidos": removidos,
                                "stripe_cancelado": stripe_cancelado})
    return {"ok": True, "removidos": removidos, "stripe_cancelado": stripe_cancelado}

# ------------------------------------------------------------
# System Reset
# ------------------------------------------------------------
RESET_COLLECTIONS = ["clientes", "representadas", "produtos", "pedidos",
                     "oportunidades", "visitas", "comissoes", "contas_receber",
                     "contas_pagar", "xml_files", "documentos", "faturamentos",
                     "insights_ai", "max_ai_messages", "regras_comissao",
                     "recebiveis_industria"]

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
                "contas_pagar", "xml_files", "documentos", "faturamentos",
                "regras_comissao", "recebiveis_industria"]:
        try: await db[col].create_index("id")
        except Exception: pass
        try: await db[col].create_index("tenant_id")
        except Exception: pass

    try: await db.stripe_events.create_index("id", unique=True)
    except Exception: pass
    try: await db.users.create_index("stripe_customer_id", sparse=True)
    except Exception: pass
    for col, campo in [("password_resets", "token_hash"), ("email_verifications", "token_hash")]:
        try: await db[col].create_index(campo)
        except Exception: pass

    # ✅ Conta do dono: só com ADMIN_EMAIL + ADMIN_PASSWORD definidos.
    # A senha NÃO é sobrescrita a cada deploy (só com ADMIN_FORCE_PASSWORD_RESET=1).
    admin_email = ADMIN_EMAIL
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not IS_PROD and not (admin_email and admin_password):
        admin_email, admin_password = "admin@example.com", "admin123"  # conveniência só em dev
        SUPERADMIN_EMAILS.add(admin_email)

    admin_tid = None
    if admin_email and admin_password:
        if IS_PROD and len(admin_password) < 12:
            logger.warning("ADMIN_PASSWORD tem menos de 12 caracteres. Use uma senha mais forte.")
        existing = await db.users.find_one({"email": admin_email})
        if existing is None:
            uid = new_id()
            await db.users.insert_one({
                "id": uid, "tenant_id": uid, "email": admin_email,
                "password_hash": hash_pw(admin_password), "name": "Álvaro",
                "role": "admin", "plan": "pro", "subscription_status": "active",
                "email_verified": True, "created_at": iso(now_utc())
            })
            existing = await db.users.find_one({"email": admin_email})
        else:
            patch = {}
            if os.environ.get("ADMIN_FORCE_PASSWORD_RESET") == "1" and not verify_pw(admin_password, existing["password_hash"]):
                patch["password_hash"] = hash_pw(admin_password)
                patch["password_changed_at"] = iso(now_utc())
            if not existing.get("tenant_id"): patch["tenant_id"] = existing["id"]
            if existing.get("plan") != "pro": patch["plan"] = "pro"
            if existing.get("subscription_status") != "active": patch["subscription_status"] = "active"
            if existing.get("trial_ends_at"): patch["trial_ends_at"] = None
            if patch: await db.users.update_one({"email": admin_email}, {"$set": patch})
        admin_tid = (existing.get("tenant_id") or existing["id"])
    elif IS_PROD:
        logger.warning("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: conta do dono não será criada/atualizada.")

    # ✅ Dados de demonstração nunca entram em produção (salvo SEED_DEMO=1)
    if not IS_PROD or os.environ.get("SEED_DEMO") == "1":
        try:
            from seed import seed_demo
            await seed_demo(db)
        except ImportError: pass

    if admin_tid:
        for col in ["representadas", "clientes", "produtos", "pedidos",
                    "oportunidades", "visitas", "comissoes", "contas_receber",
                    "contas_pagar", "xml_files", "documentos", "faturamentos",
                    "regras_comissao", "recebiveis_industria"]:
            await db[col].update_many({"tenant_id": {"$exists": False}}, {"$set": {"tenant_id": admin_tid}})

@app.on_event("shutdown")
async def shutdown():
    client.close()
