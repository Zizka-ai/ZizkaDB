"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_RESET_MS = 2000;

export function useCopyToClipboard(resetMs = DEFAULT_RESET_MS) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        // clipboard write failed (no focus, HTTP, permission denied) — do not show "Copied"
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
