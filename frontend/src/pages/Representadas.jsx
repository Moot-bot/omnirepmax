import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Edit2, Trash2, Package, FileText, Upload, Building2 } from "lucide-react";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

const empty = { razao_social: "", nome_fantasia: "", cnpj: "", comissao_padrao: 5.0, cidade: "", estado: "" };
const emptyProd = { nome: "", codigo: "", preco_tabela: 0, unidade: "UN" };

export default function Representadas() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  // Estados para o Modal de Detalhes (Produtos e Docs)
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodForm, setProdForm] = useState(emptyProd);
  const [prodEditing, setProdEditing] = useState(null);
  const [docs, setDocs] = useState([]); // Mock para documentos

  const load = useCallback(async () => {
    const { data } = await api.get("/representadas");
    setList(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.razao_social) return toast.error("Razão Social é obrigatória");
    try {
      if (editing) await api.put(`/representadas/${editing}`, form);
      else await api.post("/representadas", form);
      toast.success("Salvo com sucesso!"); setOpen(false); setForm(empty); setEditing(null); load();
    } catch { toast.error("Erro ao salvar"); }
  };

  const openDetails = async (rep) => {
    setSelectedRep(rep);
    setDetailOpen(true);
    // Carrega produtos da representada
    const res = await api.get(`/produtos?representada_id=${rep.id}`);
    setProdutos(res.data);
    // Carrega docs (se houver)
    setDocs(rep.documentos || []);
  };

  const saveProd = async () => {
    try {
      if (prodEditing) await api.put(`/produtos/${prodEditing}`, { ...prodForm, representada_id: selectedRep.id });
      else await api.post("/produtos", { ...prodForm, representada_id: selectedRep.id });
      toast.success("Produto salvo!");
      setProdOpen(false); setProdForm(emptyProd); setProdEditing(null);
      openDetails(selectedRep); // Recarrega a lista
    } catch { toast.error("Erro ao salvar produto"); }
  };

  const delProd = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    await api.delete(`/produtos/${id}`);
    openDetails(selectedRep);
  };

  return (
    <div className="pb-10">
      <PageHeader title="Representadas" subtitle="Gerencie as indústrias, seus catálogos e contratos" 
        actions={<Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-2" />Nova Representada</Button>} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(rep => (
          <div key={rep.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setForm(rep); setEditing(rep.id); setOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{rep.nome_fantasia || rep.razao_social}</h3>
            <p className="text-sm text-slate-500 mb-4">{rep.cnpj}</p>
            
            <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => openDetails(rep)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Gerenciar Catálogo & Docs
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Detalhes da Representada (Produtos e Documentos) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciando: {selectedRep?.nome_fantasia || selectedRep?.razao_social}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="produtos" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="produtos"><Package className="w-4 h-4 mr-2" /> Produtos</TabsTrigger>
              <TabsTrigger value="documentos"><FileText className="w-4 h-4 mr-2" /> Contratos e Docs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="produtos" className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Catálogo de Produtos</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => toast.info("Importação TXT em breve!")}><Upload className="w-4 h-4 mr-2"/> Importar TXT</Button>
                  <Button onClick={() => { setProdForm(emptyProd); setProdEditing(null); setProdOpen(true); }} className="bg-[#075BFF]"><Plus className="w-4 h-4 mr-2"/> Novo Produto</Button>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-right">Preço</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">{p.nome}</td>
                        <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                        <td className="px-4 py-3 text-right font-bold">{fmtBRL(p.preco_tabela)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setProdForm(p); setProdEditing(p.id); setProdOpen(true); }}><Edit2 className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => delProd(p.id)} className="text-rose-500"><Trash2 className="w-4 h-4"/></Button>
                        </td>
                      </tr>
                    ))}
                    {produtos.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">Nenhum produto cadastrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="documentos" className="pt-4">
               <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <FileText className="w-10 h-10 text-slate-400 mb-3" />
                  <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">Nenhum contrato anexado</h3>
                  <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">Faça o upload dos contratos de representação, aditivos e tabelas de preço em PDF.</p>
                  <Button variant="outline"><Upload className="w-4 h-4 mr-2"/> Fazer Upload de Arquivo</Button>
               </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastro de Produto Rápido */}
      <Dialog open={prodOpen} onOpenChange={setProdOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{prodEditing ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nome do Produto</Label><Input value={prodForm.nome} onChange={e => setProdForm({...prodForm, nome: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Código / SKU</Label><Input value={prodForm.codigo} onChange={e => setProdForm({...prodForm, codigo: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Preço (R$)</Label><Input type="number" value={prodForm.preco_tabela} onChange={e => setProdForm({...prodForm, preco_tabela: parseFloat(e.target.value)})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProdOpen(false)}>Cancelar</Button>
            <Button onClick={saveProd} className="bg-[#075BFF]">Salvar Produto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}