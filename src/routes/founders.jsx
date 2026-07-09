import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/founders")({
  head: () => ({
    meta: [
      { title: "Founders — Subiza" },
      { name: "description", content: "Subiza was founded by Elisee MUGIRANEZA and Moise NIYOMAHORO." },
    ],
  }),
  component: FoundersPage,
});

function FoundersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-8">
            <Link to="/">
              <ArrowLeft className="size-4" /> Back to home
            </Link>
          </Button>
          <h1 className="text-5xl font-bold tracking-tight mb-4">Founders</h1>
          <p className="text-lg text-muted-foreground mb-12">
            The people behind Subiza.
          </p>

          <div className="space-y-8">
            <Card className="p-8">
              <h2 className="text-2xl font-bold tracking-tight">Elisee MUGIRANEZA</h2>
              <p className="text-primary font-medium mt-1">Founder & Lead Developer</p>
              <p className="text-muted-foreground mt-4">
                Elisee MUGIRANEZA is the founder and lead developer of Subiza, responsible for the main vision, architecture, and development of the platform.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <a href="https://eliseemugiraneza.pages.dev/" target="_blank" rel="noopener noreferrer">
                  Portfolio <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold tracking-tight">Moise NIYOMAHORO</h2>
              <p className="text-primary font-medium mt-1">Co-Founder</p>
              <p className="text-muted-foreground mt-4">
                Moise NIYOMAHORO is a co-founder of Subiza and contributed to building and growing the platform.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
