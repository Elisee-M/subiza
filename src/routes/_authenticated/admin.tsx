import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Users, BookOpen, Gamepad2, ArrowLeft, LayoutDashboard, Trophy, TrendingUp, TrendingDown, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, user, loading } = useAuth();
  const [stats, setStats] = useState({ users: 0, quizzes: 0, sessions: 0 });
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [u, q, s] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
      ]);
      setStats({ users: u.count ?? 0, quizzes: q.count ?? 0, sessions: s.count ?? 0 });
      const { data: rq } = await supabase.from("quizzes").select("*, profiles!quizzes_creator_id_fkey(name)").order("created_at", { ascending: false }).limit(10);
      setRecentQuizzes(rq ?? []);
      const { data: ru } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(10);
      setRecentUsers(ru ?? []);
      const { data: logs } = await supabase
        .from("sessions")
        .select("id, quiz_id, pin_code, status, created_at, ended_at, quizzes(title, profiles!quizzes_creator_id_fkey(name)), participants(id, nickname, score)")
        .order("created_at", { ascending: false })
        .limit(50);
      setSessionLogs(logs ?? []);
      const [{ data: parts }, { data: resps }, { data: qs }] = await Promise.all([
        supabase.from("participants").select("id, session_id, nickname, score"),
        supabase.from("responses").select("question_id, is_correct"),
        supabase.from("questions").select("id, quiz_id, points"),
      ]);
      setAllParticipants(parts ?? []);
      setAllResponses(resps ?? []);
      setAllQuestions(qs ?? []);
    })();
  }, [isAdmin]);

  // Per-quiz analytics: avg score % and accuracy across all sessions
  const quizAnalytics = useMemo(() => {
    const byQuiz = new Map<string, { title: string; plays: number; scoreSum: number; scoreCount: number; correct: number; total: number; topWinner: { name: string; score: number } | null }>();
    const quizMax = new Map<string, number>();
    for (const q of allQuestions) {
      quizMax.set(q.quiz_id, (quizMax.get(q.quiz_id) ?? 0) + (q.points ?? 0));
    }
    const sessionQuiz = new Map<string, string>();
    for (const s of sessionLogs) sessionQuiz.set(s.id, s.quiz_id);
    for (const s of sessionLogs) {
      const key = s.quiz_id;
      const existing = byQuiz.get(key) ?? { title: s.quizzes?.title ?? "—", plays: 0, scoreSum: 0, scoreCount: 0, correct: 0, total: 0, topWinner: null };
      existing.plays += 1;
      const sessionParts = (s.participants ?? []) as any[];
      for (const p of sessionParts) {
        const max = quizMax.get(key) ?? 0;
        if (max > 0) {
          existing.scoreSum += (p.score / max) * 100;
          existing.scoreCount += 1;
        }
        if (!existing.topWinner || p.score > existing.topWinner.score) {
          existing.topWinner = { name: p.nickname, score: p.score };
        }
      }
      byQuiz.set(key, existing);
    }
    // question-level accuracy per quiz
    const qToQuiz = new Map<string, string>();
    for (const q of allQuestions) qToQuiz.set(q.id, q.quiz_id);
    for (const r of allResponses) {
      const qz = qToQuiz.get(r.question_id);
      if (!qz) continue;
      const e = byQuiz.get(qz);
      if (!e) continue;
      e.total += 1;
      if (r.is_correct) e.correct += 1;
    }
    return [...byQuiz.entries()].map(([id, v]) => ({
      id,
      title: v.title,
      plays: v.plays,
      avgPct: v.scoreCount > 0 ? Math.round(v.scoreSum / v.scoreCount) : 0,
      accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      topWinner: v.topWinner,
    }));
  }, [sessionLogs, allQuestions, allResponses]);

  const bestQuizzes = [...quizAnalytics].filter((q) => q.plays > 0).sort((a, b) => b.avgPct - a.avgPct).slice(0, 5);
  const hardestQuizzes = [...quizAnalytics].filter((q) => q.plays > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const topPlayers = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allParticipants) map.set(p.nickname, (map.get(p.nickname) ?? 0) + p.score);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [allParticipants]);

  if (loading) return <div className="min-h-screen grid place-items-center"><p>Loading...</p></div>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Card className="max-w-md mx-auto p-8">
            <h2 className="font-bold text-xl">Admins only</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don't have the admin role yet. Ask an existing admin to grant you the role, or run this in the Cloud SQL editor:
            </p>
            <pre className="mt-3 text-xs bg-muted p-3 rounded text-left overflow-auto">{`INSERT INTO public.user_roles (user_id, role)\nVALUES ('${user?.id ?? "<your-user-id>"}', 'admin');`}</pre>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
            <h1 className="text-3xl font-bold tracking-tight">Platform overview</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard"><ArrowLeft className="size-4" /> Back to dashboard</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-primary">
              <Link to="/dashboard"><LayoutDashboard className="size-4" /> My quizzes</Link>
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={Users} label="Users" value={stats.users} />
          <StatCard icon={BookOpen} label="Quizzes" value={stats.quizzes} />
          <StatCard icon={Gamepad2} label="Total sessions" value={stats.sessions} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="font-bold">Recent quizzes</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {recentQuizzes.map((q) => (
                <li key={q.id} className="flex justify-between border-b pb-2">
                  <span>{q.title}</span>
                  <span className="text-muted-foreground">{q.profiles?.name ?? "—"}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Recent users</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex justify-between border-b pb-2">
                  <span>{u.name}</span>
                  <span className="text-muted-foreground">{u.email}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-5">
            <h2 className="font-bold flex items-center gap-2"><TrendingUp className="size-4 text-success" /> Quizzes players win most</h2>
            <p className="text-xs text-muted-foreground">Highest average score across all sessions</p>
            <ul className="mt-3 space-y-2 text-sm">
              {bestQuizzes.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
              {bestQuizzes.map((q) => (
                <li key={q.id} className="flex justify-between border-b pb-2">
                  <span className="line-clamp-1">{q.title}</span>
                  <span className="font-semibold text-success">{q.avgPct}/100</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold flex items-center gap-2"><TrendingDown className="size-4 text-destructive" /> Hardest quizzes</h2>
            <p className="text-xs text-muted-foreground">Lowest answer accuracy</p>
            <ul className="mt-3 space-y-2 text-sm">
              {hardestQuizzes.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
              {hardestQuizzes.map((q) => (
                <li key={q.id} className="flex justify-between border-b pb-2">
                  <span className="line-clamp-1">{q.title}</span>
                  <span className="font-semibold text-destructive">{q.accuracy}% correct</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold flex items-center gap-2"><Crown className="size-4 text-warning" /> Top players (all-time)</h2>
            <p className="text-xs text-muted-foreground">Cumulative points across all sessions</p>
            <ul className="mt-3 space-y-2 text-sm">
              {topPlayers.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
              {topPlayers.map(([name, score], i) => (
                <li key={name} className="flex justify-between border-b pb-2">
                  <span><span className="font-bold mr-2">#{i + 1}</span>{name}</span>
                  <span className="font-semibold">{score} pts</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-bold flex items-center gap-2"><Trophy className="size-4 text-warning" /> Game history (all sessions)</h2>
          <p className="text-xs text-muted-foreground">Latest 50 hosted sessions across the platform</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Quiz</th>
                  <th className="py-2 pr-3">Host</th>
                  <th className="py-2 pr-3">Winner</th>
                  <th className="py-2 pr-3">PIN</th>
                  <th className="py-2 pr-3">Players</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Ended</th>
                </tr>
              </thead>
              <tbody>
                {sessionLogs.map((s) => {
                  const parts = (s.participants ?? []) as any[];
                  const winner = parts.length ? [...parts].sort((a, b) => b.score - a.score)[0] : null;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <Link to="/results/$sessionId" params={{ sessionId: s.id }} className="hover:underline">
                          {s.quizzes?.title ?? "—"}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{s.quizzes?.profiles?.name ?? "—"}</td>
                      <td className="py-2 pr-3">{winner ? <span className="flex items-center gap-1"><Crown className="size-3 text-warning" />{winner.nickname} ({winner.score})</span> : "—"}</td>
                      <td className="py-2 pr-3 font-mono">{s.pin_code}</td>
                      <td className="py-2 pr-3">{parts.length}</td>
                      <td className="py-2 pr-3"><Badge variant={s.status === "ended" ? "secondary" : "default"}>{s.status}</Badge></td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}</td>
                    </tr>
                  );
                })}
                {sessionLogs.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-5 bg-gradient-card border-2">
      <Icon className="size-5 text-primary" />
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
      <p className="text-3xl font-bold font-display">{value}</p>
    </Card>
  );
}
