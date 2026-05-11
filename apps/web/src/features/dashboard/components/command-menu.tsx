"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const routes = [
  { label: "Dashboard", value: "/dashboard" },
  { label: "Create link", value: "/links/new" },
  { label: "Links", value: "/links" },
  { label: "Campaigns", value: "/campaigns" },
  { label: "Analytics", value: "/analytics" },
  { label: "UTM Builder", value: "/utm" },
  { label: "Settings", value: "/settings" },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const onSelect = useCallback(
    (value: string) => {
      setOpen(false);
      router.push(value);
    },
    [router],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-blue-100 bg-white px-3 text-left text-sm text-slate-500 shadow-sm ring-blue-50 transition hover:border-blue-200 hover:ring-2",
        )}
      >
        <Search className="h-4 w-4" />
        Search…
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/35 p-4 pt-[15vh]" role="dialog">
      <Command
        className="w-full max-w-lg overflow-hidden rounded-lg border border-blue-100 bg-white text-slate-900 shadow-xl shadow-blue-900/10"
        shouldFilter
        loop
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Command.Input
            placeholder="Go to…"
            className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>
          <Command.Group heading="Navigation">
            {routes.map((r) => (
              <Command.Item
                key={r.value}
                value={`${r.label} ${r.value}`}
                onSelect={() => onSelect(r.value)}
                className="flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-900"
              >
                {r.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        <button type="button" className="sr-only" onClick={() => setOpen(false)}>
          Close
        </button>
      </Command>
      <button type="button" className="fixed inset-0 -z-10 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
    </div>
  );
}
