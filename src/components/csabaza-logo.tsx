import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/csabaza-logo.png.asset.json";

export function CSAbazaLogo({ className = "", showTagline = true }: { className?: string; showTagline?: boolean }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={logoAsset.url}
        alt="CSAbaza"
        className="h-12 w-auto sm:h-14"
        loading="eager"
      />
      {showTagline && (
        <span className="hidden md:inline text-base sm:text-lg font-extrabold tracking-tight leading-tight text-foreground">
          Quizzes that <span className="bg-primary text-primary-foreground px-1.5 rounded">turn classrooms</span> into game shows.
        </span>
      )}
    </Link>
  );
}
