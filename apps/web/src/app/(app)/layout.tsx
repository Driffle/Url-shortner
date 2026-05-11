import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { CommandMenu } from "@/features/dashboard/components/command-menu";
import { UserMenu } from "@/features/dashboard/components/user-menu";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50/40 via-background to-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-blue-100/80 bg-white/90 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <CommandMenu />
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
