import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const QuestionInput = z.object({
  id: z.string().optional(),
  type: z.enum(["multiple_choice", "true_false", "fill_blank", "poll", "matching"]),
  question_text: z.string().min(1),
  image_url: z.string().optional().nullable(),
  options: z.array(z.string()).default([]),
  correct_answer: z.string().optional().nullable(),
  explanation: z.string().optional().nullable(),
  timer_seconds: z.number().int().min(5).max(120).default(20),
  points: z.number().int().min(0).default(100),
  difficulty: z.string().optional().nullable(),
});

const SaveQuizInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  visibility: z.enum(["public", "private"]).default("private"),
  questions: z.array(QuestionInput).min(1),
});

export const saveQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveQuizInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let quizId = data.id;

    if (quizId) {
      const { error } = await supabase
        .from("quizzes")
        .update({
          title: data.title,
          description: data.description,
          visibility: data.visibility,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quizId);
      if (error) throw new Error(error.message);
      await supabase.from("questions").delete().eq("quiz_id", quizId);
    } else {
      const { data: q, error } = await supabase
        .from("quizzes")
        .insert({
          title: data.title,
          description: data.description,
          visibility: data.visibility,
          creator_id: userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      quizId = q.id;
    }

    const rows = data.questions.map((q, i) => ({
      quiz_id: quizId!,
      type: q.type,
      question_text: q.question_text,
      image_url: q.image_url ?? null,
      options: q.options,
      correct_answer: q.correct_answer ?? null,
      explanation: q.explanation ?? null,
      timer_seconds: q.timer_seconds,
      points: q.points,
      difficulty: q.difficulty ?? "medium",
      order_index: i,
    }));
    const { error: qErr } = await supabase.from("questions").insert(rows);
    if (qErr) throw new Error(qErr.message);

    return { id: quizId };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quizzes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
