// src/lib/assinatura.js
// Situação da assinatura compartilhada entre o menu, o aviso e as telas,
// com cache curto para não repetir a mesma requisição em cada componente.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "./api";

const VALIDADE_MS = 30_000;
let cache = null;
let cacheEm = 0;
let cacheDono = null;
let emAndamento = null;
const ouvintes = new Set();

function donoAtual() {
  try { return localStorage.getItem("omnirep_token") || "cookie"; } catch { return "cookie"; }
}

export function carregarAssinatura(forcar = false) {
  const dono = donoAtual();
  const fresco = cache && cacheDono === dono && Date.now() - cacheEm < VALIDADE_MS;
  if (!forcar && fresco) return Promise.resolve(cache);
  if (emAndamento) return emAndamento;
  emAndamento = api.get("/subscriptions/me")
    .then(r => {
      cache = r.data; cacheEm = Date.now(); cacheDono = dono;
      ouvintes.forEach(fn => fn(cache));
      return cache;
    })
    .finally(() => { emAndamento = null; });
  return emAndamento;
}

/** Força recarregar (ex.: depois de assinar ou quando o servidor responder 402). */
export function atualizarAssinatura() {
  return carregarAssinatura(true).catch(() => null);
}

export function useAssinatura() {
  const { pathname } = useLocation();
  const [sub, setSub] = useState(cache && cacheDono === donoAtual() ? cache : null);
  useEffect(() => {
    ouvintes.add(setSub);
    carregarAssinatura().then(setSub).catch(() => {});
    return () => { ouvintes.delete(setSub); };
  }, [pathname]);
  return sub;
}

/** Texto curto da situação, usado no topo e no admin. */
export function rotuloTeste(dias) {
  if (dias == null) return "";
  if (dias <= 1) return "termina hoje";
  return `${dias} dias restantes`;
}
