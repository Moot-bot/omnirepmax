import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/Common";
import { LogoUpload } from "../components/LogoUpload";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import api from "../lib/api";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, ShieldAlert, Loader2 } from "lucide-react";

const COLLECTION_LABELS = {
  clientes: "Clientes",
  representadas: "Representadas",
  produtos: "Produtos",
  pedidos: "Pedidos",
  oportunidades: "Oportunidades (Funil)",
  visitas: "Agenda / Visitas",
  comissoes: "Comissões",
  contas_receber: "Contas a Receber",
  contas_pagar: "Contas a Pagar",
  insights_ai: "Insights AI salvos",
  max_ai_messages: "Histórico MAX AI",
  payment_transactions: "Transações Stripe (histórico local)",
};

export default function Configuracoes() {
  const { user, refresh } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [empresa, setEmpresa] = useState(user?.empresa || "");
  const [telefone, setTelefone] = useState(user?.telefone || "");
  const [logo, setLogo] = useState(user?.logo || "");
  const [busy, setBusy] = useState(false);

  // --- Reset system state ---
  const isAdmin = user?.role === "admin";
  const [resetOpen, setResetOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [preview, setPreview] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      api.get("/system/reset/history?limit=5").then(r => setHistory(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch("/auth/me", { name, logo, empresa, telefone });
      toast.success("Perfil atualizado!");
      await refresh?.();
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      toast.error("Erro ao salvar");
    } finally { setBusy(false); }
  };

  const openReset = async () => {
    setMotivo(""); setConfirmacao(""); setPreview(null);
    setResetOpen(true);
    try {
      const { data } = await api.get("/system/reset/preview");
      setPreview(data);
    } catch (e) {
      toast.error("Não foi possível carregar o escopo do reset");
      setResetOpen(false);
    }
  };

  const executeReset = async () => {
    if (motivo.trim().length < 10) {
      toast.error("Informe um motivo com pelo menos 10 caracteres"); return;
    }
    if (confirmacao.trim().toUpperCase() !== "RESETAR") {
      toast.error("Digite exatamente 'RESETAR' para confirmar"); return;
    }
    setResetBusy(true);
    try {
      const { data } = await api.post("/system/reset", { motivo: motivo.trim(), confirmacao: "RESETAR" });
      toast.success(`Reset concluído — ${data.total_deleted} registros removidos`);
      setResetOpen(false);
      // reload audit history and give the UI a moment before refreshing
      api.get("/system/reset/history?limit=5").then(r => setHistory(r.data)).catch(() => {});
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro ao executar reset");
    } finally { setResetBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Dados do representante, aparência e preferências" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="font-display font-bold text-lg mb-4">Meu perfil</div>
          <div className="mb-4"><LogoUpload value={logo} onChange={setLogo} label="Minha logo / avatar" testId="inp-logo-user" size={80} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Nome completo</Label><Input data-testid="inp-user-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input value={user?.email || ""} disabled /></div>
            <div className="space-y-1"><Label>Empresa / Escritório</Label><Input data-testid="inp-user-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Álvaro Representações Ltda" /></div>
            <div className="space-y-1"><Label>Telefone</Label><Input data-testid="inp-user-telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 98888-0000" /></div>
          </div>
          <div className="mt-5"><Button data-testid="btn-save-profile" onClick={save} disabled={busy} className="bg-[#075BFF] hover:bg-[#087BFF] text-white">{busy ? "Salvando..." : "Salvar perfil"}</Button></div>
        </div>
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="font-display font-bold text-lg mb-3">Aparência</div>
            <div className="flex items-center justify-between">
              <div><div className="text-sm">Tema</div><div className="text-xs text-slate-500 capitalize">{theme === "dark" ? "Escuro" : "Claro"}</div></div>
              <Button variant="outline" onClick={toggle} data-testid="btn-toggle-theme-settings">Alternar</Button>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="font-display font-bold text-lg mb-3">Conta</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Perfil</span><span className="capitalize font-semibold">{user?.role}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ID</span><span className="font-mono text-xs truncate max-w-[140px]">{user?.id}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Zona de Perigo — Resetar Sistema ===== */}
      {isAdmin && (
        <div className="mt-6 p-6 bg-white dark:bg-slate-900 rounded-xl border-2 border-rose-200 dark:border-rose-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-lg text-rose-700 dark:text-rose-400">Zona de Perigo — Resetar Sistema</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Permite reinicializar os dados operacionais do sistema conforme as permissões do usuário.
                Esta ação remove permanentemente clientes, pedidos, comissões e demais lançamentos deste
                tenant — a conta, credenciais, plano e configurações pessoais são preservados.
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  data-testid="btn-open-reset"
                  onClick={openReset}
                  variant="outline"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Resetar Sistema
                </Button>
                <span className="text-xs text-slate-500">Exige motivo e confirmação explícita.</span>
              </div>

              {history.length > 0 && (
                <div className="mt-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Histórico recente</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {history.map((h) => (
                      <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-slate-500">{new Date(h.finished_at).toLocaleString("pt-BR")}</span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${h.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {h.status} · {h.total_deleted} registros
                          </span>
                        </div>
                        <div className="mt-1 text-slate-700 dark:text-slate-300"><strong>Motivo:</strong> {h.motivo}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Reset confirmation dialog ===== */}
      <Dialog open={resetOpen} onOpenChange={(v) => { if (!resetBusy) setResetOpen(v); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />Confirmar reset do sistema
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os registros operacionais listados abaixo
              serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>

          {!preview ? (
            <div className="py-8 flex items-center justify-center text-slate-500 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Calculando escopo...
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Dados que serão apagados</span>
                  <span className="font-mono text-rose-600">{preview.total} registros</span>
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(preview.counts).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{COLLECTION_LABELS[k] || k}</span>
                      <span className={`font-mono text-xs ${v > 0 ? "text-rose-600 font-semibold" : "text-slate-400"}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <strong>Preservado:</strong> seu usuário, senha, logo, plano, assinatura, trial, configurações e o registro de auditoria deste reset.
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo-reset">Motivo do reset (obrigatório, mín. 10 caracteres)</Label>
                <Textarea
                  id="motivo-reset"
                  data-testid="inp-reset-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Correção de dados de implantação; reinicialização para início de operação..."
                  rows={3}
                  disabled={resetBusy}
                />
                <div className="text-xs text-slate-500">{motivo.trim().length}/10</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirma-reset">Digite <span className="font-mono font-bold">RESETAR</span> para confirmar</Label>
                <Input
                  id="confirma-reset"
                  data-testid="inp-reset-confirm"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="RESETAR"
                  disabled={resetBusy}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetBusy}>Cancelar</Button>
            <Button
              data-testid="btn-confirm-reset"
              onClick={executeReset}
              disabled={resetBusy || !preview || motivo.trim().length < 10 || confirmacao.trim().toUpperCase() !== "RESETAR"}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {resetBusy ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Executando...</> : <><RotateCcw className="w-4 h-4 mr-1.5" />Executar reset</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
