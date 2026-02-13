"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export function TopSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = useMemo(() => params.get("q") ?? "", [params]);
  const [value, setValue] = useState(initial);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qs = new URLSearchParams(params.toString());

    if (value.trim()) {
      qs.set("q", value.trim());
    } else {
      qs.delete("q");
    }

    const target = "/leads";
    const query = qs.toString();
    router.push(query ? `${target}?${query}` : target);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search company, industry, or contact..."
        className="pl-9"
      />
    </form>
  );
}
