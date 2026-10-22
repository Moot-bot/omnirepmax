import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Clock, X, Zap } from "lucide-react";

export default function TrialBanner() {
  const [sub, setSub] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("trial_banner_hidden") === "1");

  useEffect(() => {
    if (dismissed) return;
    api.get("/subscriptions/me").then((r) => setSub(r.data)).catch(() => {});
  }, [dismissed]);

  if (dismissed || !sub || !sub.is_trial || typeof sub.trial_days_left !== "number") return null;
  const days = sub.trial_days_left;
  const urgent = days <= 2;

  return (
    <div className={`relative overflow-hidden ${urgent ? "bg-gradient-to-r from-rose-600 to-amber-500" : "bg-gradient-to-r from-[#061329] via-[#0A1F46] to-[#075BFF]"} text-white px-4 py-2.5 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4" />
        <span className="font-semibold">
          {days > 0 ? <>Trial OMNIREP MAX: <strong>{days} dia{days !== 1 ? "s" : ""}</strong> restante{days !== 1 ? "s" : ""}.</> : <>Seu trial expirou.</>}
        </span>
        <span className="hidden sm:inline opacity-90">Garanta seu acesso contínuo.</span>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/planos" data-testid="btn-trial-upgrade" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white text-[#0A1F46] hover:bg-slate-100 transition-colors">
          <Zap className="w-3 h-3" />Ver planos
        </Link>
        <button onClick={() => { setDismissed(true); sessionStorage.setItem("trial_banner_hidden", "1"); }} className="p-1 hover:bg-white/10 rounded" aria-label="Fechar"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
