import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import MaxAI from "./pages/MaxAI";
import Plans from "./pages/Plans";
import PaymentSuccess from "./pages/PaymentSuccess";
import Representadas from "./pages/Representadas";
import Clientes from "./pages/Clientes";
import Kanban from "./pages/Kanban";
import Produtos from "./pages/Produtos";
import Pedidos from "./pages/Pedidos";
import Comissoes from "./pages/Comissoes";
import ContasReceber from "./pages/ContasReceber";
import ContasPagar from "./pages/ContasPagar";
import Agenda from "./pages/Agenda";
import Insights from "./pages/Insights";
import ImportacaoXML from "./pages/ImportacaoXML";
import Mapa from "./pages/Mapa";
import Documentos from "./pages/Documentos";
import Configuracoes from "./pages/Configuracoes";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-slate-500">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/lp" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route element={<Protected><AppShell /></Protected>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/max-ai" element={<MaxAI />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/representadas" element={<Representadas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/funil" element={<Kanban />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/contas-receber" element={<ContasReceber />} />
              <Route path="/contas-pagar" element={<ContasPagar />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/xml" element={<ImportacaoXML />} />
              <Route path="/mapa" element={<Mapa />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
