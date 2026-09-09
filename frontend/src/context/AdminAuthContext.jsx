import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AdminAuthContext = createContext(null);
export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null); // null=checking, false=unauth, obj=auth
  const [checked, setChecked] = useState(false);

  const check = async () => {
    const token = localStorage.getItem("ch_admin_token");
    if (!token) {
      setAdmin(false);
      setChecked(true);
      return;
    }
    try {
      const { data } = await api.get("/admin/me");
      setAdmin(data);
    } catch {
      localStorage.removeItem("ch_admin_token");
      setAdmin(false);
    } finally {
      setChecked(true);
    }
  };

  useEffect(() => {
    check();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/admin/login", { email, password });
    localStorage.setItem("ch_admin_token", data.token);
    setAdmin(data.admin);
    return data.admin;
  };

  const logout = () => {
    localStorage.removeItem("ch_admin_token");
    setAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, checked, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
