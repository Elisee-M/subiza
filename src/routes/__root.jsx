import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import logoSrc from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Subiza | Live Quiz Platform" },
      { name: "description", content: "Subiza is a real-time AI-powered live quiz platform for schools where teachers host live games and students join with a PIN." },
      { name: "author", content: "Elisee MUGIRANEZA" },
      { name: "creator", content: "Elisee MUGIRANEZA" },
      { name: "founders", content: "Elisee MUGIRANEZA, Moise NIYOMAHORO" },
      { name: "copyright", content: "Subiza by Elisee MUGIRANEZA and Moise NIYOMAHORO" },
      { name: "google-site-verification", content: "-v7hv6CqHCVSTT1V7mj0C4CbNZPk0imtagdkhJwZzKU" },
      { property: "og:site_name", content: "Subiza" },
      { property: "og:title", content: "Subiza - Real-Time AI Quiz Platform" },
      { property: "og:description", content: "Subiza was founded by Elisee MUGIRANEZA and Moise NIYOMAHORO." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://subiza.pages.dev" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Subiza - Real-Time AI Quiz Platform" },
      { name: "twitter:description", content: "Subiza was founded by Elisee MUGIRANEZA and Moise NIYOMAHORO." },
      { property: "og:image", content: logoSrc },
      { name: "twitter:image", content: logoSrc },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: logoSrc,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Subiza",
          "description": "Real-time AI-powered live quiz platform for schools.",
          "founder": [
            {
              "@type": "Person",
              "name": "Elisee MUGIRANEZA",
              "role": "Founder & Lead Developer",
              "url": "https://eliseemugiraneza.pages.dev/"
            },
            {
              "@type": "Person",
              "name": "Moise NIYOMAHORO",
              "role": "Co-Founder"
            }
          ]
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
