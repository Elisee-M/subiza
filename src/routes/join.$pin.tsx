import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { joinSession, getPlayBootstrap } from "@/lib/student.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$pin")({
  component: JoinPage,
});

function JoinPage() {
  const { pin } = Route.useParams();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pinError, setPinError] = useState<string | null>(null);
  const join = useServerFn(joinSession);
  const bootstrap = useServerFn(getPlayBootstrap);
  const navigate = useNavigate();

  // Verify the PIN exists and the game isn't over before showing the form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = localStorage.getItem(`csabaza:pin:${pin}`);
        if (stored) {
          navigate({ to: "/play/$pin", params: { pin }, replace: true });
          return;
        }
        const res = await bootstrap({ data: { pin } });
        if (cancelled) return;
        if ((res.session as any).status === "ended") {
          setPinError("This game has already ended. Ask your teacher for a new PIN.");
        }
      } catch (err: any) {
        if (!cancelled) setPinError(err?.message ?? "Game not found. Check the PIN and try again.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pin, navigate]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await join({ data: { pin, nickname: nickname.trim() } });
      const payload = JSON.stringify(res);
      localStorage.setItem(`csabaza:${res.sessionId}`, payload);
      localStorage.setItem(`csabaza:pin:${pin}`, payload);
      navigate({ to: "/play/$pin", params: { pin }, replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not join");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero">
      <Header />
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="glass w-full max-w-md p-8 border-2 shadow-elegant">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Game PIN</p>
            <p className="text-4xl font-display font-black tracking-[0.3em] mt-1">{pin}</p>
          </div>

          {checking ? (
            <p className="text-center text-sm text-muted-foreground mt-8">Checking PIN…</p>
          ) : pinError ? (
            <div className="mt-8 text-center space-y-4">
              <p className="text-destructive font-medium">{pinError}</p>
              <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="mt-8 space-y-4">
              <div>
                <label className="text-sm font-medium">Pick a nickname</label>
                <Input
                  autoFocus
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. SuperLearner42"
                  className="mt-1 text-lg"
                  required
                />
              </div>
              <Button type="submit" size="lg" disabled={loading || !nickname.trim()} className="w-full bg-gradient-primary">
                Enter the lobby
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
