import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, FileCheck2, Eye, Edit2 } from "lucide-react";
import { fmtBRL, fmtDate } from "../lib/format";
import { toast } from "sonner";

const EMPTY = { cliente_id: "", representada_id: "", condicao_pagamento: "30 dias", itens: [], desconto_geral: 0, frete: 0, observacoes: "", status: "rascunho" };

export default function Pedidos() {
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [reps, setReps] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = async () => setList((await api.get("/pedidos")).data);
  useEffect(() => { load(); api.get("/clientes").then((r) => setClientes(r.data)); api.get("/representadas").then((r) => setReps(r.data)); api.get("/produtos").then((r) => setProdutos(r.data)); }, []);

  const clienteName = (id) => { const c = clientes.find((x) => x.id === id); return c ? (c.nome_fantasia || c.razao_social) : "-"; };
  const repName = (id) => reps.find((r) => r.id === id)?.nome_fantasia || "-";
  const prodById = (id) => produtos.find((p) => p.id === id);

  const totais = useMemo(() => {
    let sub = 0;
    form.itens.forEach((it) => { sub += (it.quantidade || 0) * (it.preco_unitario || 0) * (1 - (it.desconto || 0) / 100); });
    const total = sub - sub * (form.desconto_geral || 0) / 100 + Number(form.frete || 0);
    return { subtotal: sub, total };
  }, [form]);

  const openNew = () => { setForm(EMPTY); setEditingId(null); setOpen(true); };
  const openEdit = (p) => { setForm({ cliente_id: p.cliente_id, representada_id: p.representada_id, condicao_pagamento: p.condicao_pagamento || "30 dias", itens: (p.itens || []).map((it) => ({ produto_id: it.produto_id, nome: it.nome, descricao: it.descricao || (prodById(it.produto_id)?.descricao || ""), quantidade: it.quantidade, preco_unitario: it.preco_unitario, desconto: it.desconto || 0 })), desconto_geral: p.desconto_geral || 0, frete: p.frete || 0, observacoes: p.observacoes || "", status: p.status }); setEditingId(p.id); setOpen(true); };

  const addItem = () => setForm({ ...form, itens: [...form.itens, { produto_id: "", nome: "", descricao: "", quantidade: 1, preco_unitario: 0, desconto: 0 }] });
  const upItem = (i, k, v) => { const it = [...form.itens]; it[i] = { ...it[i], [k]: v }; setForm({ ...form, itens: it }); };
  const rmItem = (i) => setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) });
  const pickProd = (i, pid) => {
    const p = produtos.find((x) => x.id === pid); if (!p) return;
    const it = [...form.itens];
    it[i] = { ...it[i], produto_id: pid, nome: p.nome, descricao: p.descricao || "", preco_unitario: p.preco_tabela };
    setForm({ ...form, itens: it });
  };

  const save = async () => {
    if (!form.cliente_id || !form.representada_id || form.itens.length === 0) return toast.error("Preencha cliente, representada e ao menos 1 item");
    const payload = { ...form, itens: form.itens.map((it) => ({ produto_id: it.produto_id, nome: it.nome, quantidade: Number(it.quantidade || 0), preco_unitario: Number(it.preco_unitario || 0), desconto: Number(it.desconto || 0) })) };
    try {
      if (editingId) { await api.put(`/pedidos/${editingId}`, payload); toast.success("Pedido atualizado"); }
      else { await api.post("/pedidos", payload); toast.success("Pedido criado"); }
      setOpen(false); setForm(EMPTY); setEditingId(null); load();
    } catch { toast.error("Erro ao salvar"); }
  };

  const changeStatus = async (id, novo) => { await api.patch(`/pedidos/${id}/status`, { status: novo }); toast.success(`Status: ${novo}`); load(); };
  const del = async (p) => {
    if (!window.confirm(`Excluir pedido ${p.numero}? Esta ação não pode ser desfeita.`)) return;
    try { await api.delete(`/pedidos/${p.id}`); toast.success("Pedido excluído"); load(); if (viewing?.id === p.id) setViewing(null); }
    catch (e) { toast.error("Erro ao excluir"); }
  };

  const prodsDaRep = produtos.filter((p) => !form.representada_id || p.representada_id === form.representada_id);
  const canChangeStatus = (p) => p.status !== "faturado" && p.status !== "cancelado";

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Emissão, cálculo automático de comissão, controle de status" actions={
        <Button data-testid="btn-new-pedido" onClick={openNew} className="bg-[#0A1A3B] hover:bg-[#1E3A8A] text-white"><Plus className="w-4 h-4 mr-1" />Novo pedido</Button>
      } />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nº</th>
              <th className="text-left px-4 py-3 font-semibold">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold">Representada</th>
              <th className="text-left px-4 py-3 font-semibold">Data</th>
              <th className="text-center px-4 py-3 font-semibold">Itens</th>
              <th className="text-right px-4 py-3 font-semibold">Total</th>
              <th className="text-right px-4 py-3 font-semibold">Comissão</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3 font-mono text-xs">{p.numero}</td>
                <td className="px-4 py-3">{clienteName(p.cliente_id)}</td>
                <td className="px-4 py-3">{repName(p.representada_id)}</td>
                <td className="px-4 py-3 text-xs">{fmtDate(p.data_pedido)}</td>
                <td className="px-4 py-3 text-center font-mono text-xs">{(p.itens || []).length}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtBRL(p.total)}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">{fmtBRL(p.comissao_valor)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button data-testid={`btn-view-pedido-${p.id}`} variant="ghost" size="sm" onClick={() => setViewing(p)} title="Ver detalhes"><Eye className="w-4 h-4" /></Button>
                  {canChangeStatus(p) && <Button data-testid={`btn-edit-pedido-${p.id}`} variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar"><Edit2 className="w-4 h-4" /></Button>}
                  <Button data-testid={`btn-del-pedido-${p.id}`} variant="ghost" size="sm" onClick={() => del(p)} title="Excluir" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Nenhum pedido. Clique em "Novo pedido" para começar.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Dialog NOVO/EDITAR */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar pedido" : "Novo pedido"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Representada *</Label>
              <Select value={form.representada_id} onValueChange={(v) => setForm({ ...form, representada_id: v })}>
                <SelectTrigger data-testid="ped-representada"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger data-testid="ped-cliente"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Condição pagamento</Label><Input value={form.condicao_pagamento} onChange={(e) => setForm({ ...form, condicao_pagamento: e.target.value })} /></div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Itens do pedido</Label>
              <Button size="sm" variant="outline" onClick={addItem} data-testid="btn-add-item"><Plus className="w-3.5 h-3.5 mr-1" />Adicionar item</Button>
            </div>
            {/* Cabeçalho de colunas */}
            {form.itens.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <div className="col-span-5">Produto / Descrição</div>
                <div className="col-span-1 text-center">Qtd</div>
                <div className="col-span-2 text-right">Preço unit.</div>
                <div className="col-span-1 text-center">Desc %</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>
            )}
            <div className="space-y-2">
              {form.itens.map((it, i) => {
                const sub = (it.quantidade || 0) * (it.preco_unitario || 0) * (1 - (it.desconto || 0) / 100);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="col-span-12 md:col-span-5">
                      <Select value={it.produto_id} onValueChange={(v) => pickProd(i, v)}>
                        <SelectTrigger data-testid={`item-produto-${i}`} className="text-xs"><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                        <SelectContent>{prodsDaRep.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} <span className="text-slate-400 ml-1">· {p.sku || p.codigo}</span></SelectItem>)}</SelectContent>
                      </Select>
                      <Input data-testid={`item-descricao-${i}`} value={it.descricao || ""} onChange={(e) => upItem(i, "descricao", e.target.value)} placeholder="Descrição / observação do item (opcional)" className="mt-1.5 text-xs" />
                    </div>
                    <div className="col-span-3 md:col-span-1"><Input data-testid={`item-qtd-${i}`} type="number" min="0" placeholder="Qtd" value={it.quantidade} onChange={(e) => upItem(i, "quantidade", parseFloat(e.target.value || 0))} className="text-center" /></div>
                    <div className="col-span-5 md:col-span-2"><Input data-testid={`item-preco-${i}`} type="number" step="0.01" min="0" placeholder="Preço" value={it.preco_unitario} onChange={(e) => upItem(i, "preco_unitario", parseFloat(e.target.value || 0))} className="text-right font-mono" /></div>
                    <div className="col-span-2 md:col-span-1"><Input data-testid={`item-desc-${i}`} type="number" min="0" max="100" placeholder="%" value={it.desconto} onChange={(e) => upItem(i, "desconto", parseFloat(e.target.value || 0))} className="text-center" /></div>
                    <div className="col-span-10 md:col-span-2 text-right font-mono text-sm font-bold self-center">{fmtBRL(sub)}</div>
                    <div className="col-span-2 md:col-span-1 flex justify-end"><Button size="sm" variant="ghost" onClick={() => rmItem(i)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button></div>
                  </div>
                );
              })}
              {form.itens.length === 0 && <div className="text-sm text-slate-500 text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">Nenhum item ainda. Clique em "Adicionar item".</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="space-y-1"><Label>Desconto geral %</Label><Input type="number" min="0" max="100" value={form.desconto_geral} onChange={(e) => setForm({ ...form, desconto_geral: parseFloat(e.target.value || 0) })} /></div>
            <div className="space-y-1"><Label>Frete (R$)</Label><Input type="number" step="0.01" min="0" value={form.frete} onChange={(e) => setForm({ ...form, frete: parseFloat(e.target.value || 0) })} /></div>
            <div className="col-span-2 flex flex-col justify-end items-end text-right">
              <div className="text-xs text-slate-500">Subtotal: <span className="font-mono">{fmtBRL(totais.subtotal)}</span></div>
              <div className="text-xs text-slate-500 mt-0.5">Total do pedido</div>
              <div className="font-mono font-extrabold text-[#0A1A3B] dark:text-blue-400 text-2xl">{fmtBRL(totais.total)}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button data-testid="btn-save-pedido" onClick={save} className="bg-[#0A1A3B] hover:bg-[#1E3A8A] text-white"><FileCheck2 className="w-4 h-4 mr-1" />{editingId ? "Salvar alterações" : "Criar pedido"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog VISUALIZAR */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pedido {viewing?.numero}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div><div className="text-[10px] uppercase font-semibold text-slate-500">Cliente</div><div className="font-semibold text-sm mt-1">{clienteName(viewing.cliente_id)}</div></div>
                <div><div className="text-[10px] uppercase font-semibold text-slate-500">Representada</div><div className="font-semibold text-sm mt-1">{repName(viewing.representada_id)}</div></div>
                <div><div className="text-[10px] uppercase font-semibold text-slate-500">Data</div><div className="font-semibold text-sm mt-1">{fmtDate(viewing.data_pedido)}</div></div>
                <div><div className="text-[10px] uppercase font-semibold text-slate-500">Status</div><div className="mt-1"><StatusBadge status={viewing.status} /></div></div>
                <div><div className="text-[10px] uppercase font-semibold text-slate-500">Condição</div><div className="text-sm mt-1">{viewing.condicao_pagamento || "-"}</div></div>
                <div><div className="text-[10px] uppercase font-semibold text-slate-500">NF-e</div><div className="text-sm mt-1 font-mono">{viewing.nf_numero || "-"}</div></div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Itens ({(viewing.itens || []).length})</div>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold">Produto</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold">Qtd</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold">Preço unit.</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold">Desc %</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewing.itens || []).map((it, i) => {
                        const prod = prodById(it.produto_id);
                        const sub = it.subtotal ?? (it.quantidade * it.preco_unitario * (1 - (it.desconto || 0) / 100));
                        return (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <td className="px-3 py-2">
                              <div className="font-medium">{it.nome}</div>
                              {(it.descricao || prod?.descricao) && <div className="text-xs text-slate-500 mt-0.5">{it.descricao || prod?.descricao}</div>}
                              {prod?.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {prod.sku}</div>}
                            </td>
                            <td className="px-3 py-2 text-center font-mono">{it.quantidade}</td>
                            <td className="px-3 py-2 text-right font-mono">{fmtBRL(it.preco_unitario)}</td>
                            <td className="px-3 py-2 text-center font-mono text-xs">{it.desconto || 0}%</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">{fmtBRL(sub)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{fmtBRL(viewing.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Desconto geral</span><span className="font-mono">{viewing.desconto_geral || 0}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Frete</span><span className="font-mono">{fmtBRL(viewing.frete)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700"><span className="font-semibold">Total</span><span className="font-mono font-extrabold text-[#0A1A3B] dark:text-blue-400">{fmtBRL(viewing.total)}</span></div>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 space-y-1 text-sm">
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">Comissão</div>
                  <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Percentual</span><span className="font-mono">{viewing.comissao_percentual}%</span></div>
                  <div className="flex justify-between items-baseline pt-1"><span className="text-slate-600 dark:text-slate-300">Valor</span><span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-xl">{fmtBRL(viewing.comissao_valor)}</span></div>
                </div>
              </div>

              {viewing.observacoes && (
                <div><div className="text-xs font-semibold uppercase text-slate-500 mb-1">Observações</div><div className="text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">{viewing.observacoes}</div></div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <Select value={viewing.status} onValueChange={(v) => { changeStatus(viewing.id, v); setViewing({ ...viewing, status: v }); }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="enviado">Enviado</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="faturado">Faturado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent>
                </Select>
                <div className="flex gap-2">
                  {canChangeStatus(viewing) && <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing); }}><Edit2 className="w-4 h-4 mr-1" />Editar</Button>}
                  <Button variant="outline" onClick={() => del(viewing)} className="text-rose-600 border-rose-200 hover:bg-rose-50"><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
