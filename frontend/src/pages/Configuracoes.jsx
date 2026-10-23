import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Upload, Building2, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function Configuracoes() {
  const { user, setUser } = useAuth(); // Assumindo que seu AuthContext tem um setUser
  
  // --- Estados do Perfil / Logo ---
  const [logo, setLogo] = useState(user?.logo || "");
  const [name, setName] = useState(user?.name || "");
  const [empresa, setEmpresa] = useState(user?.empresa || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // --- Estados do Reset ---
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPreview, setResetPreview] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user) {
      setLogo(user.logo || "");
      setName(user.name || "");
      setEmpresa(user.empresa || "");
    }
  }, [user]);

  // --- Lógica de Upload de Logo ---
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 700_000) return toast.error("Logo muito grande. Máximo 500KB.");
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await api.patch("/auth/me", { name, empresa, logo });
      if (setUser) setUser(res.data); // Atualiza o contexto global
      toast.success("Perfil e logo atualizados!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Lógica do Reset ---
  const openResetModal = async () => {
    setResetOpen(true);
    setMotivo("");
    setConfirmacao("");
    setResetPreview(null);
    try {
      const res = await api.get("/system/reset/preview");
      setResetPreview(res.data);
    } catch {
      toast.error("Erro ao carregar o resumo do banco de dados.");
    }
  };

  const executeReset = async () => {
    if (motivo.length < 10) return toast.error("O motivo deve ter pelo menos 10 caracteres.");
    if (confirmacao.toUpperCase() !== "RESETAR") return toast.error("Digite 'RESETAR' para confirmar.");
    
    setResetting(true);
    try {
      await api.post("/system/reset", { motivo, confirmacao });
      toast.success("Sistema resetado com sucesso!");
      setResetOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao resetar o sistema.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="pb-10 max-w-5xl mx-auto">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta, aparência do sistema e dados" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: Logo e Perfil */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-lg mb-4">Logo da Empresa</h3>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-10 h-10 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="w-6 h-6 text-white mb-1" />
                  <span className="text-[10px] text-white font-bold">Alterar</span>
                </div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <p className="text-xs text-slate-500 text-center">Formatos: JPG, PNG ou SVG.<br/>Tamanho máximo: 500KB.</p>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-lg mb-4">Dados do Perfil</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input value={empresa} onChange={e => setEmpresa(e.target.value)} />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile} className="w-full bg-[#075BFF]">
                {savingProfile ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </Card>
        </div>

        {/* COLUNA DIREITA: Configurações de Sistema e Reset */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-full">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Zona de Perigo</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  O reset do sistema apagará permanentemente todos os clientes, representadas, pedidos, comissões e documentos da sua conta. O seu usuário e a sua assinatura serão mantidos.
                </p>
                <Button variant="destructive" onClick={openResetModal} className="bg-rose-600 hover:bg-rose-700 text-white">
                  Resetar Sistema
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL: RESET DO SISTEMA (CORRIGIDO) */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        {/* Adicionado max-h-[90vh] e overflow-y-auto para não vazar a tela */}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Confirmar Reset do Sistema
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todos os dados operacionais da sua conta serão apagados permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 flex-1">
            {/* Preview do que será apagado */}
            {resetPreview ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-sm mb-3">O que será apagado:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(resetPreview.counts).map(([col, count]) => {
                    if (count === 0) return null;
                    return (
                      <div key={col} className="flex justify-between text-sm bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                        <span className="capitalize text-slate-500">{col.replace("_", " ")}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm font-bold text-rose-600 mt-3 text-right">
                  Total: {resetPreview.total} registros
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">Carregando dados...</div>
            )}

            <div className="space-y-2">
              <Label>Motivo do Reset <span className="text-rose-500">*</span></Label>
              <Input 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)} 
                placeholder="Ex: Limpando dados de teste para iniciar a operação real..." 
              />
              <p className="text-xs text-slate-500">Mínimo de 10 caracteres.</p>
            </div>

            <div className="space-y-2">
              <Label>Confirmação <span className="text-rose-500">*</span></Label>
              <Input 
                value={confirmacao} 
                onChange={e => setConfirmacao(e.target.value)} 
                placeholder="Digite RESETAR em maiúsculo" 
                className="font-mono"
              />
            </div>
          </div>

          {/* Footer fixo no final do modal */}
          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button 
              onClick={executeReset} 
              disabled={resetting || confirmacao.toUpperCase() !== "RESETAR" || motivo.length < 10} 
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {resetting ? "Apagando dados..." : "Confirmar Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}