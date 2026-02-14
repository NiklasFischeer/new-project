import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "select-chevron h-10 w-full min-w-0 overflow-hidden whitespace-nowrap text-ellipsis rounded-md border border-input bg-background px-3 pr-10 text-sm leading-normal text-foreground transition-colors [-webkit-appearance:none] [-moz-appearance:none] [appearance:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
