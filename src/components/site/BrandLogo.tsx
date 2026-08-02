import { Link } from "@tanstack/react-router";
import logo from "@/assets/studydz-logo.png.asset.json";

export function BrandLogo({
  size = "md",
  subtitle = true,
}: {
  size?: "sm" | "md";
  subtitle?: boolean;
}) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link to="/" className="shrink-0" aria-label="Study DZ">
        <img
          src={logo.url}
          alt="شعار منصة Study DZ"
          className={`${box} rounded-xl object-contain`}
          width={44}
          height={44}
        />
      </Link>
      <span className="min-w-0">
        <Link to="/" className="block truncate font-display text-lg font-extrabold leading-tight">
          Study DZ
        </Link>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            منصة تعليمية جزائرية
          </span>
        )}
      </span>
    </div>
  );
}
