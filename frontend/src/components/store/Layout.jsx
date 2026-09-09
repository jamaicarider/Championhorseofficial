import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import SideCart from "@/components/store/SideCart";
import SearchModal from "@/components/store/SearchModal";
import { LOGO_URL } from "@/lib/brand";

const NAV = [
  { label: "SHOP", to: "/shop" },
  { label: "COLLECTIONS", to: "/shop" },
  { label: "NEW ARRIVALS", to: "/shop" },
  { label: "ABOUT", to: "/sobre" },
  { label: "CONTACT", to: "/sobre" },
];

const LEGAL = [
  { label: "Termos & Condições", to: "/sobre" },
  { label: "Política de Privacidade", to: "/sobre" },
  { label: "Trocas & Devoluções", to: "/sobre" },
];

export default function Layout({ children }) {
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const go = (to) => { setMenuOpen(false); navigate(to); };

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <div className="grid grid-cols-3 items-center px-5 sm:px-6 h-14">
          <div className="flex justify-start">
            <button
              data-testid="menu-open-btn"
              onClick={() => setMenuOpen(true)}
              className="label hover:opacity-50 transition-opacity"
            >
              MENU
            </button>
          </div>
          <Link to="/" data-testid="brand-logo" className="flex justify-center">
            <img src={LOGO_URL} alt="Champion Horse" className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="flex justify-end items-center gap-4 sm:gap-6">
            <button data-testid="search-open-btn" onClick={() => setSearchOpen(true)} className="label hover:opacity-50 transition-opacity hidden sm:block">
              SEARCH
            </button>
            <button data-testid="cart-open-btn" onClick={() => setOpen(true)} className="label hover:opacity-50 transition-opacity">
              CART{count > 0 ? ` (${count})` : ""}
            </button>
          </div>
        </div>
      </header>

      {/* Slide menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-white border-r border-[var(--line)] w-[300px] p-0 text-[#0a0a0a] flex flex-col">
          <div className="h-14 flex items-center px-5">
            <button data-testid="menu-close-btn" onClick={() => setMenuOpen(false)} className="label hover:opacity-50 transition-opacity">
              CLOSE
            </button>
          </div>
          <nav className="flex flex-col px-5 pt-6 gap-5 flex-1">
            {NAV.map((n) => (
              <button
                key={n.label}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                onClick={() => go(n.to)}
                className="label text-left hover:opacity-50 transition-opacity"
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div className="px-5 pb-6 border-t border-[var(--line)] pt-5">
            <button className="label mb-5 flex items-center gap-2 opacity-70">BRASIL (BRL) +</button>
            <div className="flex flex-col gap-2">
              {LEGAL.map((l) => (
                <button key={l.label} onClick={() => go(l.to)} className="text-[11px] text-[var(--muted)] text-left hover:text-black transition-colors">
                  {l.label}
                </button>
              ))}
            </div>
            <p className="label mt-5 text-[var(--muted-2)]">© {new Date().getFullYear()} CHAMPION HORSE™</p>
          </div>
        </SheetContent>
      </Sheet>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SideCart />

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] px-5 sm:px-6 py-8 mt-16">
        <div className="flex flex-col sm:flex-row justify-between gap-4 label text-[var(--muted)]">
          <span>© {new Date().getFullYear()} CHAMPION HORSE™</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL.map((l) => (
              <Link key={l.label} to={l.to} className="hover:text-black transition-colors">{l.label}</Link>
            ))}
          </div>
          <span>PAGAMENTO SEGURO · PAYPAL</span>
        </div>
      </footer>
    </div>
  );
}
