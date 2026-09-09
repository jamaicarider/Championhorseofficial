import React from "react";
import { Link } from "react-router-dom";

export default function CheckoutError() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="max-w-sm w-full text-center v-up">
        <h1 className="label text-base">PAGAMENTO CANCELADO</h1>
        <p className="text-[12px] text-[var(--muted)] mt-3">Seu pagamento não foi concluído. Sua sacola foi preservada — você pode tentar novamente quando quiser.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/checkout" className="bg-[#0a0a0a] text-white label px-8 py-3.5 hover:bg-[#333] transition-colors">TENTAR NOVAMENTE</Link>
          <Link to="/shop" className="border border-[var(--line-strong)] label px-8 py-3.5 hover:border-[#0a0a0a] transition-colors">CATÁLOGO</Link>
        </div>
      </div>
    </div>
  );
}
