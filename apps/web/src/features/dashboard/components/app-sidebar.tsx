"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  Megaphone,
  BarChart3,
  Wand2,
  Settings,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/utm", label: "UTM Builder", icon: Wand2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#191818] md:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-white">
          Driffle Links
        </Link>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative mb-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-white/10 font-medium text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:bg-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-white" : "text-white/50")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
