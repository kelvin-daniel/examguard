"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className={`relative h-9 w-16 rounded-full transition-colors flex items-center px-1 ${
        isDark
          ? "bg-[#0f172a]"
          : "bg-gradient-to-br from-[#fbbf24] to-[#fca5a5]"
      } ${className}`}
    >
      <span
        className={`absolute h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center transition-transform ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-[#0f172a]" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-[#2563eb]" />
        )}
      </span>
      <span className="sr-only">{isDark ? "Dark mode" : "Light mode"}</span>
    </button>
  );
}
