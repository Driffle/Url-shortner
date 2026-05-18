/** Split comma/semicolon/newline-separated admin emails from env. */
function splitEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Emails that should receive `User.role = ADMIN` on sign-in / first account creation.
 * `ADMIN_EMAILS` — comma-separated list (e.g. `a@driffle.com,b@driffle.com`).
 * `BOOTSTRAP_ADMIN_EMAIL` — legacy single email (still supported).
 */
export function getEnvAdminEmails(): ReadonlySet<string> {
  const emails = new Set<string>();
  for (const e of splitEmailList(process.env.ADMIN_EMAILS)) emails.add(e);
  const legacy = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (legacy) emails.add(legacy);
  return emails;
}

export function isEnvAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getEnvAdminEmails().has(email.trim().toLowerCase());
}
