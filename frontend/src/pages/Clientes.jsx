import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { PageHeader, StatusBadge } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Plus, Edit2, Trash2, Search, Building2, MapPin, Users, Loader2, 
  Briefcase, FileText, User, Calculator, CreditCard, Truck
} from "lucide-react";
import { toast } from "sonner";

// FORMULÁRIO EXPANDIDO (Mantendo o original + Novos campos)
const empty = { 
  // Identificação
  razao_social: "", nome_fantasia: "", cnpj_cpf: "", inscricao_estadual: "", situacao_cadastral: "Ativa", segmento: "", grupo_economico: "", origem: "", status: "ativo", potencial: "medio",
  // Faturamento
  endereco: "", cidade: "", estado: "", cep: "", codigo_ibge: "",
  // Entrega
  endereco_entrega: "", cidade_entrega: "", estado_entrega: "", cep_entrega: "",
  // Contatos (Geral)
  telefone: "", whatsapp: "", email: "", site: "",
  // Contatos (Comprador)
  responsavel: "", cargo: "", telefone_comprador: "", email_comprador: "",
  // Contatos (Financeiro)
  responsavel_financeiro: "", telefone_financeiro: "", email_financeiro: "",
  // Comercial e Operacional
  tabela_precos: "", condicao_pagamento: "", limite_credito: 0, vendedor_responsavel: "",
  instrucoes_entrega: "",
  // Fiscal
  contribuinte_icms: "Sim",
  // Relacionamento e Vínculos
  representadas: [], 
  representadas_codigos: {}, // Objeto { "id_da_rep": "codigo_do_cliente" }
  observacoes: "" 
};

export default function Clientes() {
  const [list, setList] = useState([]);
  const [reps, setReps] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = status !== "all" ? { status } : {};
      const { data } = await api.get("/clientes", { params });
      setList(data);
    } catch {
      toast.error("Erro ao carregar clientes");
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/representadas").then((r) => setReps(r.data)).catch(() => {}); }, []);

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
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
        cep: data.cep || prev.cep,
        endereco: data.logradouro ? `${data.logradouro}, ${data.numero || "S/N"}` : prev.endereco,
        telefone: data.ddd_telefone_1 || prev.telefone,
        email: data.email || prev.email,
        situacao_cadastral: data.descricao_situacao_cadastral || "Ativa",
      }));
      toast.success("Dados preenchidos via CNPJ!");
    } catch (err) {
      toast.error("Não foi possível buscar os dados deste CNPJ.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  const save = async () => {
    if (!form.razao_social) return toast.error("Razão Social é obrigatória");
    try {
      if (editing) await api.put(`/clientes/${editing}`, form);
      else await api.post("/clientes", form);
      toast.success("Cliente salvo com sucesso!"); 
      setOpen(false); 
      setForm(empty); 
      setEditing(null); 
      load();
    } catch (e) { toast.error("Erro ao salvar cliente"); }
  };

  const edit = (c) => { 
    setForm({ ...empty, ...c, representadas_codigos: c.representadas_codigos || {} }); 
    setEditing(c.id); 
    setOpen(true); 
  };

  const del = async (id) => { 
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return; 
    try { await api.delete(`/clientes/${id}`); toast.success("Excluído"); load(); } catch { toast.error("Erro ao excluir"); }
  };

  const filtered = list.filter((c) => {
    const s = q.toLowerCase();
    return !s || (c.razao_social || "").toLowerCase().includes(s) || (c.nome_fantasia || "").toLowerCase().includes(s) || (c.cnpj_cpf || "").includes(s) || (c.cidade || "").toLowerCase().includes(s);
  });

  // Gerencia o check e o input de código da representada
  const toggleRep = (id) => {
    const currentReps = form.representadas || [];
    const currentCodes = { ...(form.representadas_codigos || {}) };
    
    if (currentReps.includes(id)) {
      setForm({ ...form, representadas: currentReps.filter(r => r !== id) });
      // Não apagamos o código ao desmarcar, caso o usuário marque de novo por engano
    } else {
      setForm({ ...form, representadas: [...currentReps, id] });
    }
  };

  const updateRepCodigo = (id, codigo) => {
    setForm({
      ...form,
      representadas_codigos: { ...(form.representadas_codigos || {}), [id]: codigo }
    });
  };

  return (
    <div className="pb-10">
      <PageHeader 
        title="Clientes" 
        subtitle="CRM completo com preenchimento automático por CNPJ" 
        actions={
          <Button onClick={() => { setForm(empty); setEditing(null); setOpen(true); }} className="bg-[#075BFF] hover:bg-[#087BFF] shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />Novo cliente
          </Button>
        } 
      />
      
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por nome, CNPJ, cidade..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos status</SelectItem><SelectItem value="prospect">Prospect</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Cliente</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">CNPJ/CPF</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Localização</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Representadas</th>
                <th className="text-left px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-right px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {(c.nome_fantasia || c.razao_social).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{c.nome_fantasia || c.razao_social}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{c.razao_social}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{c.cnpj_cpf || "-"}</td>
                  <td className="px-5 py-3">
                    {c.cidade ? (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><MapPin className="w-3.5 h-3.5 text-slate-400" />{c.cidade}/{c.estado}</div>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /><span className="font-medium">{(c.representadas || []).length}</span></div>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => edit(c)} className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => del(c.id)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center"><Users className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-medium">Nenhum cliente encontrado.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EXPANDIDO COM ABAS */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          
          <Tabs defaultValue="geral" className="mt-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="geral"><Briefcase className="w-4 h-4 mr-2"/> Geral</TabsTrigger>
              <TabsTrigger value="enderecos"><MapPin className="w-4 h-4 mr-2"/> Endereços</TabsTrigger>
              <TabsTrigger value="contatos"><Users className="w-4 h-4 mr-2"/> Contatos</TabsTrigger>
              <TabsTrigger value="comercial"><Calculator className="w-4 h-4 mr-2"/> Comercial</TabsTrigger>
              <TabsTrigger value="vinculos"><Building2 className="w-4 h-4 mr-2"/> Vínculos</TabsTrigger>
            </TabsList>
            
            {/* ABA 1: GERAL E FISCAL */}
            <TabsContent value="geral" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2"><Label>Razão Social <span className="text-rose-500">*</span></Label><Input value={form.razao_social || ""} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia || ""} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
                <div className="space-y-1.5 relative">
                  <Label>CNPJ / CPF <span className="text-xs text-blue-500">(Busca automática)</span></Label>
                  <div className="relative">
                    <Input value={form.cnpj_cpf || ""} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} onBlur={(e) => buscarCNPJ(e.target.value)} disabled={loadingCnpj} />
                    {loadingCnpj && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Inscrição Estadual</Label><Input value={form.inscricao_estadual || ""} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Situação Cadastral</Label><Input value={form.situacao_cadastral || ""} onChange={(e) => setForm({ ...form, situacao_cadastral: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Status no CRM</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="prospect">Prospect</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Contribuinte ICMS?</Label>
                  <Select value={form.contribuinte_icms} onValueChange={(v) => setForm({ ...form, contribuinte_icms: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem><SelectItem value="Isento">Isento</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Segmento</Label><Input value={form.segmento || ""} onChange={(e) => setForm({ ...form, segmento: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Grupo Econômico</Label><Input value={form.grupo_economico || ""} onChange={(e) => setForm({ ...form, grupo_economico: e.target.value })} /></div>
              </div>
            </TabsContent>

            {/* ABA 2: ENDEREÇOS */}
            <TabsContent value="enderecos" className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-semibold mb-3">Endereço de Faturamento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5"><Label>CEP</Label><Input value={form.cep || ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Endereço Completo</Label><Input value={form.endereco || ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Código IBGE</Label><Input value={form.codigo_ibge || ""} onChange={(e) => setForm({ ...form, codigo_ibge: e.target.value })} /></div>
                  <div className="space-y-1.5 sm:col-span-3"><Label>Cidade</Label><Input value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>UF</Label><Input value={form.estado || ""} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Endereço de Entrega (Opcional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5"><Label>CEP</Label><Input value={form.cep_entrega || ""} onChange={(e) => setForm({ ...form, cep_entrega: e.target.value })} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Endereço</Label><Input value={form.endereco_entrega || ""} onChange={(e) => setForm({ ...form, endereco_entrega: e.target.value })} /></div>
                  <div className="space-y-1.5 sm:col-span-3"><Label>Cidade</Label><Input value={form.cidade_entrega || ""} onChange={(e) => setForm({ ...form, cidade_entrega: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>UF</Label><Input value={form.estado_entrega || ""} onChange={(e) => setForm({ ...form, estado_entrega: e.target.value })} maxLength={2} /></div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: CONTATOS */}
            <TabsContent value="contatos" className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-semibold mb-3">Contato Principal / Comprador</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>Nome do Comprador</Label><Input value={form.responsavel || ""} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Cargo</Label><Input value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>E-mail</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Site</Label><Input value={form.site || ""} onChange={(e) => setForm({ ...form, site: e.target.value })} /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Responsável Financeiro</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>Nome</Label><Input value={form.responsavel_financeiro || ""} onChange={(e) => setForm({ ...form, responsavel_financeiro: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone_financeiro || ""} onChange={(e) => setForm({ ...form, telefone_financeiro: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>E-mail</Label><Input value={form.email_financeiro || ""} onChange={(e) => setForm({ ...form, email_financeiro: e.target.value })} /></div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: COMERCIAL E OPERACIONAL */}
            <TabsContent value="comercial" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Tabela de Preços</Label><Input value={form.tabela_precos || ""} onChange={(e) => setForm({ ...form, tabela_precos: e.target.value })} placeholder="Ex: Tabela A" /></div>
                <div className="space-y-1.5"><Label>Condição de Pagamento Padrão</Label><Input value={form.condicao_pagamento || ""} onChange={(e) => setForm({ ...form, condicao_pagamento: e.target.value })} placeholder="Ex: 30/60/90 dias" /></div>
                <div className="space-y-1.5"><Label>Limite de Crédito (R$)</Label><Input type="number" value={form.limite_credito || 0} onChange={(e) => setForm({ ...form, limite_credito: parseFloat(e.target.value || 0) })} /></div>
                <div className="space-y-1.5"><Label>Vendedor/Representante Resp.</Label><Input value={form.vendedor_responsavel || ""} onChange={(e) => setForm({ ...form, vendedor_responsavel: e.target.value })} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Instruções para Faturamento / Entrega</Label><Textarea value={form.instrucoes_entrega || ""} onChange={(e) => setForm({ ...form, instrucoes_entrega: e.target.value })} placeholder="Ex: Entregar na portaria 2, falar com Sr. José..." /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label>Observações Gerais</Label><Textarea value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
            </TabsContent>

            {/* ABA 5: VÍNCULOS E CÓDIGOS */}
            <TabsContent value="vinculos" className="space-y-4 pt-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                <p className="text-sm text-blue-800">
                  Selecione as representadas para as quais este cliente compra e informe o <strong>Código do Cliente</strong> em cada uma delas (se houver).
                </p>
              </div>
              
              <div className="space-y-3">
                {reps.map((r) => {
                  const isChecked = (form.representadas || []).includes(r.id);
                  return (
                    <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isChecked ? "bg-slate-50 dark:bg-slate-800/50 border-[#075BFF]/30" : "border-slate-200 dark:border-slate-800"}`}>
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" className="w-4 h-4 rounded text-[#075BFF]" checked={isChecked} onChange={() => toggleRep(r.id)} />
                        <span className="font-medium text-sm">{r.nome_fantasia || r.razao_social}</span>
                      </label>
                      
                      {isChecked && (
                        <div className="flex items-center gap-2 w-1/3">
                          <Label className="text-xs text-slate-500 whitespace-nowrap">Cód. Cliente:</Label>
                          <Input 
                            value={(form.representadas_codigos || {})[r.id] || ""} 
                            onChange={(e) => updateRepCodigo(r.id, e.target.value)} 
                            placeholder="Ex: 12345"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {reps.length === 0 && <p className="text-sm text-slate-500">Cadastre uma representada primeiro.</p>}
              </div>
            </TabsContent>

          </Tabs>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[#075BFF] hover:bg-[#087BFF]">Salvar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}