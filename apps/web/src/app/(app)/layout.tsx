import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { CommandMenu } from "@/features/dashboard/components/command-menu";
import { MobileNav } from "@/features/dashboard/components/mobile-nav";
import { ThemeToggle } from "@/features/dashboard/components/theme-toggle";
import { UserMenu } from "@/features/dashboard/components/user-menu";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-gradient-to-b from-blue-50/40 via-background to-background">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-blue-100/80 bg-white/90 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <CommandMenu />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <MobileNav />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
