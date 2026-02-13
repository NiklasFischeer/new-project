import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopSearch } from "@/components/layout/top-search";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="container flex h-16 items-center gap-3">
            <TopSearch />
            <ThemeToggle />
          </div>
        </header>
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
