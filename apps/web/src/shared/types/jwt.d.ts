import type { UserRole } from "@prisma/client";

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
  }
}
