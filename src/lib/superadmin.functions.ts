import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperadmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "superadmin",
  });
  if (error || !data) throw new Error("Forbidden: superadmin only");
}

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, disabled, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    // Quiz + session counts per user
    const { data: quizzes } = await supabaseAdmin.from("quizzes").select("creator_id");
    const { data: sessions } = await supabaseAdmin.from("sessions").select("host_id");

    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const quizCount = new Map<string, number>();
    (quizzes ?? []).forEach((q: any) => quizCount.set(q.creator_id, (quizCount.get(q.creator_id) ?? 0) + 1));
    const sessionCount = new Map<string, number>();
    (sessions ?? []).forEach((s: any) => sessionCount.set(s.host_id, (sessionCount.get(s.host_id) ?? 0) + 1));

    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: roleMap.get(p.id) ?? [],
      quizCount: quizCount.get(p.id) ?? 0,
      sessionCount: sessionCount.get(p.id) ?? 0,
    }));
  });

export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; disabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context);
    if (data.userId === context.userId) throw new Error("Cannot disable yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ disabled: data.disabled })
      .eq("id", data.userId);
    if (error) throw error;
    // Also revoke sessions server-side when disabling
    if (data.disabled) {
      await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    }
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "teacher" | "admin" | "superadmin"; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context);
    if (data.userId === context.userId && data.role === "superadmin" && !data.grant) {
      throw new Error("Cannot revoke your own superadmin");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const platformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: users }, { count: quizzes }, { count: sessions }, { count: participants }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("quizzes").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("participants").select("*", { count: "exact", head: true }),
      ]);
    return {
      users: users ?? 0,
      quizzes: quizzes ?? 0,
      sessions: sessions ?? 0,
      participants: participants ?? 0,
    };
  });
