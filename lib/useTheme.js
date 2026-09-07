"use client";

import { useState } from "react";

const THEME_KEY = "vbox-theme";

function readInitialTheme() {
  if (typeof document === "undefined") {
    return "dark";
  }
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignora falha ao persistir a preferência (ex. modo privado)
      }
      return next;
    });
  };

  return { theme, toggleTheme };
}
