import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileSignature, Download, RotateCcw, Save, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "./SignaturePad";
import { FIELD_LABELS, OFFICIAL_CLAUSES, PREAMBLE, OFFICIAL_NOTE, RECORD_LABELS, contractFieldsSchema, type ContractFields } from "@/lib/official-contract.shared";
import { listOfficialContracts, getContractDefaults, saveProviderDetails, saveOfficialContract, signOfficialContract, returnOfficialContract, downloadOfficialContract, listContractAudit } from "@/lib/official-contract.functions";

const blank: ContractFields = { institution_name: "", legal_form: "", address: "", institution_nif: "", commercial_register: "", manager_name: "", manager_capacity: "", signing_place: "", contract_date: new Date().toISOString().slice(0,10) };
type RecordRow = NonNullable<Awaited<ReturnType<typeof listOfficialContracts>>>[number];

export function OfficialContractsPanel({ platform = false }: { platform?: boolean }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listOfficialContracts); const defaultsFn = useServerFn(getContractDefaults);
  const save = useServerFn(saveOfficialContract); const providerSave = useServerFn(saveProviderDetails);
  const sign = useServerFn(signOfficialContract); const returnFn = useServerFn(returnOfficialContract); const download = useServerFn(downloadOfficialContract);
  const records = useQuery({ queryKey: ["official-contracts"], queryFn: () => list() });
  const defaults = useQuery({ queryKey: ["contract-defaults"], queryFn: () => defaultsFn() });
  const [selected, setSelected] = useState<string | null>(null); const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<ContractFields>(blank); const [replaces, setReplaces] = useState<string>();
  const [signature, setSignature] = useState(""); const [consent, setConsent] = useState(false); const [password, setPassword] = useState("");
  const [signing, setSigning] = useState(false); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const auditFn = useServerFn(listContractAudit);
  const audit = useQuery({ queryKey: ["contract-audit", selected], enabled: !!selected, queryFn: () => { if (!selected) return []; return auditFn({ data: { id: selected } }); } });
  const record = records.data?.find(c => c.id === selected);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["official-contracts"] }); queryClient.invalidateQueries({ queryKey: ["contract-audit"] }); queryClient.invalidateQueries({ queryKey: ["admin"] }); };
  async function act(fn: () => Promise<unknown>, message: string) {
    setBusy(true); try { await fn(); refresh(); toast.success(message); } catch(e) { toast.error(e instanceof Error ? e.message : "تعذر إتمام العملية."); } finally { setBusy(false); }
  }
  function edit(c?: RecordRow, replacement = false) {
    setSelected(replacement ? null : c?.id ?? null); setFields({ ...blank, ...defaults.data?.fields, ...(c?.fields as Partial<ContractFields> ?? {}) });
    setReplaces(replacement ? c?.id : undefined); setEditing(true); setSigning(false);
  }
  async function downloadPdf(c: RecordRow) {
    const result = await download({ data: { id: c.id } });
    const bytes = Uint8Array.from(atob(result.pdf_base64), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a"); link.href = url; link.download = `${c.number}.pdf`; link.click(); URL.revokeObjectURL(url);
    toast.success("تم التحقق من سلامة النسخة النهائية.");
  }
  return <section className="space-y-6" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <h2 className="text-xl font-bold">العقود الإلكترونية</h2>
      {!platform && !editing && <Button disabled={busy || !defaults.data?.provider || records.data?.some(c => c.state === "draft" || c.state === "awaiting_platform")} onClick={() => edit()}><FileSignature className="h-4 w-4" /> إنشاء عقد</Button>}
    </header>
    {platform && <form className="space-y-4 border-b border-border pb-6" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act(() => providerSave({ data: { nin: String(f.get("nin")), nif: String(f.get("nif")), signer_name: String(f.get("signer_name")), signer_capacity: String(f.get("signer_capacity")) } }).then(() => { queryClient.invalidateQueries({ queryKey: ["contract-defaults"] }); }), "حُفظت بيانات مزود الخدمة للعقود الجديدة."); }}>
      <h3 className="font-semibold">بيانات الطرف الثاني: مزود الخدمة — Study DZ</h3>
      <p className="text-sm text-muted-foreground">النشاط: تطوير وتقديم حلول برمجية ومنصات تعليمية رقمية · العنوان: الجزائر</p>
      <div className="grid gap-4 sm:grid-cols-2">{[["nin","رقم التعريف الوطني (NIN)"],["nif","رقم التعريف الجبائي (NIF)"],["signer_name","اسم ممثل مزود الخدمة"],["signer_capacity","صفة ممثل مزود الخدمة"]].map(([key,label]) => <div key={key} className="space-y-2"><Label htmlFor={`provider-${key}`}>{label}</Label><Input key={`${key}-${JSON.stringify(defaults.data?.provider)}`} id={`provider-${key}`} name={key} required maxLength={250} defaultValue={(defaults.data?.provider as Record<string,string> | null)?.[key] ?? ""} /></div>)}</div>
      <Button type="submit" variant="outline" disabled={busy}><Save className="h-4 w-4" /> حفظ بيانات مزود الخدمة</Button>
    </form>}
    {!platform && defaults.isSuccess && !defaults.data?.provider && <p className="text-sm text-warning-foreground">بانتظار استكمال مدير المنصة معلومات مزود الخدمة الرسمية.</p>}
    {(records.isLoading || defaults.isLoading) && <p className="text-muted-foreground">جارٍ تحميل العقود…</p>}
    {(records.error || defaults.error) && <div role="alert" className="text-destructive">تعذر تحميل العقود. <Button variant="outline" onClick={() => { records.refetch(); defaults.refetch(); }}>إعادة المحاولة</Button></div>}
    {!editing && !record && <div className="divide-y divide-border">
      {records.data?.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد عقود رسمية بعد.</p>}
      {records.data?.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="font-semibold">{(c.fields as Partial<ContractFields>)?.institution_name}</p><p dir="ltr" className="break-all text-xs text-muted-foreground">{c.number}</p><p className="mt-1 text-sm">{RECORD_LABELS[c.state]}</p></div><Button variant="outline" onClick={() => { setSelected(c.id); setSigning(false); setNote(""); }}>مراجعة العقد <ChevronLeft className="h-4 w-4" /></Button></div>)}
    </div>}
    {editing && <form className="space-y-6" onSubmit={e => { e.preventDefault(); const parsed = contractFieldsSchema.safeParse(fields); if (!parsed.success) { toast.error("أكمل جميع الخانات المطلوبة."); return; } act(async () => { const res = await save({ data: { fields: parsed.data, id: selected ?? undefined, replaces_id: replaces } }); setSelected(res.id); setEditing(false); }, "تم حفظ البيانات؛ راجع العقد كاملاً قبل التوقيع."); }}>
      <h3 className="font-semibold">الطرف الأول: المؤسسة (العميل)</h3>
      <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(FIELD_LABELS) as (keyof ContractFields)[]).map(key => <div className="space-y-2" key={key}><Label htmlFor={`contract-${key}`}>{FIELD_LABELS[key]}</Label><Input id={`contract-${key}`} type={key === "contract_date" ? "date" : "text"} value={fields[key]} required maxLength={250} onChange={e => setFields(v => ({ ...v, [key]: e.target.value }))} /></div>)}</div>
      <LegalClauses />
      <div className="flex gap-3"><Button disabled={busy} type="submit"><Save className="h-4 w-4" /> حفظ ومراجعة العقد</Button><Button variant="outline" type="button" onClick={() => setEditing(false)}>إلغاء</Button></div>
    </form>}
    {record && !editing && <div className="space-y-6">
      <Button variant="outline" onClick={() => { setSelected(null); setSigning(false); }}>العودة إلى العقود</Button>
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{RECORD_LABELS[record.state]}</h3><span dir="ltr" className="break-all text-xs text-muted-foreground">{record.number}</span></div>
      <section><h3 className="mb-3 font-semibold">الطرف الأول: المؤسسة (العميل)</h3><dl className="grid gap-x-8 sm:grid-cols-2">{Object.entries(FIELD_LABELS).map(([key,label]) => <div key={key} className="border-b border-border py-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{(record.fields as Record<string,string>)[key]}</dd></div>)}</dl><p className="mt-3 text-sm">ويشار إليها فيما يلي بـ "المؤسسة" أو "العميل"</p></section>
      <section className="space-y-2"><h3 className="font-semibold">الطرف الثاني: مزود الخدمة</h3><p>الاسم أو التسمية: Study DZ</p><p>النشاط: تطوير وتقديم حلول برمجية ومنصات تعليمية رقمية</p><p>العنوان: الجزائر</p><p>رقم التعريف الوطني (NIN): {(record.provider as Record<string,string>).nin}</p><p>رقم التعريف الجبائي (NIF): {(record.provider as Record<string,string>).nif}</p><p className="text-sm">ويشار إليها فيما يلي بـ "مزود الخدمة"</p></section>
      <LegalClauses />
      <div className="grid gap-5 sm:grid-cols-2">{[["institution_evidence","إمضاء الطرف الأول (المؤسسة)"],["platform_evidence","إمضاء الطرف الثاني (مزود الخدمة)"]].map(([key,label]) => { const evidence = record[key as "institution_evidence" | "platform_evidence"] as Record<string,string> | null; return <section className="border-t border-border pt-4" key={key}><h4 className="font-semibold">{label}</h4>{evidence ? <><img src={evidence.signature} alt={label} className="h-24 w-full object-contain" /><p className="text-sm">{evidence.name}</p><p dir="ltr" className="break-all text-xs text-muted-foreground">{evidence.signed_at} (UTC)</p><p className="text-xs text-muted-foreground">الهوية موثقة والموافقة مسجلة</p></> : <p className="mt-3 text-sm text-muted-foreground">لم يتم التوقيع بعد</p>}</section>; })}</div>
      <p dir="ltr" className="break-all text-xs text-muted-foreground">SHA-256: {record.content_hash}</p>
      <section className="border-t border-border pt-4"><h4 className="mb-3 font-semibold">سجل العقد</h4>{audit.data?.map(event => <div key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-xs"><span>{({ contract_created: "إنشاء العقد", contract_fields_updated: "تحديث الخانات", institution_sign: "توقيع المؤسسة", platform_sign: "التوقيع النهائي", return: "إعادة رسمية للتصحيح", contract_download_verified: "تنزيل نسخة بعد التحقق" } as Record<string,string>)[event.action] ?? event.action}</span><time dir="ltr">{event.created_at}</time></div>)}{audit.error && <p className="text-sm text-destructive">تعذر تحميل سجل العقد.</p>}</section>
      {record.state === "returned" && <div className="space-y-3"><p className="text-warning-foreground">سبب الإعادة: {record.correction_note}</p>{!platform && <Button onClick={() => edit(record,true)}><RotateCcw className="h-4 w-4" /> إنشاء نسخة مصححة</Button>}</div>}
      {record.state === "final" && <Button disabled={busy} onClick={() => act(() => downloadPdf(record), "تم تنزيل النسخة الرسمية.")}><Download className="h-4 w-4" /> تحميل النسخة الرسمية PDF</Button>}
      {!platform && record.state === "draft" && !signing && <div className="flex gap-3"><Button variant="outline" onClick={() => edit(record)}>تعديل الخانات</Button><Button onClick={() => { setSigning(true); setSignature(""); setConsent(false); setPassword(""); }}>الانتقال إلى التوقيع</Button></div>}
      {platform && record.state === "awaiting_platform" && !signing && <div className="space-y-4"><Button onClick={() => { setSigning(true); setSignature(""); setConsent(false); setPassword(""); }}>التوقيع بصفتي الطرف الثاني</Button><Label htmlFor="correction-note">سبب الإعادة الرسمي للتصحيح</Label><Textarea id="correction-note" value={note} maxLength={1500} onChange={e => setNote(e.target.value)} /><Button disabled={busy || note.trim().length < 5} variant="outline" onClick={() => act(() => returnFn({ data: { id: record.id, expected_hash: record.content_hash, note } }), "أعيد العقد؛ تبقى النسخة الموقعة محفوظة.")}><RotateCcw className="h-4 w-4" /> إعادة للتصحيح</Button></div>}
      {signing && <section className="space-y-4 border-t border-border pt-5">
        <SignaturePad label={platform ? "إمضاء مدير المنصة" : "إمضاء مدير المؤسسة"} value={signature || null} onSave={async url => { setSignature(url); }} />
        <label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-2" />أقر بأنني راجعت العقد كاملاً وجميع بياناته وبنوده وأوافق على توقيعه بصفتي الممثل المخوّل.</label>
        <div className="space-y-2"><Label htmlFor="contract-password">كلمة مرور حسابك للتحقق من الهوية</Label><Input id="contract-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={128} /></div>
        <Button disabled={busy || !signature || !consent || !password} onClick={() => act(async () => { try { await sign({ data: { id: record.id, expected_hash: record.content_hash, signature, consent: true, password } }); setSigning(false); } finally { setPassword(""); } }, platform ? "اكتمل التوقيع وحُفظت النسخة النهائية للطرفين." : "تم التوقيع وإحالة العقد إلى مدير المنصة.")}><FileSignature className="h-4 w-4" />{busy ? "جارٍ التحقق والحفظ…" : "تأكيد الموافقة والتوقيع"}</Button>
      </section>}
    </div>}
  </section>;
}

function LegalClauses() {
  return <section className="space-y-5 border-y border-border py-6">
    <p className="whitespace-pre-line text-sm leading-8">{PREAMBLE}</p>
    {OFFICIAL_CLAUSES.map(c => <section key={c.title}><h4 className="border-b border-border pb-2 font-semibold">{c.title}</h4><p className="mt-2 whitespace-pre-line text-sm leading-8">{c.text}</p></section>)}
    <p className="text-sm leading-7">{OFFICIAL_NOTE}</p>
  </section>;
}