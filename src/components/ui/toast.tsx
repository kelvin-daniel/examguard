"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
};

type Ctx = {
  toast: (
    input:
      | string
      | {
          title: string;
          description?: string;
          kind?: ToastKind;
          duration?: number;
        }
  ) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast: Ctx["toast"] = useCallback((input) => {
    const t: Toast = {
      id: crypto.randomUUID(),
      kind:
        typeof input === "string" ? "info" : input.kind ?? "info",
      title: typeof input === "string" ? input : input.title,
      description: typeof input === "string" ? undefined : input.description,
      duration: typeof input === "string" ? 4000 : input.duration ?? 4000,
    };
    setItems((prev) => [...prev, t]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
        {items.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const KIND_STYLES: Record<
  ToastKind,
  { bg: string; iconColor: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    bg: "border-l-[#10b981]",
    iconColor: "text-[#047857]",
    Icon: CheckCircle2,
  },
  error: {
    bg: "border-l-[#dc2626]",
    iconColor: "text-[#dc2626]",
    Icon: AlertCircle,
  },
  warning: {
    bg: "border-l-[#f59e0b]",
    iconColor: "text-[#92400e]",
    Icon: TriangleAlert,
  },
  info: {
    bg: "border-l-[var(--primary)]",
    iconColor: "text-[var(--primary)]",
    Icon: Info,
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const style = KIND_STYLES[toast.kind];
  const Icon = style.Icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto glass rounded-2xl border-l-4 ${style.bg} px-4 py-3 flex items-start gap-3 animate-in shadow-[0_8px_24px_-6px_rgba(15,23,42,0.15)]`}
    >
      <Icon className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--fg)]">
          {toast.title}
        </div>
        {toast.description && (
          <div className="text-sm text-[var(--fg-muted)] mt-0.5">
            {toast.description}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
