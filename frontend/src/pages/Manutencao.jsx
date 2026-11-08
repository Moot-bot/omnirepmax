import React, { useState } from "react";
import { ShieldCheck, Loader2, Wrench, Undo2, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

/**
 * Verificar e reparar dados (rota /manutencao).
 * 1) "Verificar" mostra o que está fora de sincronia, sem alterar nada.
 * 2) "Aplicar correções" faz backup e corrige.
 * 3) "Desfazer" restaura o backup.
 */
export default function Manutencao() {
  const [rel, setRel] = useState(null);
  const [aplicado, setAplicado] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const verificar = async () => {
    setOcupado("verificar"); setAplicado(null);
    try { setRel((await api.post("/manutencao/reparar")).data); }
    catch (e) { toast.error(e.response?.data?.detail || "Erro ao verificar."); }
    finally { setOcupado(null); }
  };

  const aplicar = async () => {
    if (!window.confirm("Aplicar as correções? Um backup será feito antes e você poderá desfazer.")) return;
    setOcupado("aplicar");
    try {
      const r = (await api.post("/manutencao/reparar?aplicar=true")).data;
      setAplicado(r); setRel(null);
      toast.success("Correções aplicadas!");
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao aplicar."); }
    finally { setOcupado(null); }
  };

  const desfazer = async () => {
    if (!window.confirm("Voltar todos os dados ao estado de antes das correções?")) return;
    setOcupado("desfazer");
    try {
      await api.post(`/manutencao/restaurar/${aplicado.backup_id}`);
      toast.success("Dados restaurados ao estado anterior.");
      setAplicado(null);
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao restaurar."); }
    finally { setOcupado(null); }
  };

  const r = aplicado || rel;
  const qtd = r ? (
    r.lancamentos_criados.length + r.comissoes_liberadas_por_liquidez.length + r.recebiveis_recalculados +
    r.pedidos_status_corrigido.length + r.pedidos_nf_preenchida +
    (r.comissoes_sincronizadas || []).length + (r.parcelas_orfas_canceladas || 0) +
    Object.values(r.numeros_em_texto).reduce((a, b) => a + b, 0) +
    Object.values(r.acentos_corrigidos).reduce((a, b) => a + b.registros, 0)
  ) : 0;

  const Bloco = ({ titulo, itens }) => itens.length > 0 && (
    <div>
      <p className="font-semibold text-slate-900 dark:text-white mb-1">{titulo}</p>
      <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-0.5">{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );

  return (
    <div className="pb-10 max-w-4xl">
      <PageHeader title="Verificar e reparar dados" subtitle="Sincroniza pedidos, comissões, Contas a Receber e Recebíveis da Indústria" />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <p>Esta ferramenta confere os lançamentos já feitos e corrige o que ficou fora de sincronia:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>comissões que não geraram lançamento em <b>Contas a Receber</b> (só o valor da comissão, nunca o do pedido);</li>
          <li>recebíveis da indústria com saldo ou status desatualizado, e comissões que já deveriam ter sido liberadas;</li>
          <li>comissões com saldo ou status diferente do que está em <b>Contas a Receber</b> (ex.: marcada como recebida sem baixa);</li>
          <li>pedidos faturados sem status ou número de NF atualizados;</li>
          <li>valores gravados como texto e nomes com acentos quebrados.</li>
        </ul>
        <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400"><ShieldCheck className="w-4 h-4" /> Nada é apagado. Antes de corrigir é feito um backup, e você pode desfazer.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={verificar} disabled={!!ocupado} variant="outline">
            {ocupado === "verificar" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />} Verificar (sem alterar)
          </Button>
          {rel && qtd > 0 && (
            <Button onClick={aplicar} disabled={!!ocupado} className="bg-[#075BFF] hover:bg-blue-600">
              {ocupado === "aplicar" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aplicar {qtd} correção(ões)
            </Button>
          )}
        </div>
      </div>

      {r && (
        <div className={`mt-6 rounded-2xl border p-5 space-y-4 ${aplicado ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
          <p className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            {aplicado ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {qtd === 0 ? "Tudo certo: nenhum dado fora de sincronia." : aplicado ? `${qtd} correção(ões) aplicada(s).` : `${qtd} correção(ões) encontrada(s). Nada foi alterado ainda.`}
          </p>
          <Bloco titulo="Lançamentos criados em Contas a Receber" itens={r.lancamentos_criados.map(l =>
            `Pedido ${l.pedido || "?"}${l.nf ? ` · NF ${l.nf}` : ""}: comissão de ${fmtBRL(l.valor_comissao)}${l.status === "aguardando_liquidez" ? " (aguardando liquidez)" : ""}`)} />
          <Bloco titulo="Comissões liberadas (a fábrica já recebeu)" itens={r.comissoes_liberadas_por_liquidez.map(p => `Pedido ${p}`)} />
          <Bloco titulo="Comissões ajustadas a Contas a Receber" itens={[
            ...(r.comissoes_sincronizadas || []).map(m => `Pedido ${m.pedido || "?"}: saldo ${fmtBRL(m.saldo_antes)} → ${fmtBRL(m.saldo_depois)}${m.status_antes !== m.status_depois ? ` · ${m.status_antes} → ${m.status_depois}` : ""}`),
            ...(r.parcelas_orfas_canceladas ? [`${r.parcelas_orfas_canceladas} parcela(s) de comissão que já não existe cancelada(s)`] : []),
          ]} />
          <Bloco titulo="Recebíveis da Indústria" itens={r.recebiveis_recalculados ? [`${r.recebiveis_recalculados} recebível(is) com saldo/status recalculado`] : []} />
          <Bloco titulo="Pedidos" itens={[
            ...(r.pedidos_status_corrigido.length ? [`Status corrigido: ${r.pedidos_status_corrigido.join(", ")}`] : []),
            ...(r.pedidos_nf_preenchida ? [`${r.pedidos_nf_preenchida} pedido(s) com número da NF preenchido`] : []),
          ]} />
          <Bloco titulo="Valores gravados como texto" itens={Object.entries(r.numeros_em_texto).map(([c, n]) => `${c.replace("_", " ")}: ${n} registro(s)`)} />
          <Bloco titulo="Acentos corrigidos" itens={Object.entries(r.acentos_corrigidos).map(([c, v]) => `${c.replace("_", " ")}: ${v.registros} registro(s)${v.exemplos.length ? ` — ex.: ${v.exemplos[0]}` : ""}`)} />
          <Bloco titulo="Avisos" itens={r.avisos} />
          {aplicado?.backup_id && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={desfazer} disabled={!!ocupado}>
                {ocupado === "desfazer" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Undo2 className="w-4 h-4 mr-2" />} Desfazer (restaurar backup)
              </Button>
              <span className="text-xs text-slate-500">Backup: {aplicado.backup_id}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
