import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Brain, Gamepad2, LineChart, Sparkles, Trophy, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSAbaza — Live quizzes that actually engage" },
      { name: "description", content: "Create AI-powered quizzes, host live games with a PIN, and watch your classroom light up. Built for schools." },
      { property: "og:title", content: "CSAbaza — Live quizzes that actually engage" },
      { property: "og:description", content: "Create AI-powered quizzes, host live games with a PIN, and watch your classroom light up." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center px-4 py-20 lg:py-28">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5 text-primary" />
              AI-powered • Real-time • Built for classrooms
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-balance">
              Quizzes that <span className="bg-gradient-primary bg-clip-text text-transparent">turn classrooms</span> into game shows.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Create quizzes by hand or in seconds with AI. Host live, share a PIN, and watch students compete in real time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-gradient-primary shadow-elegant text-base">
                <Link to="/auth">
                  Start hosting <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#join">I'm a student</a>
              </Button>
            </div>
          </div>

          {/* Join card */}
          <div id="join" className="relative">
            <Card className="glass border-2 p-8 shadow-elegant max-w-md mx-auto relative">
              <div className="absolute -top-3 -right-3 animate-float">
                <div className="size-14 rounded-2xl game-b grid place-items-center text-white shadow-glow">
                  <Gamepad2 className="size-7" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Got a PIN?</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your 6-digit game PIN to join.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (/^\d{6}$/.test(pin)) navigate({ to: "/join/$pin", params: { pin } });
                }}
                className="mt-6 space-y-3"
              >
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="text-center text-3xl font-bold tracking-[0.4em] h-16 font-display"
                  aria-label="Game PIN"
                />
                <Button type="submit" size="lg" className="w-full bg-gradient-primary text-base">
                  Join game <ArrowRight className="size-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">No account needed for students.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold tracking-tight">Everything you need for live learning</h2>
          <p className="text-muted-foreground mt-3">From quick polls to graded assessments, all in one polished platform.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Brain, title: "AI Quiz Generator", desc: "Type a topic — get a full quiz with explanations in seconds." },
            { icon: Zap, title: "Real-time Hosting", desc: "PIN-based live games with leaderboard updates after every question." },
            { icon: Users, title: "No student accounts", desc: "Students join as guests with just a nickname. Frictionless." },
            { icon: LineChart, title: "Deep Analytics", desc: "Per-question stats, most-missed items, time spent, accuracy." },
          ].map((f) => (
            <Card key={f.title} className="p-6 bg-gradient-card border-2 hover:shadow-elegant transition-all hover:-translate-y-1">
              <div className="size-11 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shadow-soft">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Create a quiz", d: "Build manually, import a CSV, or let AI generate from a topic." },
            { n: "02", t: "Share a PIN", d: "Host a live session. Students join from any device — no signup." },
            { n: "03", t: "See the leaderboard", d: "Live scoring, instant feedback, and a full review at the end." },
          ].map((s) => (
            <Card key={s.n} className="p-8 relative overflow-hidden">
              <div className="text-7xl font-black font-display text-primary/10 absolute -top-2 right-2">{s.n}</div>
              <Trophy className="size-6 text-primary" />
              <h3 className="mt-4 text-xl font-bold">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <Card className="bg-gradient-primary text-primary-foreground p-12 text-center shadow-elegant border-0">
          <h2 className="text-4xl font-bold tracking-tight">Ready to host your first game?</h2>
          <p className="mt-2 opacity-90">Set up your teacher account in under a minute.</p>
          <Button size="lg" variant="secondary" asChild className="mt-6">
            <Link to="/auth">Create teacher account <ArrowRight className="size-4" /></Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CSAbaza. Made for educators.
      </footer>
    </div>
  );
}
