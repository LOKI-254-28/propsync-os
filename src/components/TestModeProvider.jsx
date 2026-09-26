import React, { useState, useEffect, createContext, useContext } from "react";
import { initStore, getStore, hasStore, setTestRole } from "@/lib/testStore";

const TestModeContext = createContext(null);

export function TestModeProvider({ children }) {
  const [role, setRoleState] = useState("tenant");
  const [version, setVersion] = useState(0);

  // Synchronous init — runs during render, before child effects,
  // so the store is ready when production pages call base44.auth.me().
  if (typeof window !== "undefined") {
    if (!hasStore("tenant")) initStore("tenant");
    if (!hasStore("landlord")) initStore("landlord");
    setTestRole(role);
  }

  useEffect(() => { setTestRole(role); }, [role]);

  const setRole = (r) => {
    setTestRole(r);
    setRoleState(r);
  };

  const resetData = () => {
    initStore(role);
    setTestRole(role);
    setVersion((v) => v + 1);
  };

  const user = getStore()?.user;

  return (
    <TestModeContext.Provider value={{ role, setRole, resetData, user, version }}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestMode() {
  const ctx = useContext(TestModeContext);
  if (!ctx) throw new Error("useTestMode must be used within TestModeProvider");
  return ctx;
}