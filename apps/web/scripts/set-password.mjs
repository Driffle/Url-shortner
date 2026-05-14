/**
 * Set or rotate a user's password for credentials sign-in (empty GOOGLE_* in production).
 *
 * Usage (from apps/web, with DATABASE_URL in the environment):
 *   node ./scripts/set-password.mjs you@driffle.com 'your-strong-password'
 *
 * Creates the user if missing; promotes to ADMIN when they are the only user in the database.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

if (!emailArg || !passwordArg) {
  console.error("Usage: node ./scripts/set-password.mjs <email@domain> <password>");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const domain = (process.env.ALLOWED_EMAIL_DOMAIN || "driffle.com").toLowerCase().trim();
if (!email.endsWith(`@${domain}`)) {
  console.error(`Email must be on @${domain}`);
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const hash = await bcrypt.hash(passwordArg, 12);
  const name = email.split("@")[0] || "User";

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash: hash },
    update: { passwordHash: hash },
  });

  const count = await prisma.user.count();
  if (count === 1) {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log("Promoted sole user to ADMIN.");
  }

  console.log("Password saved for", user.email);
} finally {
  await prisma.$disconnect();
}
