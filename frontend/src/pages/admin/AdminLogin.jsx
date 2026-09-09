import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { formatApiError } from "@/lib/api";
import { LOGO_URL } from "@/lib/brand";

const field = "w-full bg-white border border-[var(--line-strong)] px-3 py-3 text-[13px] outline-none focus:border-[#0a0a0a] transition-colors placeholder:text-[var(--muted-2)]";

export default function AdminLogin() {
  const { admin, checked, login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (checked && admin) navigate("/admlucas"); }, [checked, admin]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admlucas");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || "Falha no login");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <form onSubmit={submit} data-testid="admin-login-form" className="w-full max-w-xs">
        <img src={LOGO_URL} alt="Champion Horse" className="h-10 w-auto mx-auto mb-8" />
        <h1 className="label text-center mb-8">PAINEL ADMIN</h1>
        {error && <div data-testid="admin-login-error" className="mb-4 border border-red-400 bg-red-50 text-red-600 text-[12px] px-3 py-2">{error}</div>}
        <div className="space-y-3">
          <input data-testid="admin-email-input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          <input data-testid="admin-password-input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        </div>
        <button data-testid="admin-login-btn" type="submit" disabled={loading} className="mt-6 w-full bg-[#0a0a0a] text-white label py-4 flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} ENTRAR
        </button>
      </form>
    </div>
  );
}
