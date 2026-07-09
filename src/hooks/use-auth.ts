import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "superadmin";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => setRoles((data ?? []).map((r) => r.role as AppRole)));

    // Auto sign-out disabled users
    supabase
      .from("profiles")
      .select("disabled")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.disabled) {
          supabase.auth.signOut().then(() => {
            if (typeof window !== "undefined") {
              window.location.href = "/auth?disabled=1";
            }
          });
        }
      });
  }, [user]);

  return {
    session,
    user,
    roles,
    loading,
    isAdmin: roles.includes("admin") || roles.includes("superadmin"),
    isSuperAdmin: roles.includes("superadmin"),
    signOut: () => supabase.auth.signOut(),
  };
}
