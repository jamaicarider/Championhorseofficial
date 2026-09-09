# Champion Horse — Loja de Streetwear (void™ aesthetic)

## Problema / Visão
E-commerce de streetwear com estética void™ (LIGHT, monocromática, tipografia monospace, muito espaço em branco). Checkout de convidado via PayPal, painel admin escondido em `/admlucas` com login real (JWT+bcrypt).

## Personas
- Cliente final: compra rápida sem criar conta.
- Admin único (Lucas): gerencia produtos e pedidos sem mexer em código.

## Arquitetura
- Frontend: React (JSX) + Tailwind + shadcn/ui. Fonte JetBrains Mono. Tema claro monocromático (#fff / #0a0a0a, produto em cinza claro com mix-blend-multiply). Logo CH (adesivo).
- Backend: FastAPI, rotas sob `/api`. IDs uuid string (sem ObjectId).
- DB: MongoDB (products, orders, admins, files).
- Pagamento: PayPal Sandbox (REST v2) — create-order → redirect approve_url → capture no retorno + webhook `/api/webhook/paypal` (external_reference = custom_id = order id).
- Imagens: Emergent Object Storage (upload no admin, servidas via `/api/files/{path}`).
- Auth admin: JWT Bearer (localStorage `ch_admin_token`) + bcrypt. Seed idempotente.

## Requisitos estáticos
- Português BR, moeda BRL. Frete fixo R$25, grátis ≥ R$300.
- Cores/tamanhos por produto com estoque por combinação (`Cor|Tamanho`).

## Implementado (2026-06)
- Loja: Home (carrossel centrado), Catálogo grid, Página de produto (galeria, cor, tamanho dropdown, add-to-bag, Shop the Look, accordions), carrinho lateral, busca, menu lateral, footer, Sobre/Termos/Privacidade/Trocas.
- Checkout de convidado (dados + endereço) → PayPal → sucesso/erro.
- Admin `/admlucas`: login JWT, dashboard com stats, CRUD de produtos, upload de imagens, gestão de pedidos (status + marcar enviado + rastreio).
- Produto seed "Camiseta Champion Horse" (Preto/Branco, P/M/G/GG) com imagens geradas.
- Testado: backend 100% (20 testes pytest), frontend 100%.

## Backlog / Futuro
- P1: Verificação de assinatura do webhook PayPal (produção) — hoje qualquer POST com order_id pode marcar pago. Requer Webhook ID do painel PayPal.
- P1: Trocar credenciais PayPal Sandbox → Live ao publicar.
- P2: A11y — DialogTitle/VisuallyHidden nos Sheet/Dialog (warnings Radix).
- P2: Contas de cliente + histórico; cálculo de frete real; cupons; Pix/Mercado Pago; e-mails de confirmação; múltiplos admins.
