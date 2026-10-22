export const fmtBRL = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
export const fmtNum = (v, d = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0));
export const fmtDate = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("pt-BR");
};
export const fmtDateTime = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  return d.toLocaleString("pt-BR");
};
