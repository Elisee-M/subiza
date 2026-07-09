import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { QuizEditor, type QuestionDraft } from "@/components/quiz-editor";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/quizzes/$id/edit")({
  component: EditQuiz,
});

function EditQuiz() {
  const { id } = Route.useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", id).single();
      const { data: questions } = await supabase.from("questions").select("*").eq("quiz_id", id).order("order_index");
      if (quiz) {
        setData({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description ?? "",
          visibility: quiz.visibility,
          questions: (questions ?? []).map((q: any): QuestionDraft => ({
            id: q.id,
            type: q.type,
            question_text: q.question_text,
            options: (q.options as string[]) ?? [],
            correct_answer: q.correct_answer ?? "",
            explanation: q.explanation ?? "",
            timer_seconds: q.timer_seconds,
            points: q.points,
            image_url: q.image_url ?? "",
            difficulty: q.difficulty ?? "medium",
          })),
        });
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Edit quiz</h1>
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">← Back to dashboard</a>
        </div>
        {data ? <QuizEditor initial={data} /> : <p className="text-muted-foreground">Loading...</p>}
      </div>
    </div>
  );
}
