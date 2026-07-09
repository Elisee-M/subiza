import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ShieldAlert, Trash2, UserCog, Users, BookOpen, Play, Trophy } from "lucide-react";
import {
  listAllUsers,
  setUserDisabled,
  setUserRole,
  deleteUser,
  platformStats,
} from "@/lib/superadmin.functions";

export const Route = createFileRoute("/_authenticated/superadmin")({
  head: () => ({ meta: [{ title: "Superadmin — CSAbaza" }] }),
  component: SuperadminPage,
});

type Row = Awaited<ReturnType<typeof listAllUsers>>[number];

function SuperadminPage() {
  const { user, roles, loading } = useAuth();
  const isSuper = roles.includes("superadmin" as any);
  const list = useServerFn(listAllUsers);
  const setDisabled = useServerFn(setUserDisabled);
  const setRole = useServerFn(setUserRole);
  const del = useServerFn(deleteUser);
  const stats = useServerFn(platformStats);

  const [rows, setRows] = useState<Row[]>([]);
  const [platform, setPlatform] = useState<{ users: number; quizzes: number; sessions: number; participants: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [u, s] = await Promise.all([list(), stats()]);
      setRows(u);
      setPlatform(s);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    }
  }

  useEffect(() => {
    if (!loading && isSuper) refresh();
  }, [loading, isSuper]);

  if (loading) return <div className="min-h-screen bg-hero"><Header /></div>;
  if (!isSuper) {
    return (
      <div className="min-h-screen bg-hero">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <ShieldAlert className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-3xl font-bold">Superadmin only</h1>
          <p className="text-muted-foreground mt-2">You need superadmin privileges to view this page.</p>
          <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  async function toggleDisabled(r: Row) {
    if (r.id === user?.id) return toast.error("You can't disable yourself.");
    setBusy(true);
    try {
      await setDisabled({ data: { userId: r.id, disabled: !r.disabled } });
      toast.success(!r.disabled ? "User disabled" : "User enabled");
      await refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function toggleRole(r: Row, role: "teacher" | "admin" | "superadmin") {
    const has = r.roles.includes(role);
    setBusy(true);
    try {
      await setRole({ data: { userId: r.id, role, grant: !has } });
      toast.success(`${has ? "Removed" : "Granted"} ${role}`);
      await refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function removeUser(r: Row) {
    if (!confirm(`Permanently delete ${r.email}? This deletes their quizzes too.`)) return;
    setBusy(true);
    try {
      await del({ data: { userId: r.id } });
      toast.success("User deleted");
      await refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-primary" /> Superadmin Console
            </h1>
            <p className="text-muted-foreground mt-1">Full control over users, roles and platform data.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/admin"><UserCog className="size-4" /> Admin analytics</Link></Button>
            <Button variant="outline" asChild><Link to="/dashboard"><ArrowLeft className="size-4" /> Dashboard</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="size-5" />} label="Users" value={platform?.users ?? 0} />
          <StatCard icon={<BookOpen className="size-5" />} label="Quizzes" value={platform?.quizzes ?? 0} />
          <StatCard icon={<Play className="size-5" />} label="Games hosted" value={platform?.sessions ?? 0} />
          <StatCard icon={<Trophy className="size-5" />} label="Total plays" value={platform?.participants ?? 0} />
        </div>

        <Card className="glass p-0 overflow-hidden border-2">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">All users ({rows.length})</h2>
            <Button size="sm" variant="ghost" onClick={refresh}>Refresh</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-3">User</th>
                  <th className="p-3">Roles</th>
                  <th className="p-3">Activity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.name}{r.id === user?.id && <span className="text-xs text-muted-foreground ml-2">(you)</span>}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(["superadmin", "admin", "teacher"] as const).map((role) => {
                          const has = r.roles.includes(role);
                          return (
                            <button
                              key={role}
                              onClick={() => toggleRole(r, role)}
                              disabled={busy}
                              className="focus:outline-none"
                              title={has ? `Remove ${role}` : `Grant ${role}`}
                            >
                              <Badge variant={has ? "default" : "outline"} className="cursor-pointer">
                                {role}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {r.quizCount} quizzes · {r.sessionCount} games
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!r.disabled}
                          disabled={busy || r.id === user?.id}
                          onCheckedChange={() => toggleDisabled(r)}
                        />
                        <span className={r.disabled ? "text-destructive" : "text-emerald-600"}>
                          {r.disabled ? "Disabled" : "Active"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy || r.id === user?.id}
                        onClick={() => removeUser(r)}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground">
          Tip: click a role badge to grant or revoke it. Disabling a user signs them out and blocks new quiz creation.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="glass p-4 border-2">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </Card>
  );
}
