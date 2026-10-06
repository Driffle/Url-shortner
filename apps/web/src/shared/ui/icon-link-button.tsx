import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Props = {
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
};

export function IconLinkButton({ href, icon: Icon, label, className }: Props) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
