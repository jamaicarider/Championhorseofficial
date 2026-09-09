import React from "react";

const sections = [
  { t: "SOBRE", b: "Champion Horse é uma marca de streetwear de estúdio. Peças-conceito produzidas em lotes limitados, com foco em modelagem oversized e acabamento premium." },
  { t: "TERMOS & CONDIÇÕES", b: "Ao comprar você concorda com nossos termos. Produtos são vendidos em lotes limitados e sujeitos à disponibilidade de estoque." },
  { t: "PRIVACIDADE", b: "Seus dados são utilizados exclusivamente para processar e entregar seu pedido. Não compartilhamos informações além do necessário para pagamento e entrega." },
  { t: "TROCAS & DEVOLUÇÕES", b: "Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução, desde que a peça esteja sem uso e com a etiqueta original." },
  { t: "CONTATO", b: "lucaswork.contato@gmail.com" },
];

export default function Sobre() {
  return (
    <div className="px-5 sm:px-6 py-12 max-w-2xl">
      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.t}>
            <h2 className="label mb-2">{s.t}</h2>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
