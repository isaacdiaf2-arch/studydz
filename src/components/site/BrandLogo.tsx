import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import logo from "@/assets/studydz-logo.png.asset.json";
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
import { unlockPlatformAdmin } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";

export function BrandLogo({
  size = "md",
  subtitle = true,
}: {
  size?: "sm" | "md";
  subtitle?: boolean;
}) {
  const navigate = useNavigate();
  const clicks = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const unlock = useServerFn(unlockPlatformAdmin);
  const queryClient = useQueryClient();

  function handleNameClick(e: React.MouseEvent) {
    clicks.current += 1;
    if (clicks.current >= 3) {
      e.preventDefault();
      clicks.current = 0;
      if (timer.current) clearTimeout(timer.current);
      setOpen(true);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      clicks.current = 0;
    }, 600);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        sessionStorage.setItem("sdz_pending_unlock", code);
        setBusy(false);
        setOpen(false);
        toast.info("سجّل الدخول أولًا وسيتم فتح لوحة مدير المنصة تلقائيًا.");
        navigate({ to: "/auth", search: { redirect: "/admin" } });
        return;
      }
      await unlock({ data: { code } });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("تم فتح لوحة مدير المنصة.");
      setOpen(false);
      setCode("");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الفتح.");
    } finally {
      setBusy(false);
    }
  }

  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <>
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
            onClick={handleNameClick}
            title="Study DZ"
            className="block truncate font-display text-lg font-extrabold leading-tight"
          >
            Study DZ
          </button>
          {subtitle && (
            <span className="block truncate text-xs text-muted-foreground">
              منصة تعليمية جزائرية
            </span>
          )}
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>دخول محمي</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الخاصة بفتح لوحة تحكم مدير المنصة.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="unlock-code">كلمة المرور</Label>
              <Input
                id="unlock-code"
                type="password"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جارٍ التحقق…" : "فتح اللوحة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
