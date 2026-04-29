"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

export type ViolationType =
  | "tab_blur"
  | "visibility_hidden"
  | "fullscreen_exit"
  | "copy"
  | "paste"
  | "cut"
  | "context_menu"
  | "keyboard_shortcut"
  | "network_lost"
  | "screen_resize";

export type EnforcementSettings = {
  requireFullscreen: boolean;
  blockCopyPaste: boolean;
  blockRightClick: boolean;
  blockKeyboardShortcuts: boolean;
  blockTabSwitch: boolean;
};

const HIGH_SEVERITY = new Set<ViolationType>([
  "fullscreen_exit",
  "visibility_hidden",
]);

const DEFAULT_SETTINGS: EnforcementSettings = {
  requireFullscreen: true,
  blockCopyPaste: true,
  blockRightClick: true,
  blockKeyboardShortcuts: true,
  blockTabSwitch: true,
};

type ReportResponse = {
  ok: true;
  paused?: boolean;
  pausedReason?: string | null;
  terminated?: boolean;
  violationId?: string;
};

export function useAntiCheat({
  attemptId,
  containerRef,
  enabled,
  settings = DEFAULT_SETTINGS,
  onPause,
  onTerminate,
}: {
  attemptId: string;
  containerRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  settings?: EnforcementSettings;
  onPause?: (reason: string) => void;
  onTerminate?: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState<
    { type: ViolationType; at: number }[]
  >([]);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const lastReportedAt = useRef<Record<string, number>>({});
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const captureEvidence = useCallback(async (): Promise<string | undefined> => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#ffffff",
        scale: 0.5,
        logging: false,
        useCORS: true,
      });
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch {
      return undefined;
    }
  }, [containerRef]);

  const report = useCallback(
    async (
      type: ViolationType,
      meta?: Record<string, unknown>,
      withEvidence = true
    ) => {
      const last = lastReportedAt.current[type] ?? 0;
      const now = Date.now();
      if (now - last < 1500) return;
      lastReportedAt.current[type] = now;

      setViolations((v) => [...v, { type, at: now }]);

      const evidence = withEvidence ? await captureEvidence() : undefined;
      const severity = HIGH_SEVERITY.has(type) ? "high" : "medium";

      try {
        const res = await fetch(`/api/attempts/${attemptId}/violation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, severity, meta, evidence }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as ReportResponse;
        if (data.terminated) onTerminate?.();
        else if (data.paused) onPause?.(data.pausedReason ?? type);
      } catch {
        // swallow — violation will be retried by browser-level retries if any
      }
    },
    [attemptId, captureEvidence, onPause, onTerminate]
  );

  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      // @ts-expect-error Safari
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handlers: Array<[EventTarget, string, EventListener]> = [];
    const add = (target: EventTarget, evt: string, fn: EventListener) => {
      target.addEventListener(evt, fn);
      handlers.push([target, evt, fn]);
    };

    const onFs = () => {
      const fs = Boolean(
        document.fullscreenElement ||
          // @ts-expect-error safari
          document.webkitFullscreenElement
      );
      setIsFullscreen(fs);
      if (!fs && settingsRef.current.requireFullscreen) {
        void report("fullscreen_exit");
      }
    };
    const onVisibility = () => {
      if (
        document.visibilityState === "hidden" &&
        settingsRef.current.blockTabSwitch
      ) {
        void report("visibility_hidden");
      }
    };
    const onBlur = () => {
      if (settingsRef.current.blockTabSwitch) {
        void report("tab_blur", {}, true);
      }
    };
    const onContext = (e: Event) => {
      if (!settingsRef.current.blockRightClick) return;
      e.preventDefault();
      void report("context_menu", {}, false);
    };
    const onCopy = (e: Event) => {
      if (!settingsRef.current.blockCopyPaste) return;
      e.preventDefault();
      void report("copy", {}, false);
    };
    const onPaste = (e: Event) => {
      if (!settingsRef.current.blockCopyPaste) return;
      e.preventDefault();
      void report("paste", {}, false);
    };
    const onCut = (e: Event) => {
      if (!settingsRef.current.blockCopyPaste) return;
      e.preventDefault();
      void report("cut", {}, false);
    };
    const onKey = (event: Event) => {
      const e = event as KeyboardEvent;
      if (!settingsRef.current.blockKeyboardShortcuts) return;
      const k = e.key.toLowerCase();
      if (
        (e.metaKey || e.ctrlKey) &&
        ["c", "v", "x", "a", "p", "s", "u"].includes(k)
      ) {
        e.preventDefault();
        void report("keyboard_shortcut", { key: k }, false);
      }
      if (k === "f11") e.preventDefault();
      if (
        k === "f12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ["i", "j", "c"].includes(k))
      ) {
        e.preventDefault();
        void report("keyboard_shortcut", { key: "devtools" }, false);
      }
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => {
      setOnline(false);
      void report("network_lost", {}, false);
    };

    add(document, "fullscreenchange", onFs);
    add(document, "webkitfullscreenchange", onFs);
    add(document, "visibilitychange", onVisibility);
    add(window, "blur", onBlur);
    add(document, "contextmenu", onContext);
    add(document, "copy", onCopy);
    add(document, "paste", onPaste);
    add(document, "cut", onCut);
    add(document, "keydown", onKey);
    add(window, "online", onOnline);
    add(window, "offline", onOffline);

    return () => {
      for (const [target, evt, fn] of handlers) {
        target.removeEventListener(evt, fn);
      }
    };
  }, [enabled, report]);

  return {
    isFullscreen,
    enterFullscreen,
    violations,
    online,
    report,
  };
}
