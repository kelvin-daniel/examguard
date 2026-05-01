"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  className,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors shrink-0 shadow-[inset_0_1px_2px_rgba(15,23,42,0.10)] disabled:opacity-50",
        checked
          ? "bg-gradient-to-b from-[#3b82f6] to-[#2563eb]"
          : "bg-[var(--bg-muted)] dark:bg-white/10",
        className
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-[0_1px_3px_rgba(15,23,42,0.2)]",
          checked ? "translate-x-[20px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="min-w-0">
        <div className="text-base font-medium text-[var(--fg)]">{label}</div>
        {description && (
          <div className="text-sm text-[var(--fg-muted)] mt-0.5">
            {description}
          </div>
        )}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        label={label}
      />
    </label>
  );
}
