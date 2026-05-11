import type { UserRole } from "@prisma/client";

export const Permissions = {
  manageUsers: "manageUsers",
  deleteLinks: "deleteLinks",
  allAnalytics: "allAnalytics",
  systemSettings: "systemSettings",
  editLinks: "editLinks",
  manageCampaigns: "manageCampaigns",
  utmBuilder: "utmBuilder",
  readAnalytics: "readAnalytics",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

const matrix: Record<UserRole, Permission[]> = {
  ADMIN: [
    Permissions.manageUsers,
    Permissions.deleteLinks,
    Permissions.allAnalytics,
    Permissions.systemSettings,
    Permissions.editLinks,
    Permissions.manageCampaigns,
    Permissions.utmBuilder,
    Permissions.readAnalytics,
  ],
  EDITOR: [
    Permissions.editLinks,
    Permissions.manageCampaigns,
    Permissions.utmBuilder,
    Permissions.readAnalytics,
  ],
  VIEWER: [Permissions.readAnalytics],
};

export function can(role: UserRole, permission: Permission): boolean {
  return matrix[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error("Forbidden");
  }
}
