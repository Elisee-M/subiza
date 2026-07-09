import { Link } from "@tanstack/react-router";
import { CSAbazaLogo } from "./csabaza-logo";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, LayoutDashboard, Shield, Home, LogIn, Gamepad2, ShieldAlert } from "lucide-react";

export function Header() {
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <CSAbazaLogo />
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              <Home className="size-4" /> Home
            </Link>
          </Button>
          {user && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/dashboard"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <LayoutDashboard className="size-4" /> Dashboard
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/admin"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <Shield className="size-4" /> Admin
              </Link>
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/superadmin"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <ShieldAlert className="size-4" /> Superadmin
              </Link>
            </Button>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4" /> Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">
                  <LogIn className="size-4" /> Teacher login
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-gradient-primary shadow-elegant">
                <Link to="/">
                  <Gamepad2 className="size-4" /> Join game
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
