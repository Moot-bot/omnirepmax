import React, { useEffect, useState } from "react";
import { PageHeader } from "../components/Common";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import { toast } from "sonner";
import { Download, Users, MessageSquare, Star, Mail, Phone, Building2 } from "lucide-react";
import { fmtDate } from "../lib/format";

export default function Admin() {
  const [leads, setLeads] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leadsRes, feedbacksRes] = await Promise.all([
          api.get("/leads"),
          api.get("/admin/feedbacks")
        ]);
        setLeads(leadsRes.data);
        setFeedbacks(feedbacksRes.data);
      } catch (e) {
        toast.error("Erro ao carregar dados de administrador.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const exportLeads = async () => {
    try {
      const response = await api.get("/leads/export", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'leads_omnirepmax.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error("Erro ao exportar planilha.");
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando painel...</div>;

  return (
    <div className="pb-10 max-w-6xl mx-auto">
      <PageHeader 
        title="Painel de Administrador" 
        subtitle="Gerencie os leads captados e os feedbacks dos usuários" 
        actions={
          <Button onClick={exportLeads} className="bg-[#075BFF] hover:bg-blue-600">
            <Download className="w-4 h-4 mr-2" /> Exportar Leads (CSV)
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="p-5 border-l-4 border-l-blue-500 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase">Total de Leads</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{leads.length}</p>
          </div>
          <Users className="w-10 h-10 text-blue-500 opacity-20" />
        </Card>
        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase">Feedbacks Recebidos</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{feedbacks.length}</p>
          </div>
          <MessageSquare className="w-10 h-10 text-emerald-500 opacity-20" />
        </Card>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Leads Cadastrados
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Feedbacks
          </TabsTrigger>
        </TabsList>

        {/* ABA DE LEADS */}
        <TabsContent value="leads">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold">Contato</th>
                    <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                    <th className="px-4 py-3 text-left font-semibold">Perfil / Dor</th> {/* ✅ NOVA COLUNA */}
                    <th className="px-4 py-3 text-center font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium">{l.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"><Mail className="w-3 h-3" /> {l.email}</div>
                        {l.telefone && <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-1"><Phone className="w-3 h-3" /> {l.telefone}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {l.empresa ? <div className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {l.empresa}</div> : "-"}
                      </td>
                      {/* ✅ EXIBINDO OS NOVOS DADOS */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold capitalize text-[#075BFF]">{l.tamanho_operacao || "-"}</div>
                        <div className="text-slate-500">Usa: {l.controle_atual || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{fmtDate(l.created_at)}</td>
                    </tr>
                  ))}
                  {/* ✅ COLPAN AJUSTADO PARA 5 */}
                  {leads.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-500">Nenhum lead cadastrado ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA DE FEEDBACKS */}
        <TabsContent value="feedbacks">
          <div className="grid gap-4">
            {feedbacks.map((f, i) => (
              <Card key={i} className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{f.tipo}</span>
                    <span className="text-sm font-semibold">{f.user_name} ({f.user_email})</span>
                  </div>
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold ml-1">{f.nota}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  "{f.mensagem}"
                </p>
                <p className="text-xs text-slate-400 mt-3 text-right">{fmtDate(f.created_at)}</p>
              </Card>
            ))}
            {feedbacks.length === 0 && <div className="text-center py-10 text-slate-500">Nenhum feedback recebido ainda.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}