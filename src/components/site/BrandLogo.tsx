import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { openReservedConsole } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logo from "@/assets/studydz-logo-sd.png.asset.json";

export function BrandLogo({
  size = "md",
  subtitle = true,
}: {
  size?: "sm" | "md";
  subtitle?: boolean;
}) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const navigate = useNavigate();
  const openConsole = useServerFn(openReservedConsole);

  const clicks = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function registerClick() {
    clicks.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      clicks.current = 0;
    }, 700);
    if (clicks.current >= 3) {
      clicks.current = 0;
      if (timer.current) clearTimeout(timer.current);
      setOpen(true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await openConsole({
        data: { identifier: email.trim(), passcode: password },
      });
      if (!result.ok) throw new Error("بيانات الدخول غير صحيحة.");

      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) throw new Error("تعذّر فتح الجلسة.");

      setOpen(false);
      setEmail("");
      setPassword("");
      toast.success("مرحبًا بك في لوحة تحكم مدير المنصة.");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الدخول.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link to="/" className="shrink-0" aria-label="Study DZ">
        <img
          src={logo.url}
          alt="شعار منصة Study DZ"
          className={`${box} rounded-xl bg-[#EFEAE1] object-contain`}
          width={44}
          height={44}
        />
      </Link>
      <span className="min-w-0">
        <button
          type="button"
          onClick={registerClick}
          onDoubleClick={(e) => e.preventDefault()}
          className="block max-w-full select-none truncate font-display text-lg font-extrabold leading-tight"
        >
          Study DZ
        </button>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            منصة تعليمية جزائرية
          </span>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>دخول محجوز</DialogTitle>
            <DialogDescription>
              أدخل بيانات الدخول المحجوزة للوصول إلى لوحة تحكم مدير المنصة.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="unlock-email">البريد الإلكتروني</Label>
              <Input
                id="unlock-email"
                type="text"
                dir="ltr"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unlock-password">كلمة المرور</Label>
              <Input
                id="unlock-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جارٍ التحقق…" : "دخول"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
