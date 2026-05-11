"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
    <aside className="hidden w-56 shrink-0 border-r border-blue-100 bg-white shadow-sm md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 px-4">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-white">
          Driffle Links
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative block rounded-md px-3 py-2 text-sm">
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-md bg-blue-50 ring-1 ring-blue-100"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span
                className={cn(
                  "relative flex items-center gap-2",
                  active ? "font-medium text-blue-800" : "text-slate-600 hover:text-blue-700",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-blue-600" : "text-slate-400")} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
