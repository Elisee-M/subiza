import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { advanceSession } from "@/lib/session.functions";
import { Play, SkipForward, Eye, StopCircle, Clock, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_COLORS } from "@/lib/csabaza";

export const Route = createFileRoute("/_authenticated/host/$sessionId")({
  component: HostPage,
});

function HostPage() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const advance = useServerFn(advanceSession);
  const navigate = useNavigate();

  async function load() {
    const { data: s } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
    setSession(s);
    if (s) {
      const { data: q } = await supabase.from("questions").select("*").eq("quiz_id", s.quiz_id).order("order_index");
      setQuestions(q ?? []);
    }
  }
  useEffect(() => { load(); }, [sessionId]);

  useEffect(() => {
    const ch = supabase
      .channel(`host-${sessionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (p) => setSession(p.new))
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
        async () => {
          const { data } = await supabase.from("participants").select("*").eq("session_id", sessionId);
          setParticipants(data ?? []);
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` },
        async () => {
          const { data } = await supabase.from("responses").select("*").eq("session_id", sessionId);
          setResponses(data ?? []);
        })
      .subscribe();
    // initial loads
    supabase.from("participants").select("*").eq("session_id", sessionId).then(({ data }) => setParticipants(data ?? []));
    supabase.from("responses").select("*").eq("session_id", sessionId).then(({ data }) => setResponses(data ?? []));
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const joinUrl = typeof window !== "undefined" && session ? `${window.location.origin}/join/${session.pin_code}` : "";
  const currentQ = session && session.current_question_index >= 0 ? questions[session.current_question_index] : null;
  const startedAt = session?.current_question_started_at ? new Date(session.current_question_started_at).getTime() : 0;
  const remaining = currentQ ? Math.max(0, currentQ.timer_seconds - (now - startedAt) / 1000) : 0;
  const qResponses = currentQ ? responses.filter((r) => r.question_id === currentQ.id) : [];
  const sortedLeaders = [...participants].sort((a, b) => b.score - a.score);

  async function act(action: "start" | "reveal" | "next" | "end") {
    try {
      await advance({ data: { sessionId, action } });
      if (action === "end") navigate({ to: "/results/$sessionId", params: { sessionId } });
    } catch (e: any) { toast.error(e?.message ?? "Action failed"); }
  }

  // Auto-advance: only when session.auto_advance is enabled
  const autoActionRef = useRef<string | null>(null);
  const revealAtRef = useRef<number | null>(null);
  const REVEAL_MS = 4000;
  useEffect(() => {
    if (!session || !currentQ) return;
    if (!session.auto_advance) return;
    const key = `${session.status}:${session.current_question_index}`;
    if (session.status === "question" && remaining <= 0 && autoActionRef.current !== key) {
      autoActionRef.current = key;
      act("reveal");
    } else if (session.status === "reveal") {
      if (revealAtRef.current === null) revealAtRef.current = Date.now();
      if (Date.now() - revealAtRef.current >= REVEAL_MS && autoActionRef.current !== key) {
        autoActionRef.current = key;
        revealAtRef.current = null;
        act("next");
      }
    } else if (session.status === "question") {
      revealAtRef.current = null;
    }
  }, [session?.status, session?.current_question_index, session?.auto_advance, remaining, currentQ?.id]);

  async function toggleAutoAdvance(next: boolean) {
    const { error } = await supabase.from("sessions").update({ auto_advance: next }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else setSession((s: any) => ({ ...s, auto_advance: next }));
  }

  if (!session) return <div className="min-h-screen grid place-items-center bg-hero"><p>Loading...</p></div>;




  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {session.status === "lobby" && (
          <Card className="p-10 bg-gradient-primary text-primary-foreground border-0 text-center shadow-elegant">
            <p className="uppercase text-xs tracking-widest opacity-80">Game PIN</p>
            <p className="text-7xl font-display font-black tracking-[0.3em] mt-2">{session.pin_code}</p>
            <p className="mt-4 opacity-90">Join at <span className="font-mono">{joinUrl}</span></p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Link copied"); }}>
                <Copy className="size-4" /> Copy join link
              </Button>
              <Button variant="secondary" disabled={participants.length === 0} onClick={() => act("start")}>
                <Play className="size-4" /> Start game ({participants.length} joined)
              </Button>
            </div>
            <div className="mt-6 inline-flex items-center gap-3 bg-black/15 rounded-full px-4 py-2 text-sm">
              <span className="opacity-90">Auto-advance questions</span>
              <button
                type="button"
                onClick={() => toggleAutoAdvance(!session.auto_advance)}
                className={`relative w-11 h-6 rounded-full transition ${session.auto_advance ? "bg-success" : "bg-white/30"}`}
                aria-pressed={session.auto_advance}
                aria-label="Toggle auto-advance"
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white transition ${session.auto_advance ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <span className="opacity-90 font-semibold">{session.auto_advance ? "On" : "Manual"}</span>
            </div>
            <p className="mt-2 text-xs opacity-80">
              {session.auto_advance
                ? "Questions advance automatically when the timer ends."
                : "You control when to reveal answers and move to the next question."}
            </p>
          </Card>
        )}

        {(session.status === "question" || session.status === "reveal") && currentQ && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Question {session.current_question_index + 1} / {questions.length}</div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold"><Clock className="size-4" /> {Math.ceil(remaining)}s</span>
                <span className="flex items-center gap-1 text-sm"><Users className="size-4" /> {qResponses.length} / {participants.length} answered</span>
              </div>
            </div>
            <Card className="p-8 bg-gradient-card border-2">
              <h2 className="text-3xl font-bold text-balance">{currentQ.question_text}</h2>
              {currentQ.image_url && <img src={currentQ.image_url} alt="" className="mt-4 rounded-lg max-h-64 mx-auto" />}
            </Card>
            <div className="grid sm:grid-cols-2 gap-3">
              {(currentQ.options as string[]).map((opt, i) => {
                const isCorrect = session.status === "reveal" && currentQ.correct_answer === opt;
                const count = qResponses.filter((r) => r.selected_answer === opt).length;
                return (
                  <div key={i} className={`${QUESTION_COLORS[i % 4]} text-white p-5 rounded-2xl font-semibold relative ${isCorrect ? "ring-4 ring-success" : ""}`}>
                    <div className="text-xs opacity-80">Option {i + 1}{isCorrect ? " ✓" : ""}</div>
                    <div className="text-lg mt-1">{opt}</div>
                    <div className="absolute top-3 right-3 text-sm bg-black/20 px-2 py-0.5 rounded-full">{count}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {session.status === "question" && (
                <Button onClick={() => act("reveal")} variant="outline">
                  <Eye className="size-4" /> Reveal answer
                </Button>
              )}
              <Button onClick={() => act("next")} className="bg-gradient-primary">
                <SkipForward className="size-4" />
                {session.current_question_index + 1 >= questions.length ? "Finish game" : "Next question"}
              </Button>
              <Button variant="destructive" onClick={() => act("end")}>
                <StopCircle className="size-4" /> End game
              </Button>
            </div>
          </>
        )}

        {session.status === "ended" && (
          <Card className="p-10 text-center">
            <h2 className="text-3xl font-bold">Game ended</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild className="bg-gradient-primary">
                <Link to="/results/$sessionId" params={{ sessionId }}>
                  <Eye className="size-4" /> View results
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Live leaderboard */}
        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Users className="size-4" /> Players ({participants.length})</h3>
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Waiting for students to join with PIN {session.pin_code}...</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sortedLeaders.map((p, i) => (
                <div key={p.id} className="flex justify-between items-center bg-muted rounded-lg px-3 py-2 text-sm">
                  <span><span className="font-bold mr-2">#{i + 1}</span>{p.nickname}</span>
                  <span className="font-semibold">{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
