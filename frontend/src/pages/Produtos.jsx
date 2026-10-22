import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Edit2, Trash2, Package, Search, Barcode, Tag, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

const empty = { nome: "", codigo: "", ean: "", sku: "", descricao: "", categoria: "", marca: "", representada_id: "", preco_tabela: 0, custo: 0, unidade: "UN", status: "ativo", qtd_por_caixa: 1 };

// Se estiver usando dentro de Representadas.jsx, apague o 'export default function Produtos()'
// e use 'export function Produtos({ representadaId })'
export default function Produtos({ representadaId = null }) {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [q, setQ] = useState("");
  const [rep, setRep] = useState(representadaId || "all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  // Estados da Importação TXT
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => { 
    try {
      const targetRep = representadaId || rep;
      const { data } = await api.get("/produtos", { params: targetRep !== "all" ? { representada_id: targetRep } : {} }); 
      setList(data); 
    } catch {
      toast.error("Erro ao carregar produtos");
    }
  }, [rep, representadaId]);

  useEffect(() => { load(); }, [load]);
  
  useEffect(() => { 
    if (!representadaId) {
      api.get("/representadas").then((r) => setReps(r.data)).catch(() => {}); 
    }
  }, [representadaId]);

  const save = async () => {
    if (!form.nome) return toast.error("O nome do produto é obrigatório");
    try { 
      const payload = { ...form, representada_id: representadaId || form.representada_id };
      if (editing) await api.put(`/produtos/${editing}`, payload); 
      else await api.post("/produtos", payload); 
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

  // Lógica de Importação TXT
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      
      const parsed = lines.map((line, index) => {
        // Assume o formato: Nome;Código;Preço;Unidade (separado por ; ou , ou tabulação)
        const parts = line.split(/;|\t|,/); 
        const codigo = parts[1]?.trim();
        
        // Verifica se o código já existe na lista atual
        const isDuplicate = list.some(p => p.codigo === codigo);

        return {
          tempId: index,
          nome: parts[0]?.trim(),
          codigo: codigo,
          preco: parseFloat((parts[2] || "0").replace(',', '.')),
          unidade: parts[3]?.trim() || 'UN',
          isDuplicate
        };
      }).filter(p => p.nome && p.codigo); // Ignora linhas vazias ou sem nome/código
      
      setImportPreview(parsed);
      if (parsed.length === 0) toast.error("Nenhum produto válido encontrado no TXT.");
    };
    reader.readAsText(file);
  };

  const confirmarImportacao = async () => {
    const novos = importPreview.filter(p => !p.isDuplicate);
    if (novos.length === 0) return toast.error("Nenhum produto novo para importar (todos já existem).");

    setImporting(true);
    try {
      await api.post("/produtos/import-txt", {
        representada_id: representadaId || rep,
        produtos: novos
      });
      toast.success(`${novos.length} produtos importados com sucesso!`);
      setImportOpen(false);
      setImportPreview([]);
      load();
    } catch (err) {
      toast.error("Erro ao importar produtos.");
    } finally {
      setImporting(false);
    }
  };

  const filtered = list.filter((p) => { 
    const s = q.toLowerCase(); 
    return !s || (p.nome || "").toLowerCase().includes(s) || (p.codigo || "").toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s); 
  });
  
  const repName = (id) => reps.find((r) => r.id === id)?.nome_fantasia || "-";

  return (
    <div className="pb-10">
      {!representadaId && (
        <PageHeader 
          title="Produtos" 
          subtitle="Catálogo geral filtrável por representada" 
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setImportOpen(true)} variant="outline"><Upload className="w-4 h-4 mr-2"/> Importar TXT</Button>
              <Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF] shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
                <Plus className="w-4 h-4 mr-2" />Novo produto
              </Button>
            </div>
          } 
        />
      )}

      {/* Se estiver dentro da Representada, mostra apenas os botões */}
      {representadaId && (
        <div className="flex justify-end gap-2 mb-4">
          <Button onClick={() => setImportOpen(true)} variant="outline"><Upload className="w-4 h-4 mr-2"/> Importar TXT</Button>
          <Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-2"/> Novo produto</Button>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nome, SKU, código..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
        </div>
        {!representadaId && (
          <Select value={rep} onValueChange={setRep}>
            <SelectTrigger className="w-full sm:w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"><SelectValue placeholder="Representada" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas representadas</SelectItem>
              {reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome_fantasia || r.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Nenhum produto encontrado</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <div key={p.id} className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/30 overflow-hidden">
              <div className="h-36 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-800">
                <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                {!representadaId && <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate mb-1">{repName(p.representada_id)}</div>}
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2 flex-1" title={p.nome}>{p.nome}</h3>
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  {p.sku && <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md"><Tag className="w-3 h-3" /> {p.sku}</span>}
                </div>
                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">Preço Tabela</div>
                    <div className="font-mono font-bold text-lg text-slate-900 dark:text-white">{fmtBRL(p.preco_tabela)}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => edit(p)} className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => del(p.id)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Importar TXT */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if(!v) setImportPreview([]); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Produtos via TXT</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Formato esperado do arquivo:</p>
              <code className="block bg-white/50 dark:bg-black/20 p-2 rounded">Nome do Produto;Código;Preço;Unidade</code>
              <p className="mt-2 text-xs opacity-80">Exemplo: Detergente 500ml;COD-123;12,50;UN</p>
            </div>
            
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <Input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="max-w-xs mx-auto" />
            </div>

            {importPreview.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Conferência ({importPreview.length} itens)</h4>
                <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b sticky top-0">
                      <tr><th className="px-4 py-2 text-left">Nome</th><th className="px-4 py-2 text-left">Código</th><th className="px-4 py-2 text-right">Preço</th><th className="px-4 py-2 text-center">Status</th></tr>
                    </thead>
                    <tbody>
                      {importPreview.map(p => (
                        <tr key={p.tempId} className={p.isDuplicate ? "bg-amber-50 dark:bg-amber-500/10" : ""}>
                          <td className="px-4 py-2 truncate max-w-[200px]">{p.nome}</td>
                          <td className="px-4 py-2 font-mono text-xs">{p.codigo}</td>
                          <td className="px-4 py-2 text-right">{fmtBRL(p.preco)}</td>
                          <td className="px-4 py-2 text-center">
                            {p.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold"><AlertCircle className="w-3 h-3" /> Já existe</span>
                            ) : (
                              <span className="text-xs text-emerald-600 font-semibold">Novo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarImportacao} disabled={importing || importPreview.filter(p => !p.isDuplicate).length === 0} className="bg-[#075BFF]">
              {importing ? "Importando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastro Manual de Produto */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5 sm:col-span-2"><Label>Nome do Produto <span className="text-rose-500">*</span></Label><Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Código / SKU</Label><Input value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Preço de Tabela (R$)</Label><Input type="number" step="0.01" value={form.preco_tabela} onChange={(e) => setForm({ ...form, preco_tabela: parseFloat(e.target.value || 0) })} /></div>
            <div className="space-y-1.5"><Label>Unidade</Label>
              <Select value={form.unidade || "UN"} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="UN">UN (Unidade)</SelectItem><SelectItem value="CX">CX (Caixa)</SelectItem><SelectItem value="KG">KG (Quilo)</SelectItem><SelectItem value="L">L (Litro)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF]">Salvar Produto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}