import React, { useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card } from "../components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

export default function Feedback() {
  const [tipo, setTipo] = useState("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [nota, setNota] = useState("5");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!mensagem.trim()) return toast.error("Por favor, escreva sua mensagem.");
    setEnviando(true);
    try {
      await api.post("/feedback", { tipo, mensagem, nota: parseInt(nota) });
      toast.success("Feedback enviado! Obrigado por nos ajudar a melhorar.");
      setMensagem("");
      setNota("5");
    } catch {
      toast.error("Erro ao enviar feedback.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pb-10 max-w-3xl mx-auto">
      <PageHeader title="Feedback" subtitle="Sua opinião é fundamental para evoluirmos o OmniRepMax" />
      
      <Card className="p-6 md:p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conte-nos o que achou</h2>
            <p className="text-sm text-slate-500">Encontrou um bug? Tem uma ideia? Quer elogiar? Escreva abaixo.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tipo de Feedback</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sugestao">Sugestão de Melhoria</SelectItem>
                  <SelectItem value="bug">Reportar um Bug</SelectItem>
                  <SelectItem value="elogio">Elogio</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nota para o sistema (1 a 5)</Label>
              <Select value={nota} onValueChange={setNota}>
                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Muito Ruim</SelectItem>
                  <SelectItem value="2">2 - Ruim</SelectItem>
                  <SelectItem value="3">3 - Regular</SelectItem>
                  <SelectItem value="4">4 - Bom</SelectItem>
                  <SelectItem value="5">5 - Excelente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sua Mensagem</Label>
            <Textarea 
              placeholder="Descreva sua sugestão, o problema que encontrou ou seu elogio..."
              className="min-h-[150px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <Button onClick={enviar} disabled={enviando} className="w-full md:w-auto bg-[#075BFF] hover:bg-blue-600">
            {enviando ? "Enviando..." : <><Send className="w-4 h-4 mr-2" /> Enviar Feedback</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}