import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Target, Clock, TrendingUp, Crown } from "lucide-react";
import confetti from "canvas-confetti";
import { WinnersPodium } from "@/components/winners-podium";

export const Route = createFileRoute("/_authenticated/results/$sessionId")({
  component: ResultsPage,
});

function ResultsPage() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("sessions").select("*, quizzes(title)").eq("id", sessionId).single();
      setSession(s);
      if (s) {
        const [{ data: q }, { data: p }, { data: r }] = await Promise.all([
          supabase.from("questions").select("*").eq("quiz_id", s.quiz_id).order("order_index"),
          supabase.from("participants").select("*").eq("session_id", sessionId),
          supabase.from("responses").select("*").eq("session_id", sessionId),
        ]);
        setQuestions(q ?? []); setParticipants(p ?? []); setResponses(r ?? []);
      }
    })();
  }, [sessionId]);

  const maxScore = useMemo(() => questions.reduce((a, q) => a + (q.points ?? 0), 0), [questions]);
  const toPct = (s: number) => (maxScore > 0 ? Math.round((s / maxScore) * 100) : s);

  const stats = useMemo(() => {
    if (participants.length === 0) return null;
    const scores = participants.map((p) => p.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    return { avg, max, min };
  }, [participants]);

  const perQuestion = useMemo(() => {
    return questions.map((q) => {
      const rs = responses.filter((r) => r.question_id === q.id);
      const correct = rs.filter((r) => r.is_correct).length;
      const avgTime = rs.length ? Math.round(rs.reduce((a, r) => a + r.response_time_ms, 0) / rs.length) : 0;
      const accuracy = rs.length ? Math.round((correct / rs.length) * 100) : 0;
      return { q, count: rs.length, correct, accuracy, avgTime };
    });
  }, [questions, responses]);

  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const mostMissed = [...perQuestion].filter((p) => p.count > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const winner = sorted[0];
  const podium = sorted.slice(0, 3);

  // Fire confetti when the leaderboard loads
  useEffect(() => {
    if (participants.length === 0) return;
    const duration = 3500;
    const end = Date.now() + duration;
    const colors = ["#7c3aed", "#f59e0b", "#ec4899", "#10b981", "#3b82f6"];
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    // Big burst at the winner
    setTimeout(() => {
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.35 }, colors, scalar: 1.1 });
    }, 300);
  }, [participants.length]);

  if (!session) return <div className="min-h-screen grid place-items-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-6">
        <div className="flex justify-between items-end flex-wrap gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Results</p>
            <h1 className="text-3xl font-bold tracking-tight">{session.quizzes?.title}</h1>
          </div>
          <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>

        <WinnersPodium participants={sorted} maxScore={maxScore} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Users} label="Players" value={participants.length} />
          <Stat icon={Target} label="Average" value={toPct(stats?.avg ?? 0)} suffix="/100" />
          <Stat icon={Trophy} label="Top score" value={toPct(stats?.max ?? 0)} suffix="/100" accent />
          <Stat icon={TrendingUp} label="Lowest" value={toPct(stats?.min ?? 0)} suffix="/100" />
        </div>

        <Card className="p-6">
          <h2 className="font-bold text-lg flex items-center gap-2"><Trophy className="size-5 text-warning" /> Final leaderboard</h2>
          <ul className="mt-4 space-y-1">
            {sorted.map((p, i) => (
              <li
                key={p.id}
                className={`flex justify-between items-center rounded-lg px-3 py-2 animate-fade-in ${i < 3 ? "bg-gradient-primary text-primary-foreground font-semibold" : "bg-muted"}`}
                style={{ animationDelay: `${Math.min(i, 15) * 60}ms` }}
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold w-8 inline-block">#{i + 1}</span>
                  {i === 0 && <Crown className="size-4 text-warning" />}
                  {p.nickname}
                </span>
                <span>{maxScore > 0 ? `${toPct(p.score)}/100` : `${p.score} pts`}</span>
              </li>
            ))}
            {sorted.length === 0 && <p className="text-sm text-muted-foreground">No participants.</p>}
          </ul>
        </Card>


        {mostMissed.length > 0 && (
          <Card className="p-6">
            <h2 className="font-bold text-lg">Most missed questions</h2>
            <ul className="mt-3 space-y-2">
              {mostMissed.map((m) => (
                <li key={m.q.id} className="flex justify-between text-sm border-b pb-2">
                  <span className="line-clamp-1">{m.q.question_text}</span>
                  <span className="text-muted-foreground shrink-0 ml-3">{m.accuracy}% correct</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-bold text-lg">Per-question breakdown</h2>
          <div className="mt-3 space-y-3">
            {perQuestion.map((p, i) => (
              <div key={p.q.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Q{i + 1}</p>
                    <p className="font-medium">{p.q.question_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">Correct: <span className="text-success font-semibold">{p.q.correct_answer}</span></p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <div className="font-bold text-lg text-primary">{p.accuracy}%</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> {(p.avgTime / 1000).toFixed(1)}s avg</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent, suffix }: { icon: any; label: string; value: number; accent?: boolean; suffix?: string }) {
  return (
    <Card className={`p-5 ${accent ? "bg-gradient-primary text-primary-foreground border-0" : ""}`}>
      <Icon className="size-5 opacity-80" />
      <p className="text-xs opacity-80 mt-2">{label}</p>
      <p className="text-3xl font-bold font-display">{value}{suffix && <span className="text-base font-medium opacity-70">{suffix}</span>}</p>
    </Card>
  );
}
