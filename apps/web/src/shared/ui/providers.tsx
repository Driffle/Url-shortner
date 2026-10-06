"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { Session } from "next-auth";
import { TooltipProvider } from "@/shared/ui/tooltip";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <TooltipProvider delayDuration={100} skipDelayDuration={0}>
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
