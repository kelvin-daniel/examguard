"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, ChevronDown, ShieldAlert } from "lucide-react";

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff9a7a] to-[#ff7a59] text-white text-xs font-semibold flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(255,122,89,0.4)]">
          {initials}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-[var(--fg)]">
          {name.split(" ")[0]}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--fg-subtle)]" />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl glass overflow-hidden z-50">
            <div className="p-3 border-b border-[var(--border)]">
              <div className="font-medium text-sm text-[var(--fg)] truncate">
                {name}
              </div>
              <div className="text-xs text-[var(--fg-muted)] truncate">
                {email}
              </div>
            </div>
            {role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="w-full text-left px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-white/40 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <ShieldAlert className="h-4 w-4 text-[var(--primary)]" />
                Admin dashboard
              </Link>
            )}
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-white/40 dark:hover:bg-white/5 flex items-center gap-2 border-t border-[var(--border)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
