# OMNIREP MAX — CRM+ERP para Representantes Comerciais

## Problem Statement
Aplicativo web SaaS profissional de CRM+ERP especializado em representantes comerciais brasileiros com múltiplas indústrias. Centraliza Representada → Produtos → Clientes → Prospecção → Visitas → Negociação → Pedidos → Faturamento → Comissão → Financeiro.

## User Choices
- Núcleo funcional + dados demo, JWT auth, Emergent LLM Key, pt-BR
- Identidade visual oficial OMNIREP MAX: azul-marinho + royal + ciano + prata (Fev/2026)
- Logo oficial ORM carregado dos assets do usuário em `/public/brand/*`

## Architecture
- Backend: FastAPI + MongoDB (motor async), JWT + bcrypt, prefixo `/api`, `server.py` monolito + `seed.py`
- Frontend: React 19 + React Router 7 + TailwindCSS + Shadcn/UI + Recharts + Lucide + Inter font
- LLM: Emergent LLM Key via `emergentintegrations` (MAX AI)
- PWA: manifest + sw.js. Deployment health probe `/health` e `/api/health`
- Design tokens em `src/index.css`; componente `components/Logo.jsx` com imagens oficiais

## Implementado
### Core (v1)
- Auth JWT, Dashboard com KPIs e gráficos, CRUD Representadas/Clientes/Produtos/Pedidos, Funil Kanban, Agenda, Comissões, Contas a Pagar/Receber, Insights (MAX AI), Importação XML NF-e, Stripe sandbox, PWA, Landing `/lp`, Cron backup, Admin seed, Health endpoints

### Identity visual (Fev/2026)
- Design tokens globais + utilitários Tailwind (`bg-brand-cta`, `text-brand-gradient`)
- Logo oficial ORM nas 3 variantes (mark/wordmark/stacked) a partir dos assets do usuário
- Sidebar navy com gradiente, header padronizado, chips semânticos preservados
- Login/Signup/ForgotPassword/Landing/Plans/MaxAI/TrialBanner com nova identidade
- PWA manifest + meta tags atualizados

### Ajustes operacionais (Fev/2026)
- **Preços atualizados**: Solo R$ 69, Profissional R$ 99, Equipe R$ 129
  - `server.py::PLANS` + `setup_stripe.py` + Stripe Sandbox provisionado
- **Reset do Sistema** (admin only, tenant-scoped, auditável):
  - `GET /api/system/reset/preview` — retorna contagem por coleção antes da ação
  - `POST /api/system/reset` — valida role=admin, motivo (mín. 10 chars) + `confirmacao="RESETAR"`
  - `GET /api/system/reset/history` — lê `audit_log` filtrado por tenant
  - Escopo: `clientes, representadas, produtos, pedidos, oportunidades, visitas, comissoes, contas_receber, contas_pagar, insights_ai, max_ai_messages, payment_transactions`
  - Preservado: usuário, credenciais, plano, logo, trial, assinatura, audit_log
  - UI: seção "Zona de Perigo" em Configurações (apenas admin) + modal com preview, motivo, confirmação, histórico recente
- **DELETE buttons adicionados**:
  - Agenda (visitas): card header com ícone lixeira
  - Funil Kanban (oportunidades): botão nos cards (hover reveal)
  - Contas a Receber / Contas a Pagar: coluna de ações
  - Comissões: novo `DELETE /api/comissoes/{cid}` (bloqueia status=paga para proteger histórico)
  - Já existiam: Representadas, Clientes, Produtos, Pedidos

## Credentials (dev)
Veja `/app/memory/test_credentials.md`. Admin: `alvarofilho39@gmail.com` / `admin123`

## Backlog
### P1
- Catálogo digital público
- Automações (follow-up, cobrança)
- MAX AI avançado (previsão/churn)

### P2
- WhatsApp / Google Calendar / email
- Integração ERP indústrias
- App mobile nativo
- Rotas inteligentes no mapa
- Multiempresa/team management
