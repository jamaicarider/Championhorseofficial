import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { brl } from "@/lib/format";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data));
  }, []);

  if (products.length === 0) {
    return <div className="min-h-[70vh] flex items-center justify-center label text-[var(--muted)]">CARREGANDO</div>;
  }

  const n = products.length;
  const current = products[idx];
  const prev = products[(idx - 1 + n) % n];
  const next = products[(idx + 1) % n];

  const move = (d) => setIdx((i) => (i + d + n) % n);

  return (
    <section className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-10 select-none">
      {/* Peek neighbours */}
      {n > 1 && (
        <>
          <button
            onClick={() => move(-1)}
            data-testid="hero-prev"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[16%] max-w-[220px] opacity-40 hover:opacity-70 transition-opacity"
          >
            <div className="aspect-[3/4] bg-[var(--product-bg)] overflow-hidden">
              {prev.images?.[0] && <img src={mediaUrl(prev.images[0])} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
            </div>
          </button>
          <button
            onClick={() => move(1)}
            data-testid="hero-next"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[16%] max-w-[220px] opacity-40 hover:opacity-70 transition-opacity"
          >
            <div className="aspect-[3/4] bg-[var(--product-bg)] overflow-hidden">
              {next.images?.[0] && <img src={mediaUrl(next.images[0])} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
            </div>
          </button>
        </>
      )}

      {/* Center product */}
      <div className="w-full max-w-lg v-fade" key={current.id}>
        <button onClick={() => navigate(`/produto/${current.id}`)} data-testid="hero-product" className="block w-full group">
          <div className="aspect-[4/5] bg-[var(--product-bg)] overflow-hidden">
            {current.images?.[0] && (
              <img src={mediaUrl(current.images[0])} alt={current.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-[1.02] transition-transform duration-700" />
            )}
          </div>
        </button>
        <div className="text-center mt-6">
          <h1 className="label">{current.name}</h1>
          <p className="label text-[var(--muted)] mt-1">{brl(current.price)}</p>
        </div>
      </div>

      {n > 1 && (
        <div className="flex items-center gap-3 mt-6">
          <button onClick={() => move(-1)} className="hover:opacity-50 transition-opacity"><ChevronLeft className="w-4 h-4" /></button>
          <span className="label text-[var(--muted)]">{String(idx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          <button onClick={() => move(1)} className="hover:opacity-50 transition-opacity"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      <Link
        to="/shop"
        data-testid="shop-all-btn"
        className="mt-8 bg-[#0a0a0a] text-white label px-10 py-3.5 hover:bg-[#333] transition-colors"
      >
        SHOP ALL
      </Link>
    </section>
  );
}
