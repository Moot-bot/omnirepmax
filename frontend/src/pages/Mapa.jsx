import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { PageHeader } from "../components/Common";
import { MapPin } from "lucide-react";
import { fmtNum } from "../lib/format";

export default function Mapa() {
  const [clientes, setClientes] = useState([]);
  useEffect(() => { api.get("/clientes").then((r) => setClientes(r.data)); }, []);
  const withGeo = clientes.filter((c) => c.lat && c.lng);
  // Convert lat/lng to SVG coords (aproximação simples pelo Brasil)
  const project = (lat, lng) => {
    const minLat = -34, maxLat = -5, minLng = -74, maxLng = -34;
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { x, y };
  };
  const color = (s) => s === "ativo" ? "#10B981" : s === "prospect" ? "#3B82F6" : "#94A3B8";

  return (
    <div>
      <PageHeader title="Mapa Comercial" subtitle="Distribuição geográfica dos clientes no Brasil" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative w-full aspect-[4/5] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <text x="50" y="50" textAnchor="middle" className="fill-slate-300 dark:fill-slate-800 text-xs font-bold">🇧🇷 BRASIL</text>
              {withGeo.map((c) => { const { x, y } = project(c.lat, c.lng); return (
                <g key={c.id}>
                  <circle cx={x} cy={y} r="1.8" fill={color(c.status)} opacity="0.85" />
                  <circle cx={x} cy={y} r="3" fill={color(c.status)} opacity="0.25" />
                </g>
              );})}
            </svg>
          </div>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="font-display font-bold mb-3">Clientes geolocalizados</div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin">
            {withGeo.map((c) => (
              <div key={c.id} className="p-2 border-b border-slate-100 dark:border-slate-800 text-sm flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" style={{ color: color(c.status) }} />
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{c.nome_fantasia}</div><div className="text-xs text-slate-500">{c.cidade}/{c.estado}</div></div>
              </div>
            ))}
            {withGeo.length === 0 && <div className="text-sm text-slate-500">Sem dados de geolocalização.</div>}
          </div>
          <div className="mt-4 space-y-1 text-xs">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Ativo</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Prospect</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Inativo</div>
          </div>
        </div>
      </div>
    </div>
  );
}
