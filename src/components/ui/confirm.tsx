"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Ctx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<Ctx | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm: Ctx["confirm"] = useCallback((o) => {
    setOpts(o);
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function close(value: boolean) {
    setOpen(false);
    setOpts(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }

  // Esc to cancel
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && opts && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm animate-in"
          onClick={() => close(false)}
        >
          <div
            className="max-w-md w-full glass rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  opts.destructive
                    ? "bg-gradient-to-br from-[#ef4444] to-[#dc2626]"
                    : "bg-gradient-to-br from-[#3b82f6] to-[#2563eb]"
                }`}
              >
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[var(--fg)] leading-tight">
                  {opts.title}
                </h3>
                {opts.description && (
                  <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                    {opts.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="text-[var(--fg-subtle)] hover:text-[var(--fg)] flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 pb-5 pt-1 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                {opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={opts.destructive ? "destructive" : "primary"}
                onClick={() => close(true)}
                autoFocus
              >
                {opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
