// src/lib/dashboardComercial.js
import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";

/** Carrega, num único pedido ao servidor, os 4 cards com comparativos + a meta do mês. */
export function useDashboardComercial(filtros = {}) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const seq = useRef(0);

  const recarregar = useCallback(async () => {
    const meu = ++seq.current;
    setCarregando(true);
    try {
      const params = {};
      if (filtros.representada_id) params.representada_id = filtros.representada_id;
      if (filtros.rede) params.rede = filtros.rede;
      if (filtros.ano) params.ano = filtros.ano;
      if (filtros.mes) params.mes = filtros.mes;
      const r = await api.get("/dashboard/comercial", { params });
      if (meu === seq.current) { setDados(r.data); setErro(null); }   // ignora respostas atrasadas
    } catch (e) {
      if (meu === seq.current) setErro(e.response?.data?.detail || "Erro ao carregar os indicadores.");
    } finally {
      if (meu === seq.current) setCarregando(false);
    }
  }, [filtros.representada_id, filtros.rede, filtros.ano, filtros.mes]);

  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, carregando, erro, recarregar };
}

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (v) => fmt.format(Number(v) || 0);
export const pct = (v) => `${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;

/** Máscara monetária: o usuário digita só números e o campo mostra "R$ 150.000,00". */
export function mascaraMoeda(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return { exibicao: "", valor: 0 };
  const valor = Number(digitos) / 100;
  return { exibicao: fmt.format(valor), valor };
}
export const moedaParaExibicao = (valor) => (valor ? fmt.format(valor) : "");
