"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CircleDollarSign, KanbanSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Building2 },
  { href: "/funding", label: "Funding", icon: CircleDollarSign },
  { href: "/funding-outreach", label: "Funding Outreach", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-r border-border/80 bg-card/70 p-4 backdrop-blur-md md:w-64">
      <div className="mb-8 rounded-xl border border-border/70 bg-gradient-to-br from-primary/15 to-transparent p-4">
        <p className="font-display text-lg font-semibold">Datapool</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-6 text-xs text-muted-foreground">Built for Mittelstand B2B outreach</p>
    </aside>
  );
}
