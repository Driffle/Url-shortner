import { Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Props = {
  text: string;
  className?: string;
  label?: string;
};

/** Accessible hint: visible on hover/focus via native `title`. */
export function InfoTip({ text, className, label = "More information" }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
      title={text}
      aria-label={label}
    >
      <Info className="h-4 w-4" />
    </button>
  );
}
