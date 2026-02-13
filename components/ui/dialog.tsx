"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "right" | "center";
};

export function Dialog({ open, onOpenChange, title, description, children, side = "center" }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <button aria-label="Close" className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div
        className={cn(
          "relative z-10 max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl animate-fade-in",
          side === "right" ? "ml-auto h-screen w-full max-w-2xl rounded-none rounded-l-2xl" : "w-full max-w-3xl",
        )}
      >
        <div className="mb-4 space-y-1">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
