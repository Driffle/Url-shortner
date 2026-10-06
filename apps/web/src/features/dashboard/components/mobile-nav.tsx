"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";

const items = [
  { href: "/dashboard", label: "Home" },
  { href: "/links", label: "Links" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/analytics", label: "Analytics" },
  { href: "/utm", label: "UTM" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-blue-100 bg-white px-3 py-2 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
              active
                ? "bg-blue-600 text-white"
                : "border border-blue-100 text-slate-600 hover:border-blue-200 hover:text-blue-700",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
