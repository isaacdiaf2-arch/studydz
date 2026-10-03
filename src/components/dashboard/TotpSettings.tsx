import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldOff, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  enrollTotp,
  confirmTotpEnrollment,
  disableTotp,
  checkTotpStatus,
} from "@/lib/totp.functions";

export function TotpSettings() {
  const [step, setStep] = useState<"idle" | "enrolling" | "enabled">("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");

  const statusFn = useServerFn(checkTotpStatus);
  const enrollFn = useServerFn(enrollTotp);
  const confirmFn = useServerFn(confirmTotpEnrollment);
  const disableFn = useServerFn(disableTotp);

  const checkStatus = useMutation({
    mutationFn: () => statusFn({ data: undefined as never }),
    onSuccess: (res) => setStep(res.enabled ? "enabled" : "idle"),
  });

  useEffect(() => {
    checkStatus.mutate();
  }, []);

  const enroll = useMutation({
    mutationFn: () => enrollFn({ data: undefined as never }),
    onSuccess: (res) => {
      setSecret(res.secret);
      setUri(res.uri);
      setStep("enrolling");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: (c: string) => confirmFn({ data: { code: c } }),
    onSuccess: (res) => {
      setBackupCodes(res.backupCodes);
      setStep("enabled");
      setCode("");
      toast.success("تم تفعيل المصادقة الثنائية بنجاح.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disable = useMutation({
    mutationFn: (c: string) => disableFn({ data: { code: c } }),
    onSuccess: () => {
      setStep("idle");
      setDisableCode("");
      setSecret("");
      setUri("");
      setBackupCodes(null);
      toast.success("تم تعطيل المصادقة الثنائية.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="card-soft p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">المصادقة الثنائية (2FA)</h2>
            <p className="text-xs text-muted-foreground">
              حماية إضافية لحسابك الإداري باستخدام رمز مؤقت من تطبيق المصادقة.
            </p>
          </div>
        </div>

        {step === "idle" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              المصادقة الثنائية غير مفعّلة. عند تفعيلها سيُطلب منك رمز تأكيد من تطبيق
              مثل Google Authenticator أو FreeOTP عند كل تسجيل دخول.
            </p>
            <Button onClick={() => enroll.mutate()} disabled={enroll.isPending}>
              {enroll.isPending ? <Loader2 className="ms-1 h-4 w-4 animate-spin" /> : <KeyRound className="ms-1 h-4 w-4" />}
              بدء التفعيل
            </Button>
          </div>
        )}

        {step === "enrolling" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">الخطوة 1: امسح رمز QR</p>
              <p className="mt-1 text-xs text-muted-foreground">
                استخدم تطبيق المصادقة على هاتفك لمسح رمز QR التالي أو أدخل المفتاح يدويًا.
              </p>
              <div className="mt-3 flex flex-col items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`}
                  alt="QR"
                  className="h-40 w-40"
                />
                <div className="w-full">
                  <Label className="text-xs">المفتاح السري</Label>
                  <Input readOnly value={secret} dir="ltr" className="mt-1 font-mono text-xs" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">الخطوة 2: تأكيد الرمز</p>
              <p className="mt-1 text-xs text-muted-foreground">أدخل الرمز المكوّن من 6 أرقام.</p>
              <div className="mt-3 flex gap-2">
                <Input dir="ltr" maxLength={6} placeholder="000000" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center text-lg" />
                <Button onClick={() => confirm.mutate(code)} disabled={code.length !== 6 || confirm.isPending}>
                  {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "enabled" && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3">
              <ShieldCheck className="h-5 w-5 text-success" />
              <p className="text-sm font-semibold text-success">المصادقة الثنائية مفعّلة</p>
            </div>
            {backupCodes && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <p className="text-sm font-semibold">أكواد الاستعادة الاحتياطية</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">احفظ هذه الأكواد في مكان آمن. كل كود يُستخدم مرة واحدة.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {backupCodes.map((c, i) => (
                    <code key={i} dir="ltr" className="rounded bg-background px-2 py-1 text-xs font-mono">{c}</code>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setBackupCodes(null)}>أخفيت الأكواد</Button>
              </div>
            )}
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">تعطيل المصادقة الثنائية</p>
              <p className="mt-1 text-xs text-muted-foreground">أدخل رمز التحقق الحالي لتأكيد التعطيل.</p>
              <div className="mt-3 flex gap-2">
                <Input dir="ltr" maxLength={6} placeholder="000000" value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center text-lg" />
                <Button variant="destructive" onClick={() => disable.mutate(disableCode)} disabled={disableCode.length !== 6 || disable.isPending}>
                  {disable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="ms-1 h-4 w-4" />}
                  تعطيل
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
