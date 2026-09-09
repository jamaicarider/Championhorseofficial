import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { X, Upload, Trash2, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api, mediaUrl, formatApiError } from "@/lib/api";

const ALL_SIZES = ["P", "M", "G", "GG"];
const field = "w-full bg-white border border-[var(--line-strong)] px-3 py-2 text-[13px] outline-none focus:border-[#0a0a0a] transition-colors placeholder:text-[var(--muted-2)]";

export default function ProductForm({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price || "");
  const [category, setCategory] = useState(product?.category || "Camisetas");
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [colors, setColors] = useState(product?.colors || [{ name: "Preto", hex: "#111111" }]);
  const [sizes, setSizes] = useState(product?.sizes || ["P", "M", "G", "GG"]);
  const [stock, setStock] = useState(product?.stock || {});
  const [images, setImages] = useState(product?.images || []);
  const [newColor, setNewColor] = useState({ name: "", hex: "#888888" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const toggleSize = (s) => setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const addColor = () => { if (!newColor.name.trim()) return; setColors((prev) => [...prev, { ...newColor }]); setNewColor({ name: "", hex: "#888888" }); };
  const removeColor = (n) => setColors((prev) => prev.filter((c) => c.name !== n));
  const setStockCell = (c, s, v) => setStock((prev) => ({ ...prev, [`${c}|${s}`]: parseInt(v || "0", 10) }));

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setImages((prev) => [...prev, data.url]);
      }
      toast.success("Imagem enviada");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || "Falha no upload"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const addImageUrl = () => { const url = window.prompt("Cole a URL da imagem:"); if (url) setImages((prev) => [...prev, url]); };
  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!name.trim() || !price) { toast.error("Nome e preço são obrigatórios"); return; }
    setSaving(true);
    const payload = { name, description, price: parseFloat(price), category, active, featured, colors, sizes, stock, images };
    try {
      if (isEdit) await api.put(`/admin/products/${product.id}`, payload);
      else await api.post("/admin/products", payload);
      toast.success(isEdit ? "Produto atualizado" : "Produto criado");
      onSaved();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border border-[var(--line)] rounded-none text-[#0a0a0a] max-w-3xl max-h-[90vh] overflow-y-auto p-0" data-testid="product-form">
        <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--line)] sticky top-0 bg-white z-10">
          <h2 className="label">{isEdit ? "EDITAR PRODUTO" : "NOVO PRODUTO"}</h2>
          <button onClick={onClose} className="label hover:opacity-50">CLOSE</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input data-testid="pf-name" className={field} placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} />
            <input data-testid="pf-category" className={field} placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <textarea data-testid="pf-description" className={`${field} min-h-24`} placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3 items-center">
            <input data-testid="pf-price" type="number" step="0.01" className={field} placeholder="Preço (R$)" value={price} onChange={(e) => setPrice(e.target.value)} />
            <div className="flex items-center gap-4 label">
              <label className="flex items-center gap-2 cursor-pointer"><input data-testid="pf-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#0a0a0a]" /> ATIVO</label>
              <label className="flex items-center gap-2 cursor-pointer"><input data-testid="pf-featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#0a0a0a]" /> DESTAQUE</label>
            </div>
          </div>

          <div>
            <p className="label text-[var(--muted)] mb-2">CORES</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {colors.map((c) => (
                <span key={c.name} className="flex items-center gap-2 border border-[var(--line-strong)] px-2 py-1 label">
                  <span className="w-4 h-4 border border-[var(--line-strong)]" style={{ backgroundColor: c.hex }} />
                  {c.name}
                  <button onClick={() => removeColor(c.name)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={`${field} flex-1`} placeholder="Nome da cor" value={newColor.name} onChange={(e) => setNewColor((n) => ({ ...n, name: e.target.value }))} />
              <input type="color" value={newColor.hex} onChange={(e) => setNewColor((n) => ({ ...n, hex: e.target.value }))} className="w-12 h-9 border border-[var(--line-strong)]" />
              <button data-testid="pf-add-color" onClick={addColor} className="px-3 border border-[var(--line-strong)] hover:border-[#0a0a0a] transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div>
            <p className="label text-[var(--muted)] mb-2">TAMANHOS</p>
            <div className="flex gap-2">
              {ALL_SIZES.map((s) => (
                <button key={s} onClick={() => toggleSize(s)} className={`w-12 h-10 label border transition-colors ${sizes.includes(s) ? "bg-[#0a0a0a] text-white border-[#0a0a0a]" : "border-[var(--line-strong)]"}`}>{s}</button>
              ))}
            </div>
          </div>

          {colors.length > 0 && sizes.length > 0 && (
            <div>
              <p className="label text-[var(--muted)] mb-2">ESTOQUE POR COR / TAMANHO</p>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th className="p-2 text-left label text-[var(--muted)]">COR</th>
                      {sizes.map((s) => <th key={s} className="p-2 label text-[var(--muted)]">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((c) => (
                      <tr key={c.name}>
                        <td className="p-2 whitespace-nowrap label">{c.name}</td>
                        {sizes.map((s) => (
                          <td key={s} className="p-1">
                            <input data-testid={`pf-stock-${c.name}-${s}`} type="number" min="0" value={stock[`${c.name}|${s}`] ?? 0} onChange={(e) => setStockCell(c.name, s, e.target.value)} className="w-16 bg-white border border-[var(--line-strong)] px-2 py-1.5 text-[13px] outline-none focus:border-[#0a0a0a]" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <p className="label text-[var(--muted)] mb-2">IMAGENS</p>
            <div className="flex flex-wrap gap-3 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-24 bg-[var(--product-bg)] overflow-hidden">
                  <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover mix-blend-multiply" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-white/90 p-1"><Trash2 className="w-3 h-3 text-red-500" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={upload} className="hidden" data-testid="pf-file-input" />
              <button data-testid="pf-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 border border-[var(--line-strong)] px-4 py-2 label hover:border-[#0a0a0a] transition-colors disabled:opacity-60">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} ENVIAR IMAGEM
              </button>
              <button onClick={addImageUrl} className="border border-[var(--line-strong)] px-4 py-2 label hover:border-[#0a0a0a] transition-colors">URL</button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--line)] sticky bottom-0 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 border border-[var(--line-strong)] label hover:border-[#0a0a0a] transition-colors">CANCELAR</button>
          <button data-testid="pf-save-btn" onClick={save} disabled={saving} className="px-6 py-3 bg-[#0a0a0a] text-white label hover:bg-[#333] transition-colors disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} SALVAR
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
