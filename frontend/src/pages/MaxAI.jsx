import React, { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sparkles, Send, User, Bot, Loader2 } from "lucide-react";

const SUGGESTIONS = [
  "Quais clientes estão há mais de 30 dias sem comprar?",
  "Qual foi minha melhor representada este mês?",
  "Quanto tenho para receber de comissão?",
  "Mostre meus 10 maiores clientes",
  "Quais clientes devo visitar esta semana?",
  "Qual produto teve queda de vendas?",
];

function md(text) {
  // mini markdown: bold + lists
  let t = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/^- (.+)$/gm, '<li>$1</li>');
  if (/<li>/.test(t)) t = t.replace(/(<li>.*?<\/li>)/gs, '<ul class="list-disc ml-5 space-y-1">$1</ul>');
  return t.replace(/\n/g, "<br/>");
}

export default function MaxAI() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("maxai_history");
    return saved ? JSON.parse(saved) : [{ role: "assistant", content: "Olá! Eu sou o **MAX AI**, seu analista comercial. Pergunte em linguagem natural sobre seus clientes, pedidos, comissões ou representadas. Experimente uma das sugestões abaixo." }];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { localStorage.setItem("maxai_history", JSON.stringify(messages.slice(-20))); if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [messages]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const nextHistory = [...messages, { role: "user", content: q }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const { data } = await api.post("/max-ai/chat", { message: q, history: nextHistory.slice(-8).map((m) => ({ role: m.role, content: m.content })) });
      setMessages([...nextHistory, { role: "assistant", content: data.reply || "Sem resposta." }]);
    } catch (e) {
      setMessages([...nextHistory, { role: "assistant", content: "Desculpe, não consegui processar sua pergunta no momento." }]);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-2"><Sparkles className="w-6 h-6 text-[#075BFF]" />MAX AI</span>}
        subtitle="Seu analista comercial em linguagem natural — treinado com os seus dados"
        actions={<Button variant="outline" size="sm" onClick={() => { setMessages([{ role: "assistant", content: "Nova conversa iniciada. Como posso ajudar?" }]); localStorage.removeItem("maxai_history"); }}>Nova conversa</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[72vh]">
          <div ref={boxRef} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-[#0A1F46] text-white" : "bg-brand-cyan-gradient text-white"}`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-[#0A1F46] text-white rounded-tr-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm"}`}>
                  <div dangerouslySetInnerHTML={{ __html: md(m.content) }} />
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-cyan-gradient text-white flex items-center justify-center"><Bot className="w-4 h-4" /></div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />MAX AI está analisando seus dados...</div>
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
            <Input data-testid="max-input" placeholder="Pergunte ao MAX AI... (Ex: Quais meus 5 maiores clientes?)" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} className="flex-1" />
            <Button type="submit" data-testid="btn-max-send" disabled={busy || !input.trim()} className="bg-brand-cta hover:brightness-110 text-white border-0"><Send className="w-4 h-4" /></Button>
          </form>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Sugestões</div>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} data-testid={`sugg-${i}`} onClick={() => send(s)} disabled={busy} className="w-full text-left text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-[#075BFF]/30 transition-colors">{s}</button>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden p-4 rounded-2xl text-white"
               style={{ backgroundImage: "linear-gradient(135deg, #061329 0%, #0A1F46 55%, #075BFF 100%)" }}>
            <Sparkles className="w-5 h-5 text-[#22D3EE] mb-2" />
            <div className="text-sm font-semibold">Dica</div>
            <div className="text-xs text-slate-300 mt-1 leading-relaxed">O MAX AI usa apenas os dados da sua conta — nunca compartilha com outras empresas. Multi-tenant seguro.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
