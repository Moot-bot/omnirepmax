import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Plus, Edit2, Trash2, Package, FileText, Upload, 
  Building2, Download, Loader2, MapPin, Phone
} from "lucide-react";
import { fmtBRL } from "../lib/format";
import { toast } from "sonner";

// Formulário expandido com WhatsApp
const emptyRep = { 
  razao_social: "", nome_fantasia: "", cnpj: "", logo: "",
  inscricao_estadual: "", segmento: "",
  cep: "", endereco: "", cidade: "", estado: "",
  telefone: "", whatsapp: "", email: "", site: "", // <-- WHATSAPP ADICIONADO
  contato_nome: "", contato_cargo: "",
  comissao_padrao: 5.0, 
  modalidade_comissao: "faturamento",
  prazo_pagamento: "30 dias", 
  observacoes: ""
};
const emptyProd = { nome: "", codigo: "", preco_tabela: 0, unidade: "UN" };

export default function Representadas() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyRep);
  const [editing, setEditing] = useState(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  
  const [produtos, setProdutos] = useState([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodForm, setProdForm] = useState(emptyProd);
  const [prodEditing, setProdEditing] = useState(null);

  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/representadas");
      setList(data);
    } catch { toast.error("Erro ao carregar representadas."); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buscarCNPJ = async (cnpjRaw) => {
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
        email: data.email || prev.email,
        telefone: data.ddd_telefone_1 || prev.telefone,
        cep: data.cep || prev.cep,
        endereco: data.logradouro ? `${data.logradouro}, ${data.numero || "S/N"}` : prev.endereco,
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      toast.success("Dados preenchidos via CNPJ!");
    } catch { toast.error("Não foi possível buscar os dados deste CNPJ."); }
    finally { setLoadingCnpj(false); }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 700_000) return toast.error("Logo muito grande. Máximo 500KB.");
    const reader = new FileReader();
    reader.onload = (event) => setForm({ ...form, logo: event.target.result });
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.razao_social) return toast.error("Razão Social é obrigatória");
    try {
      if (editing) await api.put(`/representadas/${editing}`, form);
      else await api.post("/representadas", form);
      toast.success("Salvo com sucesso!"); 
      setOpen(false); setForm(emptyRep); setEditing(null); load();
    } catch { toast.error("Erro ao salvar"); }
  };

  const openDetails = async (rep) => {
    setSelectedRep(rep);
    setDetailOpen(true);
    loadProdutos(rep.id);
    loadDocs(rep.id);
  };

  const loadProdutos = async (repId) => {
    const res = await api.get(`/produtos?representada_id=${repId}`);
    setProdutos(res.data);
  };

  const saveProd = async () => {
    try {
      if (prodEditing) await api.put(`/produtos/${prodEditing}`, { ...prodForm, representada_id: selectedRep.id });
      else await api.post("/produtos", { ...prodForm, representada_id: selectedRep.id });
      toast.success("Produto salvo!");
      setProdOpen(false); setProdForm(emptyProd); setProdEditing(null);
      loadProdutos(selectedRep.id);
    } catch { toast.error("Erro ao salvar produto"); }
  };

  const delProd = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    await api.delete(`/produtos/${id}`);
    loadProdutos(selectedRep.id);
  };

  const loadDocs = async (repId) => {
    const res = await api.get(`/representadas/${repId}/documentos`);
    setDocs(res.data);
  };

  const handleUploadDoc = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Arquivo muito grande. Máximo 3MB.");
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await api.post(`/representadas/${selectedRep.id}/documentos`, {
          nome: file.name, arquivo_base64: event.target.result
        });
        toast.success("Contrato anexado!");
        loadDocs(selectedRep.id);
      } catch { toast.error("Erro ao anexar arquivo"); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const downloadDoc = async (docId, nome) => {
    const res = await api.get(`/documentos/${docId}/download`);
    const link = document.createElement("a");
    link.href = res.data.arquivo_base64;
    link.download = nome;
    link.click();
  };

  const delDoc = async (docId) => {
    if (!window.confirm("Excluir este documento?")) return;
    await api.delete(`/documentos/${docId}`);
    loadDocs(selectedRep.id);
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title="Representadas" 
        subtitle="Gerencie as indústrias, seus catálogos e contratos" 
        actions={<Button onClick={() => { setForm(emptyRep); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF]"><Plus className="w-4 h-4 mr-2" />Nova Representada</Button>} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map(rep => (
          <div key={rep.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col">
            <div className="flex justify-between items-start mb-4">
              {rep.logo ? (
                <img src={rep.logo} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-100 p-1" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setForm({...emptyRep, ...rep}); setEditing(rep.id); setOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{rep.nome_fantasia || rep.razao_social}</h3>
            <p className="text-sm text-slate-500 mb-2">{rep.cnpj}</p>
            
            <div className="flex flex-col gap-1 mb-4">
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2 py-1 rounded w-fit">
                Comissão: {rep.comissao_padrao}%
              </p>
              <p className="text-xs text-slate-500 capitalize">
                Modalidade: {rep.modalidade_comissao === "faturamento" ? "No Faturamento" : "Na Liquidez"}
              </p>
              {rep.whatsapp && <p className="text-xs text-slate-500">📱 {rep.whatsapp}</p>}
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => openDetails(rep)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Gerenciar Catálogo & Docs
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: CADASTRO COMPLETO DA REPRESENTADA */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Representada" : "Nova Representada"}</DialogTitle></DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex gap-6 items-start">
              <div className="space-y-2 flex flex-col items-center">
                <Label>Logo</Label>
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800/50 relative">
                  {form.logo ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain" /> : <Building2 className="w-8 h-8 text-slate-400" />}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <span className="text-[10px] text-slate-500">Máx 500KB</span>
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Razão Social <span className="text-rose-500">*</span></Label>
                  <Input value={form.razao_social} onChange={e => setForm({...form, razao_social: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nome_fantasia} onChange={e => setForm({...form, nome_fantasia: e.target.value})} />
                </div>
                <div className="space-y-1.5 relative">
                  <Label>CNPJ <span className="text-xs text-blue-500">(Busca automática)</span></Label>
                  <div className="relative">
                    <Input value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} onBlur={(e) => buscarCNPJ(e.target.value)} placeholder="00.000.000/0000-00" />
                    {loadingCnpj && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-[#08D5F5]" /> Contato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} /></div>
                {/* CAMPO WHATSAPP NOVO */}
                <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="(11) 99999-9999" /></div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="space-y-1.5"><Label>Site</Label><Input value={form.site} onChange={e => setForm({...form, site: e.target.value})} /></div>
                <div className="space-y-1.5"><Label>Nome do Contato</Label><Input value={form.contato_nome} onChange={e => setForm({...form, contato_nome: e.target.value})} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" /> Endereço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label>CEP</Label><Input value={form.cep} onChange={e => setForm({...form, cep: e.target.value})} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} /></div>
                <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} /></div>
                <div className="space-y-1.5"><Label>UF</Label><Input value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} maxLength={2} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" /> Regras Comerciais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Comissão Padrão (%)</Label>
                  <Input type="number" value={form.comissao_padrao} onChange={e => setForm({...form, comissao_padrao: parseFloat(e.target.value || 0)})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Modalidade de Comissão</Label>
                  <Select value={form.modalidade_comissao} onValueChange={(v) => setForm({...form, modalidade_comissao: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faturamento">No Faturamento</SelectItem>
                      <SelectItem value="liquidez">Na Liquidez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prazo de Pagamento</Label>
                  <Input value={form.prazo_pagamento} onChange={e => setForm({...form, prazo_pagamento: e.target.value})} placeholder="Ex: 30/60 dias" />
                </div>
                <div className="space-y-1.5">
                  <Label>Segmento</Label>
                  <Input value={form.segmento} onChange={e => setForm({...form, segmento: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF]">Salvar Representada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DETALHES (PRODUTOS E DOCUMENTOS) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedRep?.logo && <img src={selectedRep.logo} className="w-8 h-8 rounded object-contain" alt="logo"/>}
              Gerenciando: {selectedRep?.nome_fantasia || selectedRep?.razao_social}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="produtos" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="produtos"><Package className="w-4 h-4 mr-2" /> Produtos</TabsTrigger>
              <TabsTrigger value="documentos"><FileText className="w-4 h-4 mr-2" /> Contratos e Docs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="produtos" className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Catálogo de Produtos</h3>
                <Button onClick={() => { setProdForm(emptyProd); setProdEditing(null); setProdOpen(true); }} className="bg-[#075BFF]"><Plus className="w-4 h-4 mr-2"/> Novo Produto</Button>
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

            <TabsContent value="documentos" className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Contratos e Documentos</h3>
                <Button variant="outline" disabled={uploading} className="relative">
                  <Upload className="w-4 h-4 mr-2"/> {uploading ? "Enviando..." : "Anexar Arquivo"}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUploadDoc} />
                </Button>
              </div>
              
              {docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <FileText className="w-10 h-10 text-slate-400 mb-3" />
                  <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">Nenhum contrato anexado</h3>
                  <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">Faça o upload dos contratos de representação, aditivos e tabelas de preço.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 border rounded-xl bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium truncate">{d.nome}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => downloadDoc(d.id, d.nome)}><Download className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => delDoc(d.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CADASTRO DE PRODUTO */}
      <Dialog open={prodOpen} onOpenChange={setProdOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{prodEditing ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nome do Produto</Label><Input value={prodForm.nome} onChange={e => setProdForm({...prodForm, nome: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Código / SKU</Label><Input value={prodForm.codigo} onChange={e => setProdForm({...prodForm, codigo: e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Preço (R$)</Label><Input type="number" value={prodForm.preco_tabela} onChange={e => setProdForm({...prodForm, preco_tabela: parseFloat(e.target.value || 0)})} /></div>
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