import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-12 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-2 text-base text-[var(--fg)] transition-colors",
      "placeholder:text-[var(--fg-subtle)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "dark:bg-white/5 dark:border-white/10",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Grow to fit content instead of scrolling. Disables manual resize. */
  autoGrow?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow, value, defaultValue, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
            node;
      },
      [ref]
    );

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoGrow]);

    // Re-fit when the controlled value changes (e.g. type changes, imports).
    React.useEffect(() => {
      resize();
    }, [resize, value]);

    return (
      <textarea
        ref={setRef}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        className={cn(
          "flex w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-base text-[var(--fg)] transition-colors",
          autoGrow ? "resize-none overflow-hidden" : "min-h-[112px] resize-y",
          "placeholder:text-[var(--fg-subtle)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:border-[var(--primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-white/5 dark:border-white/10",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-[var(--fg)]",
        className
      )}
      {...props}
    />
  );
}
