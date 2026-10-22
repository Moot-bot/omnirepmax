import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "./ui/button";

export function LogoUpload({ value, onChange, size = 72, label = "Logo", testId }) {
  const [preview, setPreview] = useState(value || "");
  const ref = useRef(null);
  const handle = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { alert("Imagem muito grande (máx 1.5MB). Comprima antes."); return; }
    const rd = new FileReader();
    rd.onload = () => { setPreview(rd.result); onChange(rd.result); };
    rd.readAsDataURL(f);
  };
  const clear = () => { setPreview(""); onChange(""); if (ref.current) ref.current.value = ""; };
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {preview ? (
          <>
            <img src={preview} alt="logo" className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
            <button type="button" onClick={clear} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600"><X className="w-3 h-3" /></button>
          </>
        ) : (
          <div className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900">
            <Upload className="w-5 h-5" />
          </div>
        )}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-500 mb-2">PNG, JPG até 1.5MB</div>
        <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" data-testid={testId} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>Escolher arquivo</Button>
      </div>
    </div>
  );
}
