import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/site/BrandLogo";

const links = [
  { to: "/", label: "الرئيسية" },
  { to: "/features", label: "المميزات" },
  { to: "/pricing", label: "الأسعار" },
  { to: "/subscribe", label: "الاشتراك والدفع" },
  { to: "/contact", label: "التواصل والدعم" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
        <BrandLogo />

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Button asChild size="sm" className="ms-2">
            <Link to="/register">تسجيل مؤسسة</Link>
          </Button>
        </nav>

        <button
          type="button"
          aria-label="القائمة"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Button asChild className="mt-2">
              <Link to="/register" onClick={() => setOpen(false)}>
                تسجيل مؤسسة جديدة
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
