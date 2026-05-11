import { getAppSession } from "@/server/auth-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { can, Permissions } from "@/shared/lib/rbac";

export default async function SettingsPage() {
  const session = await getAppSession();
  const isAdmin = session?.user?.role && can(session.user.role, Permissions.manageUsers);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Account and internal platform notes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your access</CardTitle>
          <CardDescription>RBAC is enforced on server actions and APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {session?.user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {session?.user?.role}
          </p>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>User provisioning UI can be added here (invite, role changes).</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            MVP: promote additional admins with <code className="rounded bg-muted px-1">BOOTSTRAP_ADMIN_EMAIL</code> on
            first login, or manage roles directly in the database.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
