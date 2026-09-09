import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import { useCart } from "@/context/CartContext";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const { clear } = useCart();
  const [state, setState] = useState("processing");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const paypalOrderId = params.get("token");
    const orderId = params.get("order") || localStorage.getItem("ch_pending_order");
    (async () => {
      try {
        if (paypalOrderId) {
          const { data } = await api.post("/paypal/capture", { paypal_order_id: paypalOrderId });
          setOrder(data.order);
          setState(data.status === "COMPLETED" ? "ok" : "error");
        } else if (orderId) {
          const { data } = await api.get(`/orders/${orderId}`);
          setOrder(data);
          setState(data.status === "pago" ? "ok" : "error");
        } else setState("error");
        clear();
        localStorage.removeItem("ch_pending_order");
      } catch { setState("error"); }
    })();
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="max-w-sm w-full text-center">
        {state === "processing" && (
          <>
            <Loader2 className="w-8 h-8 mx-auto animate-spin" />
            <p className="label text-[var(--muted)] mt-6">CONFIRMANDO PAGAMENTO</p>
          </>
        )}
        {state === "ok" && (
          <div className="v-up">
            <h1 className="label text-base">PEDIDO CONFIRMADO</h1>
            <p className="text-[12px] text-[var(--muted)] mt-3">Recebemos seu pagamento. Seu pedido já está em preparação.</p>
            {order && (
              <div className="mt-8 border border-[var(--line)] p-6 text-left">
                <div className="flex justify-between label text-[var(--muted)] mb-3"><span>PEDIDO</span><span data-testid="success-order-id">#{order.id.slice(0, 8)}</span></div>
                <div className="flex justify-between label border-t border-[var(--line)] pt-3"><span>TOTAL PAGO</span><span>{brl(order.total)}</span></div>
              </div>
            )}
            <Link to="/shop" className="mt-8 inline-block bg-[#0a0a0a] text-white label px-10 py-3.5 hover:bg-[#333] transition-colors">CONTINUAR COMPRANDO</Link>
          </div>
        )}
        {state === "error" && (
          <div className="v-up">
            <h1 className="label text-base">PAGAMENTO PENDENTE</h1>
            <p className="text-[12px] text-[var(--muted)] mt-3">Não conseguimos confirmar o pagamento agora. Se você concluiu no PayPal, o status será atualizado em instantes.</p>
            <Link to="/" className="mt-8 inline-block border border-[var(--line-strong)] label px-10 py-3.5 hover:border-[#0a0a0a] transition-colors">VOLTAR À LOJA</Link>
          </div>
        )}
      </div>
    </div>
  );
}
