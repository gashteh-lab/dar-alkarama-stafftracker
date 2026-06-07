// hooks/useTheme.ts
"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("stafftrack-theme") as Theme || "system";
    setThemeState(stored);
    applyTheme(stored);

    // Listen for system preference changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (stored === "system") applyTheme("system");
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  function applyTheme(t: Theme) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = t === "dark" || (t === "system" && prefersDark);

    document.documentElement.classList.toggle("dark", isDark);
    setResolvedTheme(isDark ? "dark" : "light");

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0F172A" : "#ffffff");
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("stafftrack-theme", t);
    applyTheme(t);
  }

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
