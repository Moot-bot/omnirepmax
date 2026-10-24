import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, CheckCircle2, Clock, Trash2, RefreshCw, DollarSign } from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";

export default function RecebiveisIndustria() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  const [openNew, setOpenNew] = useState(false);
  const [openRecv, setOpenRecv] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    representada_id: "", cliente_id: "", pedido_id: "",
    numero_documento: "", valor: 0,
    vencimento: new Date().toISOString().split("T")[0],
    observacoes: "",
  });
  const [recvForm, setRecvForm] = useState({ valor: 0, data: new Date().toISOString().split("T")[0] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const [rRes, repsRes, cRes, pRes] = await Promise.all([
        api.get(`/recebiveis-industria${params}`),
        api.get("/representadas"),
        api.get("/clientes"),
        api.get("/pedidos"),
      ]);
      setList(rRes.data);
      setReps(repsRes.data);
      setClientes(cRes.data);
      setPedidos(pRes.data);
    } catch { toast.error("Erro ao carregar recebíveis"); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const criar = async () => {
    if (!form.representada_id || !form.cliente_id || form.valor <= 0)
      return toast.error("Preencha representada, cliente e valor");
    setBusy(true);
    try {
      await api.post("/recebiveis-industria", {
        ...form,
        valor: Number(form.valor),
        pedido_id: form.pedido_id || "",
      });
      toast.success("Recebível criado!");
      setOpenNew(false);
      setForm({ ...form, valor: 0, numero_documento: "", observacoes: "", pedido_id: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Erro ao criar"); }
    finally { setBusy(false); }
  };

  const receber = async () => {
    if (!selected || recvForm.valor <= 0) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/recebiveis-industria/${selected.id}/receber`, {
        valor: Number(recvForm.valor),
        data: recvForm.data,
      });
      toast.success(data.comissao_liberada
        ? "Recebimento registrado! Comissão liberada automaticamente."
        : "Recebimento registrado!");
      setOpenRecv(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Erro ao receber"); }
    finally { setBusy(false); }
  };

  const excluir = async (r) => {
    if (!window.confirm(`Excluir recebível ${r.numero_documento || r.id}?`)) return;
    try {
      await api.delete(`/recebiveis-industria/${r.id}`);
      toast.success("Excluído");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Erro ao excluir"); }
  };

  const totalAberto = list.filter(r => r.status !== "recebido" && r.status !== "cancelado").reduce((s, r) => s + (r.saldo_pendente || 0), 0);

  return (
    <div className="pb-10">
      <PageHeader
        title="Recebíveis da Indústria"
        subtitle="O que a fábrica tem a receber do cliente — separado das suas comissões"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" /> Atualizar</Button>
            <Button onClick={() => setOpenNew(true)} className="bg-[#075BFF]"><Plus className="w-4 h-4 mr-2" /> Novo Recebível</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white">
          <div className="text-xs uppercase font-semibold opacity-80">Total em aberto (indústria)</div>
          <div className="text-2xl font-bold mt-1">{fmtBRL(totalAberto)}</div>
          <p className="text-xs opacity-70 mt-1">Não é receita sua — apenas controle</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs uppercase font-semibold text-slate-500">Total de títulos</div>
          <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{list.length}</div>
        </div>
      </div>

      <div className="mb-4">
        <Select value={filterStatus || "all"} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aberto">Em aberto</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Documento</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Cliente</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Representada</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Valor</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Saldo</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Vencimento</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-500">Carregando...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-500">Nenhum recebível cadastrado.</td></tr>
            ) : list.map(r => {
              const cli = clientes.find(c => c.id === r.cliente_id);
              const rep = reps.find(x => x.id === r.representada_id);
              const isAberto = r.status !== "recebido" && r.status !== "cancelado";
              return (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">{r.numero_documento || r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{cli?.nome_fantasia || cli?.razao_social || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{rep?.nome_fantasia || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">{fmtBRL(r.valor)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{fmtBRL(r.saldo_pendente)}</td>
                  <td className="px-4 py-3 text-center text-xs">{fmtDate(r.vencimento)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      r.status === "recebido" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                      r.status === "parcial" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {r.status === "recebido" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isAberto && (
                        <Button size="sm" onClick={() => { setSelected(r); setRecvForm({ valor: r.saldo_pendente, data: new Date().toISOString().split("T")[0] }); setOpenRecv(true); }} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                          <DollarSign className="w-3.5 h-3.5 mr-1" /> Receber
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => excluir(r)} className="text-slate-500 hover:text-rose-600 h-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: novo recebível */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Recebível da Indústria</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Representada *</Label>
              <Select value={form.representada_id} onValueChange={v => setForm({...form, representada_id: v, pedido_id: ""})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{reps.map(r => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia || r.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vincular a pedido (opcional)</Label>
              <Select value={form.pedido_id || "none"} onValueChange={v => setForm({...form, pedido_id: v === "none" ? "" : v})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {pedidos.filter(p => !form.representada_id || p.representada_id === form.representada_id).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.numero} — {fmtBRL(p.total)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Se vincular, ao receber o valor total a comissão em aguardando liquidez é liberada automaticamente.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <Label className="text-xs">Vencimento *</Label>
                <Input type="date" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Nº Documento</Label>
              <Input value={form.numero_documento} onChange={e => setForm({...form, numero_documento: e.target.value})} placeholder="NF, boleto..." className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={busy} className="bg-[#075BFF]">{busy ? "Salvando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: receber */}
      <Dialog open={openRecv} onOpenChange={setOpenRecv}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Recebimento</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Saldo pendente</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmtBRL(selected.saldo_pendente)}</p>
              </div>
              <div>
                <Label className="text-xs">Valor recebido</Label>
                <Input type="number" step="0.01" value={recvForm.valor} onChange={e => setRecvForm({...recvForm, valor: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={recvForm.data} onChange={e => setRecvForm({...recvForm, data: e.target.value})} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRecv(false)}>Cancelar</Button>
            <Button onClick={receber} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}