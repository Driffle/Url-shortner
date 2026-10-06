"use client";

import { Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type Props = {
  text: string;
  className?: string;
  label?: string;
};

/** Hint shown in a custom tooltip (~100ms open delay via root provider). */
export function InfoTip({ text, className, label = "More information" }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
            className,
          )}
          aria-label={label}
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
