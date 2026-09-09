import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, mediaUrl, formatApiError } from "@/lib/api";
import { brl } from "@/lib/format";
import { useCart } from "@/context/CartContext";

const SHIPPING = 25;
const FREE_SHIP = 300;
const field = "w-full bg-white border border-[var(--line-strong)] px-3 py-3 text-[13px] outline-none focus:border-[#0a0a0a] transition-colors placeholder:text-[var(--muted-2)]";

export default function Checkout() {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", cpf: "", phone: "",
    cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "", complemento: "",
  });

  useEffect(() => { if (items.length === 0) navigate("/shop"); }, []);

  const shipping = subtotal >= FREE_SHIP ? 0 : SHIPPING;
  const total = subtotal + shipping;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.name || !form.email) return "Preencha nome e e-mail";
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) return "E-mail inválido";
    if (!form.cep || !form.rua || !form.numero || !form.cidade || !form.estado) return "Preencha o endereço de entrega";
    return null;
  };

  const pay = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const { data: order } = await api.post("/orders", {
        items: items.map((i) => ({ product_id: i.product_id, name: i.name, image: i.image, color: i.color, size: i.size, price: i.price, quantity: i.quantity })),
        customer: { name: form.name, email: form.email, cpf: form.cpf, phone: form.phone },
        address: { cep: form.cep, rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento },
      });
      localStorage.setItem("ch_pending_order", order.id);
      const { data: pp } = await api.post("/paypal/create-order", { order_id: order.id });
      if (pp.approve_url) window.location.href = pp.approve_url;
      else { toast.error("Não foi possível iniciar o pagamento"); setLoading(false); }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro ao processar pedido");
      setLoading(false);
    }
  };

  return (
    <div className="px-5 sm:px-6 py-10 max-w-5xl mx-auto">
      <h1 className="label mb-10">CHECKOUT</h1>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-10">
          <section>
            <h2 className="label mb-4">01 — DADOS PESSOAIS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input data-testid="checkout-name" className={field} placeholder="Nome completo" value={form.name} onChange={set("name")} />
              <input data-testid="checkout-email" className={field} placeholder="E-mail" value={form.email} onChange={set("email")} />
              <input data-testid="checkout-cpf" className={field} placeholder="CPF" value={form.cpf} onChange={set("cpf")} />
              <input data-testid="checkout-phone" className={field} placeholder="Telefone" value={form.phone} onChange={set("phone")} />
            </div>
          </section>
          <section>
            <h2 className="label mb-4">02 — ENDEREÇO DE ENTREGA</h2>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <input data-testid="checkout-cep" className={`${field} sm:col-span-2`} placeholder="CEP" value={form.cep} onChange={set("cep")} />
              <input data-testid="checkout-rua" className={`${field} sm:col-span-4`} placeholder="Rua / Logradouro" value={form.rua} onChange={set("rua")} />
              <input data-testid="checkout-numero" className={`${field} sm:col-span-2`} placeholder="Número" value={form.numero} onChange={set("numero")} />
              <input data-testid="checkout-bairro" className={`${field} sm:col-span-4`} placeholder="Bairro" value={form.bairro} onChange={set("bairro")} />
              <input data-testid="checkout-cidade" className={`${field} sm:col-span-3`} placeholder="Cidade" value={form.cidade} onChange={set("cidade")} />
              <input data-testid="checkout-estado" className={`${field} sm:col-span-1`} placeholder="UF" value={form.estado} onChange={set("estado")} />
              <input data-testid="checkout-complemento" className={`${field} sm:col-span-2`} placeholder="Compl." value={form.complemento} onChange={set("complemento")} />
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <div className="border border-[var(--line)] p-6 sticky top-20">
            <h2 className="label text-[var(--muted)] mb-5">RESUMO DO PEDIDO</h2>
            <div className="space-y-4 max-h-64 overflow-y-auto mb-5">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-14 h-16 bg-[var(--product-bg)] overflow-hidden shrink-0">
                    {it.image && <img src={mediaUrl(it.image)} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
                  </div>
                  <div className="flex-1">
                    <p className="label">{it.name}</p>
                    <p className="label text-[var(--muted)] mt-1">{it.color}/{it.size} × {it.quantity}</p>
                  </div>
                  <span className="label">{brl(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-[var(--line)] pt-4 label">
              <div className="flex justify-between text-[var(--muted)]"><span>SUBTOTAL</span><span>{brl(subtotal)}</span></div>
              <div className="flex justify-between text-[var(--muted)]"><span>FRETE</span><span>{shipping === 0 ? "GRÁTIS" : brl(shipping)}</span></div>
              <div className="flex justify-between pt-2"><span>TOTAL</span><span data-testid="checkout-total">{brl(total)}</span></div>
            </div>
            <button data-testid="checkout-pay-btn" onClick={pay} disabled={loading} className="mt-6 w-full bg-[#0a0a0a] text-white label py-4 flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "REDIRECIONANDO" : "PAGAR COM PAYPAL"}
            </button>
            <p className="mt-3 label text-[var(--muted)] text-center">VOCÊ SERÁ REDIRECIONADO AO PAYPAL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
