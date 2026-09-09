import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { brl } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/products/${id}`).then(({ data }) => {
      setProduct(data);
      setColor(data.colors?.[0]?.name || null);
      setSize("");
    }).catch(() => navigate("/shop"));
    api.get("/products").then(({ data }) => setRelated(data.filter((p) => p.id !== id).slice(0, 2)));
  }, [id]);

  if (!product) return <div className="min-h-[70vh] flex items-center justify-center label text-[var(--muted)]">CARREGANDO</div>;

  const stockOf = (c, s) => product.stock?.[`${c}|${s}`] ?? 0;
  const availableSizes = product.sizes?.filter((s) => stockOf(color, s) > 0) || [];

  const handleAdd = () => {
    if (!size) { toast.error("Selecione um tamanho"); return; }
    if (stockOf(color, size) <= 0) { toast.error("Sem estoque"); return; }
    addItem({
      product_id: product.id, name: product.name, image: product.images?.[0] || "",
      color, size, price: product.price, quantity: 1,
    });
    toast.success("Adicionado à sacola");
  };

  return (
    <div className="px-5 sm:px-6 py-6">
      <button onClick={() => navigate(-1)} data-testid="pd-back" className="label flex items-center gap-1 hover:opacity-50 transition-opacity mb-6">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-8 lg:gap-10">
        {/* Left: info + accordions */}
        <div className="lg:pr-4 order-2 lg:order-1">
          <h1 className="label">{product.name}</h1>
          <p className="label text-[var(--muted)] mt-1">{brl(product.price)}</p>

          <Accordion type="single" collapsible defaultValue="details" className="mt-6">
            <AccordionItem value="details" className="border-b border-[var(--line)]">
              <AccordionTrigger className="label py-4 hover:no-underline">Detalhes do Produto</AccordionTrigger>
              <AccordionContent className="text-[12px] text-[var(--muted)] leading-relaxed pb-4">
                {product.description}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sizing" className="border-b border-[var(--line)]">
              <AccordionTrigger className="label py-4 hover:no-underline">Tamanhos</AccordionTrigger>
              <AccordionContent className="text-[12px] text-[var(--muted)] leading-relaxed pb-4">
                Modelagem oversized. Disponível em P, M, G e GG. Em caso de dúvida, escolha um tamanho abaixo do usual para caimento regular.
              </AccordionContent>
            </AccordionItem>
            {related.length > 0 && (
              <AccordionItem value="look" className="border-b border-[var(--line)]">
                <AccordionTrigger className="label py-4 hover:no-underline">Shop the Look</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {related.map((p) => (
                      <Link key={p.id} to={`/produto/${p.id}`} data-testid={`related-${p.id}`} className="group">
                        <div className="aspect-[4/5] bg-[var(--product-bg)] overflow-hidden">
                          {p.images?.[0] && <img src={mediaUrl(p.images[0])} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
                        </div>
                        <p className="label mt-2">{p.name}</p>
                        <p className="label text-[var(--muted)]">{brl(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="delivery" className="border-b border-[var(--line)]">
              <AccordionTrigger className="label py-4 hover:no-underline">Entrega e Devoluções</AccordionTrigger>
              <AccordionContent className="text-[12px] text-[var(--muted)] leading-relaxed pb-4">
                Frete fixo de R$ 25 — grátis acima de R$ 300. Trocas e devoluções em até 7 dias após o recebimento.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Center: gallery */}
        <div className="order-1 lg:order-2 space-y-4">
          {(product.images?.length ? product.images : [null]).map((img, i) => (
            <div key={i} className="aspect-[4/5] bg-[var(--product-bg)] overflow-hidden">
              {img && <img src={mediaUrl(img)} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />}
            </div>
          ))}
        </div>

        {/* Right: selectors */}
        <div className="order-3 lg:pt-0">
          <div className="lg:sticky lg:top-20">
            <p className="label mb-3">Cor: <span className="text-[var(--muted)]">{color}</span></p>
            <div className="flex gap-2 mb-8">
              {product.colors?.map((c) => (
                <button
                  key={c.name}
                  data-testid={`color-${c.name}`}
                  onClick={() => { setColor(c.name); setSize(""); }}
                  title={c.name}
                  className={`w-10 h-10 border transition-all ${color === c.name ? "border-[#0a0a0a] ring-1 ring-[#0a0a0a] ring-offset-2" : "border-[var(--line-strong)]"}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <Select value={size} onValueChange={setSize}>
              <SelectTrigger data-testid="size-select" className="w-full h-12 rounded-none border-[var(--line-strong)] label">
                <SelectValue placeholder="SELECIONE O TAMANHO" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {product.sizes?.map((s) => {
                  const disabled = stockOf(color, s) <= 0;
                  return (
                    <SelectItem key={s} value={s} disabled={disabled} data-testid={`size-opt-${s}`} className="label">
                      {s}{disabled ? " — esgotado" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <button
              data-testid="add-to-bag-btn"
              onClick={handleAdd}
              className="mt-4 w-full bg-[#0a0a0a] text-white label py-4 hover:bg-[#333] transition-colors"
            >
              ADD TO BAG — {brl(product.price)}
            </button>
            {availableSizes.length === 0 && (
              <p className="label text-[var(--muted)] mt-3 text-center">Esgotado nesta cor</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
