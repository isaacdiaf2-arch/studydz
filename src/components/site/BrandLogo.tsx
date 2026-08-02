import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { unlockPlatformAdmin } from "@/lib/auth.functions";
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
import logo from "@/assets/studydz-logo.png.asset.json";

export const PENDING_UNLOCK_KEY = "studydz.pending_unlock";

export function BrandLogo({
  size = "md",
  subtitle = true,
}: {
  size?: "sm" | "md";
  subtitle?: boolean;
}) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const navigate = useNavigate();
  const unlock = useServerFn(unlockPlatformAdmin);

  const clicks = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
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
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        sessionStorage.setItem(PENDING_UNLOCK_KEY, code.trim());
        setOpen(false);
        toast.info("سجّل الدخول بحسابك أولاً، وسيتم تفعيل لوحة مدير المنصة تلقائياً.");
        navigate({ to: "/auth" });
        return;
      }
      await unlock({ data: { code: code.trim() } });
      setOpen(false);
      setCode("");
      toast.success("تم تفعيل صلاحية مدير المنصة.");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "كلمة المرور غير صحيحة.");
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
          className={`${box} rounded-xl object-contain`}
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
              أدخل كلمة المرور للوصول إلى لوحة تحكم مدير المنصة.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="unlock-code">كلمة المرور</Label>
              <Input
                id="unlock-code"
                type="password"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
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
