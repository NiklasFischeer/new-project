"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
  onClose: () => void;
  durationMs?: number;
};

export function Toast({ message, tone = "info", onClose, durationMs = 2800 }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onClose, durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs, onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg",
        tone === "success" && "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
        tone === "error" && "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
        tone === "info" && "border-border bg-background text-foreground",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
