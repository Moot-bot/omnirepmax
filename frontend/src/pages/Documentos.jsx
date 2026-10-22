import React from "react";
import { PageHeader } from "../components/Common";
import { FileText } from "lucide-react";

export default function Documentos() {
  return (
    <div>
      <PageHeader title="Documentos" subtitle="Repositório de contratos, tabelas e arquivos" />
      <div className="p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <div className="font-semibold">Área de documentos</div>
        <div className="text-sm text-slate-500 mt-1">Anexe contratos, tabelas de preço, catálogos e comprovantes vinculados a clientes, representadas e pedidos.</div>
      </div>
    </div>
  );
}
