import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";

export default function Shop() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data));
  }, []);

  return (
    <div className="px-5 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="label">TODOS OS PRODUTOS</h1>
        <span className="label text-[var(--muted)]">{String(products.length).padStart(2, "0")} ITENS</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </div>
  );
}
