import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPlatformActivity } from "@/lib/activity-log.functions";

const OPS: Record<string, string> = { insert: "إضافة", update: "تعديل", delete: "حذف" };
const fmt = new Intl.DateTimeFormat("ar-DZ", {
  timeZone: "Africa/Algiers", weekday: "long", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

export function PlatformActivityLog() {
  const fn = useServerFn(listPlatformActivity);
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [page, setPage] = useState(0);

  const logs = useQuery({
    queryKey: ["platform-activity", unlocked, search, day, page],
    enabled: !!unlocked,
    refetchInterval: 10_000,
    queryFn: () => fn({ data: { pin: unlocked!, search: search || undefined, day: day || undefined, page } }),
  });

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await fn({ data: { pin, page: 0 } });
      setUnlocked(pin);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "رمز غير صحيح");
    } finally { setBusy(false); setPin(""); }
  };

  if (!unlocked) {
    return (
      <form onSubmit={unlock} className="card-soft mx-auto max-w-sm space-y-3 p-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-primary" />
        <h2 className="text-lg font-bold">سجل العمليات محمي</h2>
        <p className="text-xs text-muted-foreground">أدخل رمز PIN للدخول.</p>
        <Input type="password" inputMode="numeric" autoComplete="off" maxLength={20}
          value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="text-center" dir="ltr" />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button type="submit" disabled={busy || !pin} className="w-full">دخول</Button>
      </form>
    );
  }

  const total = logs.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (logs.data?.pageSize ?? 100)));
  return (
    <section className="card-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">سجل العمليات ({total})</h2>
        <div className="flex flex-wrap gap-2">
          <Input className="h-9 w-48" placeholder="بحث…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          <Input className="h-9 w-40" type="date" value={day} onChange={(e) => { setDay(e.target.value); setPage(0); }} />
          <Button type="button" variant="outline" size="sm" onClick={() => setUnlocked(null)}>قفل</Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">يتحدث تلقائيًا كل 10 ثوانٍ · التوقيت بتوقيت الجزائر</p>
      {logs.error && <p className="mt-3 text-sm text-destructive">{(logs.error as Error).message}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-start text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="p-2 text-start">اليوم والوقت</th>
              <th className="p-2 text-start">العملية</th>
              <th className="p-2 text-start">القسم</th>
              <th className="p-2 text-start">المنفذ</th>
              <th className="p-2 text-start">المؤسسة</th>
              <th className="p-2 text-start">النتيجة</th>
            </tr>
          </thead>
          <tbody>
            {(logs.data?.rows ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 whitespace-nowrap">{fmt.format(new Date(r.created_at))}</td>
                <td className="p-2">{OPS[r.action] ?? r.action}</td>
                <td className="p-2">{r.resource ?? "—"}</td>
                <td className="p-2">{r.actor_name ?? (r.actor_id ? "مستخدم" : "النظام")}{r.actor_role ? ` · ${r.actor_role}` : ""}</td>
                <td className="p-2">{r.institution_name ?? "—"}</td>
                <td className="p-2">{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.isLoading && <p className="p-4 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>}
        {!logs.isLoading && (logs.data?.rows ?? []).length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">لا توجد عمليات.</p>}
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs">
        <Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>السابق</Button>
        <span>{page + 1} / {pages}</span>
        <Button type="button" size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>التالي</Button>
      </div>
    </section>
  );
}
