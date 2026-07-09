import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitAnswer, getPlayBootstrap } from "@/lib/student.functions";
import { Check, X, Trophy, Clock } from "lucide-react";
import { QUESTION_COLORS } from "@/lib/csabaza";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { WinnersPodium, fireCelebration } from "@/components/winners-podium";

export const Route = createFileRoute("/play/$pin")({
  component: PlayPage,
});

type SessionRow = {
  id: string;
  quiz_id: string;
  status: "lobby" | "active" | "question" | "reveal" | "ended";
  current_question_index: number;
  current_question_started_at: string | null;
};

type QuestionRow = {
  id: string;
  question_text: string;
  type: string;
  options: string[];
  timer_seconds: number;
  image_url: string | null;
  points?: number;
};

type RevealInfo = { selected: string; correct: boolean; points: number; correctAnswer: string | null; explanation: string | null };

function PlayPage() {
  const { pin } = Route.useParams();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [participants, setParticipants] = useState<{ id: string; nickname: string; score: number }[]>([]);
  const [participant, setParticipant] = useState<{ sessionId: string; participantId: string; nickname: string } | null>(null);
  const [answered, setAnswered] = useState<Record<string, RevealInfo>>({});
  const [now, setNow] = useState(Date.now());

  const submit = useServerFn(submitAnswer);
  const bootstrap = useServerFn(getPlayBootstrap);

  // Load participant from localStorage immediately (keyed by pin)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`csabaza:pin:${pin}`);
      if (stored) setParticipant(JSON.parse(stored));
    } catch {}
  }, [pin]);

  // Load session
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await bootstrap({ data: { pin } });
        if (cancelled) return;
        setSession(res.session as any);
        const stored =
          localStorage.getItem(`csabaza:pin:${pin}`) ||
          localStorage.getItem(`csabaza:${res.session.id}`);
        if (stored) setParticipant(JSON.parse(stored));
        setQuestions((res.questions as any) ?? []);
        setParticipants((res.participants as any) ?? []);
      } catch (err: any) {
        toast.error(err?.message ?? "Could not load game");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [pin]);

  // Realtime subscriptions
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel(`play-${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as any))
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("participants").select("*").eq("session_id", session.id);
          setParticipants((data as any) ?? []);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.id]);

  // Timer tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const currentQ = session && session.current_question_index >= 0 ? questions[session.current_question_index] : null;
  const startedAt = session?.current_question_started_at ? new Date(session.current_question_started_at).getTime() : 0;
  const remaining = currentQ ? Math.max(0, currentQ.timer_seconds - (now - startedAt) / 1000) : 0;
  const me = participant && participants.find((p) => p.id === participant.participantId);
  const maxScore = useMemo(() => questions.reduce((a, q) => a + (q.points ?? 0), 0), [questions]);
  const myPct = me && maxScore > 0 ? Math.round((me.score / maxScore) * 100) : 0;
  const rank = useMemo(() => {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    return me ? sorted.findIndex((p) => p.id === me.id) + 1 : 0;
  }, [participants, me]);

  // Celebrate when the game ends
  useEffect(() => {
    if (session?.status === "ended" && participants.length > 0) {
      fireCelebration(confetti);
    }
  }, [session?.status, participants.length]);

  async function pickAnswer(opt: string) {
    if (!participant || !currentQ || answered[currentQ.id]) return;
    // Optimistic lock so the user can only click once
    setAnswered((a) => ({ ...a, [currentQ.id]: { selected: opt, correct: false, points: 0, correctAnswer: null, explanation: null } }));
    try {
      const res = await submit({ data: { participantId: participant.participantId, questionId: currentQ.id, selectedAnswer: opt } });
      setAnswered((a) => ({ ...a, [currentQ.id]: { selected: opt, correct: res.isCorrect, points: res.points, correctAnswer: res.correctAnswer ?? null, explanation: res.explanation ?? null } }));
    } catch (err: any) {
      // Revert lock so the user can retry
      setAnswered((a) => { const n = { ...a }; delete n[currentQ.id]; return n; });
      toast.error(err?.message ?? "Could not submit");
    }
  }

  if (!session) return <Loading text="Connecting to game..." />;
  if (!participant) {
    return (
      <div className="min-h-screen bg-hero">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <Card className="glass max-w-md mx-auto p-8">
            <p>You haven't joined yet.</p>
            <Button asChild className="mt-4"><Link to="/join/$pin" params={{ pin }}>Join now</Link></Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-2"><Trophy className="size-4 text-warning" /> {maxScore > 0 ? `${myPct}/100` : `${me?.score ?? 0} pts`} · #{rank || "—"}</div>
          <div className="text-muted-foreground">Playing as <span className="font-semibold text-foreground">{participant.nickname}</span></div>
        </div>

        {session.status === "lobby" && <Lobby participants={participants} />}

        {session.status === "question" && currentQ && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Question {session.current_question_index + 1} / {questions.length}</span>
              <span className="flex items-center gap-1 font-semibold"><Clock className="size-4" /> {Math.ceil(remaining)}s</span>
            </div>
            <Progress value={(remaining / currentQ.timer_seconds) * 100} />
            <Card className="p-8 bg-gradient-card border-2">
              <h2 className="text-2xl font-bold text-balance">{currentQ.question_text}</h2>
              {currentQ.image_url && <img src={currentQ.image_url} alt="" className="mt-4 rounded-lg max-h-64 mx-auto" />}
            </Card>

            {currentQ.type === "fill_blank" ? (
              <FillBlankInput
                locked={!!answered[currentQ.id] || remaining <= 0}
                onSubmit={(v) => pickAnswer(v)}
              />
            ) : currentQ.type === "matching" ? (
              <MatchingInput
                pairs={currentQ.options}
                locked={!!answered[currentQ.id] || remaining <= 0}
                onSubmit={(v) => pickAnswer(v)}
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt, i) => {
                  const picked = answered[currentQ.id]?.selected === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!!answered[currentQ.id] || remaining <= 0}
                      onClick={() => pickAnswer(opt)}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      className={`${QUESTION_COLORS[i % 4]} text-white p-6 rounded-2xl text-left font-semibold shadow-soft cursor-pointer select-none active:scale-[0.98] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed ${picked ? "ring-4 ring-white" : ""}`}
                    >
                      <span className="text-xs opacity-80 block">Option {i + 1}</span>
                      <span className="text-lg">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {answered[currentQ.id] && (
              <p className="text-center text-sm text-muted-foreground">Answer locked in. Waiting for the host...</p>
            )}
          </div>
        )}

        {session.status === "reveal" && currentQ && (
          <Card className="p-8 text-center space-y-4">
            <div className="mx-auto size-20 rounded-full grid place-items-center text-white shadow-glow"
              style={{ background: answered[currentQ.id]?.correct ? "var(--gradient-game-d)" : "var(--gradient-game-a)" }}>
              {answered[currentQ.id]?.correct ? <Check className="size-10" /> : <X className="size-10" />}
            </div>
            <h2 className="text-3xl font-bold">{answered[currentQ.id]?.correct ? "Correct!" : "Not quite"}</h2>
            {currentQ.type !== "matching" && (
              <p className="text-muted-foreground">Correct answer: <span className="font-semibold text-foreground">{answered[currentQ.id]?.correctAnswer ?? "—"}</span></p>
            )}
            {answered[currentQ.id] && <p className="text-warning font-semibold">+{answered[currentQ.id].points} pts</p>}
            {answered[currentQ.id]?.explanation && currentQ.type !== "matching" && <p className="text-sm text-muted-foreground max-w-lg mx-auto">{answered[currentQ.id].explanation}</p>}
            <Leaderboard participants={participants} highlight={participant.participantId} />
          </Card>
        )}

        {session.status === "ended" && (
          <div className="space-y-6">
            <Card className="p-8 text-center bg-gradient-card border-2 animate-scale-in">
              <Trophy className="size-16 text-warning mx-auto animate-bounce" />
              <h2 className="text-4xl font-bold mt-4">Game over!</h2>
              <p className="text-muted-foreground mt-2">
                You finished <span className="font-bold text-foreground">#{rank}</span> with{" "}
                <span className="font-bold text-primary">{maxScore > 0 ? `${myPct}/100` : `${me?.score ?? 0} pts`}</span>
              </p>
            </Card>
            <WinnersPodium participants={participants} maxScore={maxScore} highlightId={participant.participantId} />
            <Card className="p-6">
              <Leaderboard participants={participants} highlight={participant.participantId} maxScore={maxScore} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Lobby({ participants }: { participants: { id: string; nickname: string }[] }) {
  return (
    <Card className="p-10 text-center bg-gradient-card border-2">
      <div className="mx-auto size-20 rounded-full bg-gradient-primary animate-pulse-ring grid place-items-center text-primary-foreground">
        <Trophy className="size-10" />
      </div>
      <h2 className="text-3xl font-bold mt-4">You're in!</h2>
      <p className="text-muted-foreground">Waiting for the host to start the game...</p>
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {participants.map((p) => (
          <span key={p.id} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">{p.nickname}</span>
        ))}
      </div>
    </Card>
  );
}

function Leaderboard({ participants, highlight, maxScore }: { participants: { id: string; nickname: string; score: number }[]; highlight: string; maxScore?: number }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score).slice(0, 10);
  const fmt = (s: number) => (maxScore && maxScore > 0 ? `${Math.round((s / maxScore) * 100)}/100` : `${s}`);
  return (
    <div className="max-w-md mx-auto text-left">
      <h3 className="font-semibold mb-2">Top scores</h3>
      <ul className="space-y-1">
        {sorted.map((p, i) => (
          <li key={p.id} className={`flex justify-between rounded-lg px-3 py-2 text-sm ${p.id === highlight ? "bg-primary/15 font-semibold" : "bg-muted"}`}>
            <span>{i + 1}. {p.nickname}</span><span>{fmt(p.score)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-hero">
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function FillBlankInput({ locked, onSubmit }: { locked: boolean; onSubmit: (v: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2">
      <input
        type="text"
        disabled={locked}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Type your answer..."
        className="flex-1 rounded-2xl border-2 bg-background px-4 py-4 text-lg font-semibold outline-none focus:border-primary disabled:opacity-60"
      />
      <Button
        size="lg"
        disabled={locked || !val.trim()}
        onClick={() => onSubmit(val.trim())}
        className="bg-gradient-primary rounded-2xl"
      >
        Submit
      </Button>
    </div>
  );
}

function MatchingInput({ pairs, locked, onSubmit }: { pairs: string[]; locked: boolean; onSubmit: (v: string) => void }) {
  const parsed = useMemo(
    () => pairs.map((p) => {
      const [l = "", r = ""] = p.split("|");
      return { l: l.trim(), r: r.trim() };
    }).filter((p) => p.l && p.r),
    [pairs],
  );
  const rightOptions = useMemo(() => {
    const arr = parsed.map((p) => p.r);
    // shuffle deterministically-ish
    return [...arr].sort(() => Math.random() - 0.5);
  }, [parsed.length]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const allChosen = parsed.every((p) => picks[p.l]);

  function submit() {
    const payload = parsed.map((p) => `${p.l}|${picks[p.l] ?? ""}`).join(";");
    onSubmit(payload);
  }

  return (
    <div className="space-y-3">
      {parsed.map((p) => (
        <div key={p.l} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-card border-2 rounded-2xl p-3">
          <span className="font-semibold px-2">{p.l}</span>
          <span className="text-muted-foreground">↔</span>
          <select
            disabled={locked}
            value={picks[p.l] ?? ""}
            onChange={(e) => setPicks((s) => ({ ...s, [p.l]: e.target.value }))}
            className="rounded-lg border-2 bg-background px-3 py-2 font-medium disabled:opacity-60"
          >
            <option value="">Choose match...</option>
            {rightOptions.map((r, i) => (
              <option key={i} value={r}>{r}</option>
            ))}
          </select>
        </div>
      ))}
      <Button
        size="lg"
        className="w-full bg-gradient-primary rounded-2xl"
        disabled={locked || !allChosen}
        onClick={submit}
      >
        Submit matches
      </Button>
    </div>
  );
}
