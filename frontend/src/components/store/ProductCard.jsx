import React from "react";
import { Link } from "react-router-dom";
import { mediaUrl } from "@/lib/api";
import { brl } from "@/lib/format";

export default function ProductCard({ product, index = 0 }) {
  const img = product.images?.[0];
  const img2 = product.images?.[1];
  return (
    <Link
      to={`/produto/${product.id}`}
      data-testid={`product-card-${product.id}`}
      className="group block v-fade"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative aspect-[4/5] bg-[var(--product-bg)] overflow-hidden">
        {img && (
          <img src={mediaUrl(img)} alt={product.name} className="w-full h-full object-cover mix-blend-multiply transition-opacity duration-500 group-hover:opacity-0" />
        )}
        {img2 && (
          <img src={mediaUrl(img2)} alt={product.name} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
      </div>
      <div className="text-center mt-4">
        <h3 className="label">{product.name}</h3>
        <p className="label text-[var(--muted)] mt-1">{brl(product.price)}</p>
      </div>
    </Link>
  );
}
