import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import Layout from "@/components/store/Layout";
import Home from "@/pages/store/Home";
import Shop from "@/pages/store/Shop";
import ProductDetail from "@/pages/store/ProductDetail";
import Checkout from "@/pages/store/Checkout";
import CheckoutSuccess from "@/pages/store/CheckoutSuccess";
import CheckoutError from "@/pages/store/CheckoutError";
import Sobre from "@/pages/store/Sobre";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";

const Store = ({ children }) => <Layout>{children}</Layout>;

function AdminGate() {
  const { admin, checked } = useAdminAuth();
  if (!checked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="label text-[var(--muted)]">CARREGANDO</span>
      </div>
    );
  }
  return admin ? <AdminDashboard /> : <AdminLogin />;
}

function App() {
  return (
    <AdminAuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster theme="light" position="top-center" toastOptions={{ style: { background: "#fff", border: "1px solid #e2e2e2", color: "#0a0a0a", borderRadius: 0, fontSize: "12px" } }} />
          <Routes>
            <Route path="/" element={<Store><Home /></Store>} />
            <Route path="/shop" element={<Store><Shop /></Store>} />
            <Route path="/produto/:id" element={<Store><ProductDetail /></Store>} />
            <Route path="/checkout" element={<Store><Checkout /></Store>} />
            <Route path="/checkout/sucesso" element={<Store><CheckoutSuccess /></Store>} />
            <Route path="/checkout/erro" element={<Store><CheckoutError /></Store>} />
            <Route path="/sobre" element={<Store><Sobre /></Store>} />
            <Route path="/admlucas" element={<AdminGate />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AdminAuthProvider>
  );
}

export default App;
