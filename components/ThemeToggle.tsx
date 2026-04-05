"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

const ORDER: Theme[] = ["dark", "light", "system"];
const ICONS: Record<Theme, string> = { dark: "🌙", light: "☀️", system: "💻" };
const LABELS: Record<Theme, string> = { dark: "Dark", light: "Light", system: "System" };

function applyTheme(t: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isLight = t === "light" || (t === "system" && !prefersDark);
  document.documentElement.classList.toggle("light", isLight);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "dark";
    setTheme(stored);
    applyTheme(stored);

    // React to OS preference changes when in "system" mode
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (localStorage.getItem("theme") as Theme | null) ?? "dark";
      if (current === "system") applyTheme("system");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  };

  return (
    <button
      onClick={cycle}
      title={`Theme: ${LABELS[theme]} — click to cycle`}
      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-700"
    >
      <span>{ICONS[theme]}</span>
      <span className="hidden sm:inline text-xs">{LABELS[theme]}</span>
    </button>
  );
}
