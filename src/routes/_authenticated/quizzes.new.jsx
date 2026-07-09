import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Header } from "@/components/header";
import { QuizEditor } from "@/components/quiz-editor";

export const Route = createFileRoute("/_authenticated/quizzes/new")({
  validateSearch: z.object({ ai: z.string().optional() }),
  component: NewQuiz,
});

function NewQuiz() {
  const { ai } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Create a quiz</h1>
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">← Back to dashboard</a>
        </div>
        <QuizEditor initialAI={ai === "1"} />
      </div>
    </div>
  );
}
