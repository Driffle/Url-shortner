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
    <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-[#191818] px-3 py-2 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
              active
                ? "bg-white text-[#191818]"
                : "border border-white/20 text-white/80 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
