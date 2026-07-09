import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { createSession } from "@/lib/session.functions";
import { deleteQuiz } from "@/lib/quiz.functions";
import { Plus, Play, Trash2, Sparkles, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const startSession = useServerFn(createSession);
  const delQuiz = useServerFn(deleteQuiz);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("quizzes")
      .select("*, questions(count)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    setQuizzes(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user?.id]);

  async function host(quizId: string) {
    try {
      const s = await startSession({ data: { quizId } });
      navigate({ to: "/host/$sessionId", params: { sessionId: s.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start");
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this quiz?")) return;
    await delQuiz({ data: { id } });
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Quizzes</h1>
            <p className="text-muted-foreground">Create, host, and analyze your quizzes.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/quizzes/new" search={{ ai: "1" }}><Sparkles className="size-4" /> AI Generate</Link></Button>
            <Button asChild className="bg-gradient-primary"><Link to="/quizzes/new"><Plus className="size-4" /> New quiz</Link></Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : quizzes.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-card border-2">
            <Sparkles className="size-12 mx-auto text-primary" />
            <h2 className="text-xl font-bold mt-4">No quizzes yet</h2>
            <p className="text-muted-foreground mt-1">Generate one with AI in seconds or build manually.</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button asChild variant="outline"><Link to="/quizzes/new" search={{ ai: "1" }}>AI Generate</Link></Button>
              <Button asChild className="bg-gradient-primary"><Link to="/quizzes/new">Create manually</Link></Button>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((q) => (
              <Card key={q.id} className="p-5 hover:shadow-elegant transition-all bg-gradient-card border-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-lg line-clamp-2">{q.title}</h3>
                  <Badge variant={q.visibility === "public" ? "default" : "secondary"}>{q.visibility}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{q.description ?? "No description"}</p>
                <p className="text-xs text-muted-foreground mt-2">{q.questions?.[0]?.count ?? 0} questions</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" className="bg-gradient-primary flex-1" onClick={() => host(q.id)}>
                    <Play className="size-4" /> Host game
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/quizzes/$id/edit" params={{ id: q.id }}>Edit</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(q.id)} aria-label="Delete quiz">
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
