"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

export function LoginForm({ callbackUrl, showDomainError }: { callbackUrl: string; showDomainError: boolean }) {
  return (
    <Card className="w-full max-w-md border-blue-100 shadow-xl shadow-blue-900/20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Driffle Links</CardTitle>
        <CardDescription>Internal tool — sign in with your @driffle.com Google account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDomainError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Access denied. Only Driffle Google accounts are allowed.
          </p>
        )}
        <Button type="button" className="w-full" onClick={() => signIn("google", { callbackUrl })}>
          Continue with Google
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to internal acceptable use policies.
        </p>
      </CardContent>
    </Card>
  );
}
