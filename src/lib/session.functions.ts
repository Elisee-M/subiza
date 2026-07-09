import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generatePin } from "./csabaza";

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quizId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verify ownership / accessibility
    const { data: quiz } = await supabase.from("quizzes").select("id").eq("id", data.quizId).single();
    if (!quiz) throw new Error("Quiz not found");

    // Generate unique pin
    let pin = generatePin();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase.from("sessions").select("id").eq("pin_code", pin).maybeSingle();
      if (!existing) break;
      pin = generatePin();
    }

    const { data: s, error } = await supabase
      .from("sessions")
      .insert({ quiz_id: data.quizId, host_id: userId, pin_code: pin, status: "lobby" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return s;
  });

export const advanceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      sessionId: z.string(),
      action: z.enum(["start", "reveal", "next", "end"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: s } = await supabase.from("sessions").select("*, quizzes(*)").eq("id", data.sessionId).single();
    if (!s) throw new Error("Session not found");

    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", s.quiz_id);
    const total = count ?? 0;

    const nowIso = new Date().toISOString();
    let update;
    if (data.action === "start") {
      update = { status: "question" as const, current_question_index: 0, current_question_started_at: nowIso };
    } else if (data.action === "reveal") {
      update = { status: "reveal" as const };
    } else if (data.action === "next") {
      const nextIdx = s.current_question_index + 1;
      update = nextIdx >= total
        ? { status: "ended" as const, ended_at: nowIso }
        : { status: "question" as const, current_question_index: nextIdx, current_question_started_at: nowIso };
    } else {
      update = { status: "ended" as const, ended_at: nowIso };
    }

    const { error } = await supabase.from("sessions").update(update).eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
