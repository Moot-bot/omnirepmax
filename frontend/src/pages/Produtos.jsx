import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Edit2, Trash2, Package, Search, Barcode, Tag } from "lucide-react";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

const empty = { nome: "", codigo: "", ean: "", sku: "", descricao: "", categoria: "", marca: "", representada_id: "", preco_tabela: 0, custo: 0, unidade: "UN", status: "ativo", qtd_por_caixa: 1 };

export default function Produtos() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [q, setQ] = useState("");
  const [rep, setRep] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  // Resolve o warning do ESLint
  const load = useCallback(async () => { 
    try {
      const { data } = await api.get("/produtos", { params: rep !== "all" ? { representada_id: rep } : {} }); 
      setList(data); 
    } catch {
      toast.error("Erro ao carregar produtos");
    }
  }, [rep]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/representadas").then((r) => setReps(r.data)).catch(() => {}); }, []);

  const save = async () => {
    if (!form.nome) return toast.error("O nome do produto é obrigatório");
    try { 
      if (editing) await api.put(`/produtos/${editing}`, form); 
      else await api.post("/produtos", form); 
      toast.success("Produto salvo com sucesso!"); 
      setOpen(false); setForm(empty); setEditing(null); load(); 
    }
    catch { toast.error("Erro ao salvar produto"); }
  };

  const edit = (p) => { setForm({ ...empty, ...p }); setEditing(p.id); setOpen(true); };
  const del = async (id) => { 
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return; 
    try { await api.delete(`/produtos/${id}`); toast.success("Excluído"); load(); } catch { toast.error("Erro ao excluir"); }
  };

  const filtered = list.filter((p) => { 
    const s = q.toLowerCase(); 
    return !s || (p.nome || "").toLowerCase().includes(s) || (p.codigo || "").toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s); 
  });
  const repName = (id) => reps.find((r) => r.id === id)?.nome_fantasia || "-";

  return (
    <div className="pb-10">
      <PageHeader 
        title="Produtos" 
        subtitle="Catálogo geral filtrável por representada" 
        actions={
          <Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF] shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />Novo produto
          </Button>
        } 
      />
      
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, SKU, código..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
          />
        </div>
        <Select value={rep} onValueChange={setRep}>
          <SelectTrigger className="w-full sm:w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="Representada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas representadas</SelectItem>
            {reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia || r.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Nenhum produto encontrado</h3>
          <p className="text-sm text-slate-500 mb-4">Cadastre um novo item ou ajuste os filtros de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/30 overflow-hidden">
              
              {/* Imagem / Placeholder */}
              <div className="h-36 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-800">
                <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform duration-300" />
                {p.status === "inativo" && (
                  <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Inativo</div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate mb-1">
                  {repName(p.representada_id)}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2 flex-1" title={p.nome}>
                  {p.nome}
                </h3>
                
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  {p.sku && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                      <Tag className="w-3 h-3" /> {p.sku}
                    </span>
                  )}
                  {p.ean && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                      <Barcode className="w-3 h-3" /> {p.ean}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Preço Tabela</div>
                    <div className="font-mono font-bold text-lg text-slate-900 dark:text-white">{fmtBRL(p.preco_tabela)}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => edit(p)} className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => del(p.id)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Sessão 1: Info Básicas */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-[#075BFF]" />Informações Básicas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2"><Label>Nome do Produto <span className="text-rose-500">*</span></Label><Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Detergente Líquido 500ml" /></div>
                <div className="space-y-1.5"><Label>Código Interno</Label><Input value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: COD-123" /></div>
                <div className="space-y-1.5"><Label>SKU</Label><Input value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: SKU-456" /></div>
                <div className="space-y-1.5"><Label>EAN (Código de Barras)</Label><Input value={form.ean || ""} onChange={(e) => setForm({ ...form, ean: e.target.value })} placeholder="Ex: 7891234567890" /></div>
                <div className="space-y-1.5"><Label>Marca</Label><Input value={form.marca || ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ex: Ypê" /></div>
              </div>
            </div>

            {/* Sessão 2: Vínculo */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-[#08D5F5]" />Vínculo e Categoria</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Representada</Label>
                  <Select value={form.representada_id || ""} onValueChange={(v) => setForm({ ...form, representada_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia || r.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Limpeza" /></div>
              </div>
            </div>

            {/* Sessão 3: Preços e Logística */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Barcode className="w-4 h-4 text-amber-500" />Preços e Logística</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Preço de Tabela (R$)</Label><Input type="number" step="0.01" value={form.preco_tabela} onChange={(e) => setForm({ ...form, preco_tabela: parseFloat(e.target.value || 0) })} /></div>
                <div className="space-y-1.5"><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: parseFloat(e.target.value || 0) })} /></div>
                <div className="space-y-1.5"><Label>Unidade</Label>
                  <Select value={form.unidade || "UN"} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN (Unidade)</SelectItem>
                      <SelectItem value="CX">CX (Caixa)</SelectItem>
                      <SelectItem value="KG">KG (Quilograma)</SelectItem>
                      <SelectItem value="L">L (Litro)</SelectItem>
                      <SelectItem value="M">M (Metro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Qtd. por Caixa</Label><Input type="number" value={form.qtd_por_caixa || 1} onChange={(e) => setForm({ ...form, qtd_por_caixa: parseInt(e.target.value || 0) })} /></div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar Produto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}