import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const STORAGE_KEY = "ch_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const keyOf = (i) => `${i.product_id}|${i.color}|${i.size}`;

  const addItem = (item) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => keyOf(p) === keyOf(item));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + item.quantity };
        return copy;
      }
      return [...prev, item];
    });
    setOpen(true);
  };

  const updateQty = (key, qty) => {
    setItems((prev) =>
      prev
        .map((p) => (keyOf(p) === key ? { ...p, quantity: Math.max(1, qty) } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const removeItem = (key) => setItems((prev) => prev.filter((p) => keyOf(p) !== key));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clear, count, subtotal, open, setOpen, keyOf }}
    >
      {children}
    </CartContext.Provider>
  );
}
