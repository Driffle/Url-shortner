"use client";

import { signOut, useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, User } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { isPublicAppNoAuthEnabled } from "@/shared/lib/auth-bypass";

const localAuthOff = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

export function UserMenu() {
  const { data } = useSession();
  const publicOpen = isPublicAppNoAuthEnabled();
  const openAccess = publicOpen || localAuthOff;

  if (!data?.user) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden max-w-[140px] truncate sm:inline">{data.user.email}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          sideOffset={6}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground">Signed in</div>
          <div className="px-2 pb-2 text-sm font-medium">{data.user.email}</div>
          <div className="px-2 pb-2 text-xs text-muted-foreground">Role: {data.user.role}</div>
          {openAccess && (
            <div className="border-t px-2 py-2 text-xs text-amber-800 dark:text-amber-300">
              {publicOpen ? (
                <>
                  Open access (no login). Unset <code className="rounded bg-muted px-0.5">PUBLIC_APP_NO_AUTH</code> /{" "}
                  <code className="rounded bg-muted px-0.5">NEXT_PUBLIC_PUBLIC_APP_NO_AUTH</code> in your env to require
                  Google sign-in.
                </>
              ) : (
                <>
                  Local dev: auth disabled via <code className="rounded bg-muted px-0.5">DISABLE_AUTH</code> in{" "}
                  <code className="rounded bg-muted px-0.5">.env.local</code>.
                </>
              )}
            </div>
          )}
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent"
            onSelect={() => {
              if (openAccess) {
                window.location.href = "/";
                return;
              }
              void signOut({ callbackUrl: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
            {openAccess ? "Reload app" : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
