import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { brl, STATUS_LABELS } from "@/lib/format";
import { useAdminAuth } from "@/context/AdminAuthContext";
import ProductForm from "@/components/admin/ProductForm";
import { LOGO_URL } from "@/lib/brand";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadOrders = () => api.get("/admin/orders").then(({ data }) => setOrders(data));
  const loadProducts = () => api.get("/admin/products").then(({ data }) => setProducts(data));

  useEffect(() => { loadOrders(); loadProducts(); }, []);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => ["pago", "enviado", "entregue"].includes(o.status));
    return {
      total: orders.length,
      revenue: paid.reduce((s, o) => s + o.total, 0),
      pending: orders.filter((o) => o.status === "aguardando_pagamento").length,
      products: products.length,
    };
  }, [orders, products]);

  const updateStatus = async (orderId, status) => {
    try { await api.put(`/admin/orders/${orderId}/status`, { status }); toast.success("Status atualizado"); loadOrders(); }
    catch { toast.error("Erro ao atualizar"); }
  };

  const saveTracking = async (orderId, tracking) => {
    try { await api.put(`/admin/orders/${orderId}/status`, { status: "enviado", tracking }); toast.success("Marcado como enviado"); loadOrders(); }
    catch { toast.error("Erro ao atualizar"); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    await api.delete(`/admin/products/${id}`);
    toast.success("Produto excluído");
    loadProducts();
  };

  const statCards = [
    { label: "PEDIDOS", value: stats.total },
    { label: "RECEITA PAGA", value: brl(stats.revenue) },
    { label: "AGUARDANDO PGTO", value: stats.pending },
    { label: "PRODUTOS", value: stats.products },
  ];

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      <header className="border-b border-[var(--line)] px-5 sm:px-6 h-14 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Champion Horse" className="h-7 w-auto" />
          <span className="label border-l border-[var(--line)] pl-3">PAINEL ADMIN</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block label text-[var(--muted)]">{admin?.email}</span>
          <button data-testid="admin-logout-btn" onClick={logout} className="label flex items-center gap-1.5 hover:opacity-50 transition-opacity"><LogOut className="w-3.5 h-3.5" /> SAIR</button>
        </div>
      </header>

      <div className="px-5 sm:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {statCards.map((c) => (
            <div key={c.label} className="border border-[var(--line)] p-5">
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="label text-[var(--muted)] mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-6 border-b border-[var(--line)] mb-6">
          {[["orders", "PEDIDOS"], ["products", "PRODUTOS"]].map(([k, label]) => (
            <button key={k} data-testid={`admin-tab-${k}`} onClick={() => setTab(k)} className={`label py-3 border-b-2 -mb-px transition-colors ${tab === k ? "border-[#0a0a0a]" : "border-transparent text-[var(--muted)] hover:text-black"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <div className="space-y-3" data-testid="admin-orders-list">
            {orders.length === 0 && <p className="label text-[var(--muted)]">NENHUM PEDIDO AINDA</p>}
            {orders.map((o) => (
              <div key={o.id} data-testid={`admin-order-${o.id}`} className="border border-[var(--line)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="label">#{o.id.slice(0, 8)}</span>
                      <span className="label border border-[var(--line-strong)] px-2 py-0.5">{STATUS_LABELS[o.status]}</span>
                    </div>
                    <p className="label mt-2">{o.customer?.name} · <span className="text-[var(--muted)]">{o.customer?.email}</span></p>
                    <p className="label text-[var(--muted)] mt-1">{o.address?.rua}, {o.address?.numero} — {o.address?.cidade}/{o.address?.estado} · {o.address?.cep}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{brl(o.total)}</p>
                    <p className="label text-[var(--muted)]">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.items?.map((it, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[var(--product-bg)] px-2 py-1">
                      <div className="w-8 h-9 bg-white overflow-hidden">
                        {it.image && <img src={mediaUrl(it.image)} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
                      </div>
                      <span className="label text-[var(--muted)]">{it.name} · {it.color}/{it.size} ×{it.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger data-testid={`order-status-select-${o.id}`} className="w-52 rounded-none border-[var(--line-strong)] label"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-none">
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="label">{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {o.status === "pago" && (
                    <button data-testid={`order-ship-btn-${o.id}`} onClick={() => { const t = window.prompt("Código de rastreio (opcional):") || ""; saveTracking(o.id, t); }} className="bg-[#0a0a0a] text-white label px-4 py-2 hover:bg-[#333] transition-colors">
                      MARCAR COMO ENVIADO
                    </button>
                  )}
                  {o.tracking && <span className="label text-[var(--muted)]">RASTREIO: {o.tracking}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "products" && (
          <div>
            <div className="flex justify-end mb-5">
              <button data-testid="admin-add-product-btn" onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-2 bg-[#0a0a0a] text-white label px-5 py-3 hover:bg-[#333] transition-colors">
                <Plus className="w-3.5 h-3.5" /> NOVO PRODUTO
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-products-list">
              {products.map((p) => (
                <div key={p.id} data-testid={`admin-product-${p.id}`} className="border border-[var(--line)]">
                  <div className="aspect-[4/5] bg-[var(--product-bg)] overflow-hidden">
                    {p.images?.[0] && <img src={mediaUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover mix-blend-multiply" />}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      <h3 className="label flex-1">{p.name}</h3>
                      {!p.active && <span className="label text-red-500 border border-red-300 px-1">OFF</span>}
                      {p.featured && <span className="label border border-[var(--line-strong)] px-1">★</span>}
                    </div>
                    <p className="label">{brl(p.price)}</p>
                    <div className="flex gap-2 mt-3">
                      <button data-testid={`edit-product-${p.id}`} onClick={() => { setEditing(p); setFormOpen(true); }} className="flex-1 flex items-center justify-center gap-1 border border-[var(--line-strong)] py-2 label hover:border-[#0a0a0a] transition-colors">
                        <Pencil className="w-3 h-3" /> EDITAR
                      </button>
                      <button data-testid={`delete-product-${p.id}`} onClick={() => deleteProduct(p.id)} className="px-3 border border-[var(--line-strong)] hover:border-red-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {formOpen && <ProductForm product={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); loadProducts(); }} />}
    </div>
  );
}
