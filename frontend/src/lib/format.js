export const brl = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0)
  );

export const STATUS_LABELS = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_COLORS = {
  aguardando_pagamento: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  pago: "text-[#d4ff00] border-[#d4ff00]/40 bg-[#d4ff00]/10",
  enviado: "text-blue-400 border-blue-400/40 bg-blue-400/10",
  entregue: "text-green-400 border-green-400/40 bg-green-400/10",
  cancelado: "text-red-400 border-red-400/40 bg-red-400/10",
};
