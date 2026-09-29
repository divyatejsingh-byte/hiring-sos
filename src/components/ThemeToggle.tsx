"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "hsos-theme";

export function ThemeToggle() {
  // null until mounted: the server can't know the theme, and layout.tsx already applied it.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the switch still works for this visit */
    }
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      onClick={toggle}
      className="ml-1 grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink active:scale-95"
      title={label}
      aria-label={label}
    >
      {theme === null ? (
        <span className="size-4" />
      ) : theme === "dark" ? (
        <Sun key="sun" className="animate-pop size-4" />
      ) : (
        <Moon key="moon" className="animate-pop size-4" />
      )}
    </button>
  );
}
