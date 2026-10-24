import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword"; // <-- IMPORT ADICIONADO AQUI
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import MaxAI from "./pages/MaxAI";
import Plans from "./pages/Plans";
import PaymentSuccess from "./pages/PaymentSuccess";
import Representadas from "./pages/Representadas";
import Clientes from "./pages/Clientes";
import Kanban from "./pages/Kanban";
import Pedidos from "./pages/Pedidos";
import Comissoes from "./pages/Comissoes";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Agenda from "./pages/Agenda";
import Insights from "./pages/Insights";
import ImportacaoXML from "./pages/ImportacaoXML";
import Mapa from "./pages/Mapa";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import Feedback from "./pages/Feedback";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-slate-500">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ROTA RAIZ É A LANDING PAGE */}
            <Route path="/" element={<Landing />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} /> {/* <-- ROTA ADICIONADA AQUI */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            
            {/* ROTAS PROTEGIDAS (Exigem Login) */}
            <Route element={<Protected><AppShell /></Protected>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/max-ai" element={<MaxAI />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/representadas" element={<Representadas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/funil" element={<Kanban />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/contas-receber" element={<ContasReceber />} />
              <Route path="/contas-pagar" element={<ContasPagar />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/xml" element={<ImportacaoXML />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/feedback" element={<Feedback />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}