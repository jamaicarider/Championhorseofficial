import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api, mediaUrl } from "@/lib/api";
import { brl } from "@/lib/format";

export default function SearchModal({ open, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { if (!open) { setQ(""); setResults([]); } }, [open]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      try {
        const { data } = await api.get(`/products`, { params: { q } });
        setResults(data);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const openProduct = (id) => { onClose(); navigate(`/produto/${id}`); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white border border-[var(--line)] rounded-none text-[#0a0a0a] max-w-xl p-0 top-[12%] translate-y-0" data-testid="search-modal">
        <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--line)]">
          <Search className="w-4 h-4 text-[var(--muted)]" />
          <input autoFocus data-testid="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="BUSCAR PRODUTOS" className="flex-1 bg-transparent outline-none label placeholder:text-[var(--muted-2)]" />
          <button onClick={onClose}><X className="w-4 h-4 text-[var(--muted)]" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && q && <p className="p-4 label text-[var(--muted)]">NENHUM RESULTADO</p>}
          {results.map((p) => (
            <button key={p.id} data-testid={`search-result-${p.id}`} onClick={() => openProduct(p.id)} className="w-full flex items-center gap-4 p-3 hover:bg-[var(--product-bg)] transition-colors text-left">
              <div className="w-12 h-14 bg-[var(--product-bg)] overflow-hidden shrink-0">
                {p.images?.[0] && <img src={mediaUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover mix-blend-multiply" />}
              </div>
              <div className="flex-1">
                <p className="label">{p.name}</p>
                <p className="label text-[var(--muted)]">{brl(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
