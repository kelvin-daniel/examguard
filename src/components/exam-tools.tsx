"use client";

import { useEffect, useState } from "react";
import { Calculator as CalcIcon, StickyNote, X, Delete } from "lucide-react";

/**
 * Pixels of the layout viewport currently hidden by the on-screen keyboard.
 * Returns 0 on desktop and wherever visualViewport isn't supported, so
 * callers can add it unconditionally.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Anything below the visual viewport is covered — the keyboard, and on
      // iOS the offset that appears when the page scrolls under it.
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      // Ignore small deltas so a URL bar hiding doesn't shift the dock.
      setInset(hidden > 80 ? Math.round(hidden) : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

/**
 * Floating exam tools — a basic calculator and a scratchpad — shown when the
 * teacher enables them for the exam. Both are self-contained: the calculator
 * never uses eval (safe shunting-yard evaluator) and the scratchpad persists
 * to localStorage per attempt so a refresh doesn't lose working notes.
 */
export function ExamTools({
  attemptId,
  calculator,
  scratchpad,
  children,
}: {
  attemptId: string;
  calculator: boolean;
  scratchpad: boolean;
  /** Extra tools sharing this dock — the chat button and its panel. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState<"calc" | "pad" | null>(null);
  // On phones and tablets the on-screen keyboard covers the bottom of the
  // screen, which would hide the chat composer and the scratchpad. The visual
  // viewport shrinks when it opens, so lift the whole dock by that much.
  const keyboardInset = useKeyboardInset();

  if (!calculator && !scratchpad && !children) return null;

  return (
    <div
      className="fixed left-4 z-30 flex flex-col items-start gap-2 transition-[bottom] duration-150"
      style={{ bottom: `calc(6rem + ${keyboardInset}px)` }}
    >
      {open === "calc" && <CalculatorPanel onClose={() => setOpen(null)} />}
      {open === "pad" && (
        <ScratchpadPanel attemptId={attemptId} onClose={() => setOpen(null)} />
      )}
      <div className="flex items-end gap-2">
        {children}
        {calculator && (
          <button
            onClick={() => setOpen(open === "calc" ? null : "calc")}
            className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              open === "calc"
                ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
                : "glass text-[var(--fg)]"
            }`}
            title="Calculator"
            aria-label="Calculator"
          >
            <CalcIcon className="h-5 w-5" />
          </button>
        )}
        {scratchpad && (
          <button
            onClick={() => setOpen(open === "pad" ? null : "pad")}
            className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              open === "pad"
                ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
                : "glass text-[var(--fg)]"
            }`}
            title="Scratchpad"
            aria-label="Scratchpad"
          >
            <StickyNote className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Calculator ----

const KEYS = [
  ["C", "(", ")", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "⌫", "="],
];

function CalculatorPanel({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string>("");

  function press(k: string) {
    if (k === "C") {
      setExpr("");
      setResult("");
      return;
    }
    if (k === "⌫") {
      setExpr((e) => e.slice(0, -1));
      return;
    }
    if (k === "=") {
      const val = safeEval(expr);
      setResult(val === null ? "Error" : formatNum(val));
      return;
    }
    const map: Record<string, string> = { "÷": "/", "×": "*", "−": "-" };
    setExpr((e) => e + (map[k] ?? k));
  }

  return (
    <div className="glass rounded-2xl p-3 w-64 shadow-xl select-text">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
          Calculator
        </span>
        <button
          onClick={onClose}
          className="text-[var(--fg-subtle)] hover:text-[var(--fg)]"
          aria-label="Close calculator"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="rounded-xl bg-white/70 dark:bg-black/30 border border-[var(--border)] px-3 py-2 mb-2 text-right">
        <div className="text-sm text-[var(--fg-muted)] min-h-5 break-all">
          {expr || "0"}
        </div>
        <div className="text-2xl font-semibold text-[var(--fg)] min-h-8 break-all">
          {result}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.flat().map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`h-11 rounded-xl text-base font-medium transition-colors ${
              k === "="
                ? "bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white"
                : /[0-9.]/.test(k)
                ? "bg-white/70 dark:bg-white/5 text-[var(--fg)] hover:bg-white"
                : k === "C"
                ? "bg-[#fee2e2] dark:bg-[#7f1d1d] text-[#dc2626] dark:text-[#fca5a5]"
                : "bg-[var(--bg-muted)] text-[var(--fg)] hover:bg-[var(--border)]"
            }`}
          >
            {k === "⌫" ? <Delete className="h-4 w-4 mx-auto" /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Safe arithmetic evaluator (shunting-yard → RPN). No eval, no globals. */
function safeEval(input: string): number | null {
  const tokens = input.match(/(\d+\.?\d*|\.\d+|[+\-*/()])/g);
  if (!tokens) return null;
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const output: (number | string)[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (/^[\d.]+$/.test(t)) {
      output.push(parseFloat(t));
    } else if (t in prec) {
      while (
        ops.length &&
        ops[ops.length - 1] in prec &&
        prec[ops[ops.length - 1]] >= prec[t]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    } else if (t === "(") {
      ops.push(t);
    } else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop()!);
      if (!ops.length) return null; // mismatched
      ops.pop();
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null;
    output.push(op);
  }
  const stack: number[] = [];
  for (const t of output) {
    if (typeof t === "number") {
      stack.push(t);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      if (t === "+") stack.push(a + b);
      else if (t === "-") stack.push(a - b);
      else if (t === "*") stack.push(a * b);
      else if (t === "/") {
        if (b === 0) return null;
        stack.push(a / b);
      }
    }
  }
  if (stack.length !== 1 || !isFinite(stack[0])) return null;
  return stack[0];
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1e8) / 1e8);
}

// ---- Scratchpad ----

function ScratchpadPanel({
  attemptId,
  onClose,
}: {
  attemptId: string;
  onClose: () => void;
}) {
  const storageKey = `eg_scratch_${attemptId}`;
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      setText(localStorage.getItem(storageKey) ?? "");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, text);
    } catch {
      /* ignore */
    }
  }, [storageKey, text]);

  return (
    <div className="glass rounded-2xl p-3 w-72 shadow-xl select-text">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
          Scratchpad
        </span>
        <button
          onClick={onClose}
          className="text-[var(--fg-subtle)] hover:text-[var(--fg)]"
          aria-label="Close scratchpad"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Work things out here — not graded, only you see this."
        spellCheck={false}
        className="w-full h-48 rounded-xl bg-white/70 dark:bg-black/30 border border-[var(--border)] p-3 text-sm text-[var(--fg)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      />
    </div>
  );
}
