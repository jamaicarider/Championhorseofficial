import React from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { brl } from "@/lib/format";
import { mediaUrl } from "@/lib/api";

const FREE_SHIP = 300;

export default function SideCart() {
  const { items, open, setOpen, updateQty, removeItem, subtotal, keyOf } = useCart();
  const navigate = useNavigate();
  const remaining = Math.max(0, FREE_SHIP - subtotal);

  const checkout = () => { setOpen(false); navigate("/checkout"); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="bg-white border-l border-[var(--line)] w-full sm:max-w-md p-0 text-[#0a0a0a] flex flex-col" data-testid="side-cart">
        <div className="h-14 flex items-center justify-between px-5 border-b border-[var(--line)]">
          <span className="label">SACOLA ({items.length})</span>
          <button data-testid="cart-close-btn" onClick={() => setOpen(false)} className="label hover:opacity-50 transition-opacity">CLOSE</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="label text-[var(--muted)]">SUA SACOLA ESTÁ VAZIA</p>
            <button data-testid="cart-empty-shop-btn" onClick={() => { setOpen(false); navigate("/shop"); }} className="label underline">
              EXPLORAR CATÁLOGO
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {items.map((it) => {
                const k = keyOf(it);
                return (
                  <div key={k} data-testid={`cart-item-${k}`} className="flex gap-4">
                    <div className="w-20 h-24 bg-[var(--product-bg)] shrink-0 overflow-hidden">
                      {it.image && <img src={mediaUrl(it.image)} alt={it.name} className="w-full h-full object-cover mix-blend-multiply" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <h3 className="label">{it.name}</h3>
                        <button data-testid={`cart-remove-${k}`} onClick={() => removeItem(k)} className="hover:opacity-50 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="label text-[var(--muted)] mt-1">{it.color} / {it.size}</p>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center border border-[var(--line-strong)]">
                          <button data-testid={`cart-dec-${k}`} onClick={() => updateQty(k, it.quantity - 1)} className="p-1.5 hover:opacity-50"><Minus className="w-3 h-3" /></button>
                          <span className="px-3 label">{it.quantity}</span>
                          <button data-testid={`cart-inc-${k}`} onClick={() => updateQty(k, it.quantity + 1)} className="p-1.5 hover:opacity-50"><Plus className="w-3 h-3" /></button>
                        </div>
                        <span className="label">{brl(it.price * it.quantity)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--line)] p-5 space-y-4">
              <p className="label text-[var(--muted)]">
                {remaining > 0 ? `Faltam ${brl(remaining)} para frete grátis` : "Frete grátis desbloqueado"}
              </p>
              <div className="flex justify-between label">
                <span>SUBTOTAL</span>
                <span data-testid="cart-subtotal">{brl(subtotal)}</span>
              </div>
              <button data-testid="cart-checkout-btn" onClick={checkout} className="w-full bg-[#0a0a0a] text-white label py-4 hover:bg-[#333] transition-colors">
                FINALIZAR COMPRA
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
