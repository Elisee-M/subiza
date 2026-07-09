import { Crown, Medal, Sparkles, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";

type Player = { id: string; nickname: string; score: number };

export function WinnersPodium({
  participants,
  maxScore,
  highlightId,
}: {
  participants: Player[];
  maxScore?: number;
  highlightId?: string;
}) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const podium = sorted.slice(0, 3);
  if (!winner) return null;

  const pct = (s: number) =>
    maxScore && maxScore > 0 ? Math.round((s / maxScore) * 100) : null;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-8 bg-gradient-primary text-primary-foreground border-0 shadow-elegant text-center">
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-4 left-6 size-6 opacity-40 animate-pulse" />
          <Sparkles className="absolute top-8 right-10 size-8 opacity-30 animate-pulse [animation-delay:0.4s]" />
          <Sparkles className="absolute bottom-6 left-1/3 size-5 opacity-40 animate-pulse [animation-delay:0.8s]" />
          <PartyPopper className="absolute bottom-4 right-6 size-8 opacity-40 animate-bounce" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-widest animate-fade-in">
            <Crown className="size-4" /> Champion
          </div>
          <div className="mt-3 animate-scale-in">
            <Crown className="size-14 mx-auto text-warning drop-shadow-lg" />
          </div>
          <h2 className="mt-2 text-5xl font-black font-display animate-fade-in">{winner.nickname}</h2>
          <p className="mt-2 text-lg opacity-90 animate-fade-in">
            🎉 {pct(winner.score) !== null ? `${pct(winner.score)} / 100` : `${winner.score} pts`} 🎉
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 items-end">
        {[podium[1], podium[0], podium[2]].map((p, i) => {
          if (!p) return <div key={i} />;
          const place = p === podium[0] ? 1 : p === podium[1] ? 2 : 3;
          const heights = { 1: "h-44", 2: "h-32", 3: "h-24" } as const;
          const colors = {
            1: "bg-gradient-to-b from-yellow-300 via-warning to-warning/70",
            2: "bg-gradient-to-b from-slate-200 to-slate-400",
            3: "bg-gradient-to-b from-amber-500 to-amber-700",
          } as const;
          const label = { 1: "Gold", 2: "Silver", 3: "Bronze" } as const;
          const Icon = place === 1 ? Crown : Medal;
          const isMe = highlightId && p.id === highlightId;
          const p100 = pct(p.score);
          return (
            <div
              key={p.id}
              className="flex flex-col items-center animate-fade-in"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              <Icon
                className={`size-9 ${
                  place === 1 ? "text-warning animate-bounce" : place === 2 ? "text-slate-400" : "text-amber-600"
                }`}
              />
              <p className={`font-bold mt-1 text-center line-clamp-1 ${isMe ? "text-primary" : ""}`}>
                {p.nickname}{isMe ? " (you)" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {p100 !== null ? `${p100}/100` : `${p.score} pts`}
              </p>
              <div
                className={`${heights[place]} ${colors[place]} w-full rounded-t-xl mt-2 grid place-items-center text-white shadow-lg animate-scale-in`}
                style={{ animationDelay: `${i * 180 + 120}ms`, transformOrigin: "bottom" }}
              >
                <div className="text-center">
                  <div className="font-black text-3xl leading-none">#{place}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-90 mt-1">{label[place]}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function fireCelebration(confetti: any) {
  const duration = 3500;
  const end = Date.now() + duration;
  const colors = ["#7c3aed", "#f59e0b", "#ec4899", "#10b981", "#3b82f6"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  setTimeout(() => {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.35 }, colors, scalar: 1.1 });
  }, 300);
}
