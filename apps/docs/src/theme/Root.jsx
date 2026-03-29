import React, { createContext, useContext, useEffect, useState } from "react";
import UsersAnalytics from "../components/UsersAnalytics/UsersAnalytics";
import { Toaster } from "sonner";
import { FrameworkProvider } from "../context/FrameworkContext";

import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";

/** Root wrapper providing dialect context, analytics, and toast notifications */
function Root({ children }) {
  useEffect(() => {
    document.querySelectorAll(".menu__link--active").forEach((activeLink) => {
      if (activeLink.scrollIntoViewIfNeeded) {
        activeLink.scrollIntoViewIfNeeded?.();
      } else {
        activeLink.scrollIntoView({
          behavior: "instant",
          block: "nearest",
        });
      }
    });
  }, []);

  const [lang, setLang] = useState("TS");

  return (
    <FrameworkProvider>
      <DialectContext.Provider value={{ lang, setLang }}>
        {children}
        <UsersAnalytics />
        <Toaster />
      </DialectContext.Provider>
    </FrameworkProvider>
  );
}

/** Context holding the current JS/TS dialect and its setter */
const DialectContext = createContext();

/** Hook returning the currently selected dialect ("JS" or "TS") */
export function useSelectedDialect() {
  return useContext(DialectContext).lang;
}

/** Hook returning a setter to change the active dialect */
export function useSetDialect() {
  return useContext(DialectContext).setLang;
}

export default Root;
