"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type AuthMode = "google" | "credentials";

export function LoginForm({
  callbackUrl,
  showDomainError,
  authMode,
}: {
  callbackUrl: string;
  showDomainError: boolean;
  authMode: AuthMode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setErr("Invalid email or password, or this account is not provisioned yet.");
      return;
    }
    if (res?.url) window.location.href = res.url;
  }

  return (
    <Card className="w-full max-w-md border-blue-100 shadow-xl shadow-blue-900/20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Driffle Links</CardTitle>
        <CardDescription>
          {authMode === "google"
            ? "Internal tool — sign in with your @driffle.com Google account."
            : "Internal tool — sign in with your @driffle.com email and password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDomainError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Access denied. Only Driffle accounts on the allowed domain are permitted.
          </p>
        )}
        {authMode === "google" ? (
          <>
            <Button type="button" className="w-full" onClick={() => signIn("google", { callbackUrl })}>
              Continue with Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to internal acceptable use policies.
            </p>
          </>
        ) : (
          <form className="space-y-4" onSubmit={onCredentials}>
            {err ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@driffle.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              First-time access: an admin runs <span className="font-mono">npm run user:set-password</span> in the app
              container to set your password.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
