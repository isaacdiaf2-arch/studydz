import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ArabicShaper } from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";
import fontAsset from "@/assets/contracts/font.asset.json";
import referenceAsset from "@/assets/contracts/reference.jpg.asset.json";
import { FIELD_LABELS, type ContractFields } from "./official-contract.shared";

export type SigningEvidence = { actor_id: string; name: string; email: string; role: string; consent: true; signed_at: string; content_hash: string; signature: string; authentication: string };
export async function buildContractPdf(record: { number: string; fields: unknown; provider: unknown; content_hash: string; institution_evidence: unknown }, platform: SigningEvidence, origin: string) {
  const load = async (url: string) => {
    const response = await fetch(new URL(url, origin));
    if (!response.ok) throw new Error("تعذر تحميل الأصل الرسمي للعقد.");
    return new Uint8Array(await response.arrayBuffer());
  };
  const [fontBytes, imageBytes] = await Promise.all([load(fontAsset.url), load(referenceAsset.url)]);
  return renderContractPdf(record, platform, fontBytes, imageBytes);
}

export async function renderContractPdf(record: { number: string; fields: unknown; provider: unknown; content_hash: string; institution_evidence: unknown }, platform: SigningEvidence, fontBytes: Uint8Array, imageBytes: Uint8Array) {
  const doc = await PDFDocument.create();
  doc.registerFontkit({ create: (bytes: Uint8Array) => {
    const parsed = fontkit.create(bytes);
    return new Proxy(parsed, { get(target, key) {
      if (key === "layout") return (text: string) => Reflect.apply(target.layout, target, [text, [], "latn", "ARA", "ltr"]);
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    } });
  } });
  doc.setTitle(`Study DZ — ${record.number}`);
  doc.setCreationDate(new Date(platform.signed_at));
  const font = await doc.embedFont(fontBytes, { subset: false });
  const latin = await doc.embedFont(StandardFonts.Helvetica);
  const bidi = bidiFactory();
  const visual = (s: string) => { const shaped = ArabicShaper.convertArabic(s); return bidi.getReorderedString(shaped, bidi.getEmbeddingLevels(shaped, "rtl")); };
  const runs = (s: string) => s.match(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]+|[^\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]+/g) ?? [];
  const face = (s: string) => /[\u0600-\u06ff\ufb50-\ufeff]/.test(s) ? font : latin;
  const measure = (s: string, size: number) => runs(s).reduce((sum, run) => sum + face(run).widthOfTextAtSize(run, size), 0);
  let page = doc.addPage([595.28, 841.89]);
  let y = 790;
  const line = (text: string, size = 12) => {
    const words = text.split(/\s+/); let pending = "";
    const draw = (s: string) => {
      if (y < 65) { page = doc.addPage([595.28, 841.89]); y = 790; }
      const v = visual(s); let x = 550 - measure(v, size);
      for (const run of runs(v)) { const f = face(run); page.drawText(run, { x, y, size, font: f }); x += f.widthOfTextAtSize(run, size); }
      y -= size + 12;
    };
    for (const word of words) {
      const next = pending ? `${pending} ${word}` : word;
      if (measure(visual(next), size) > 500 && pending) { draw(pending); pending = word; } else pending = next;
    }
    if (pending) draw(pending);
  };
  const latinLine = (text: string, size = 10) => {
    if (y < 65) { page = doc.addPage([595.28, 841.89]); y = 790; }
    page.drawText(text, { x: 550-latin.widthOfTextAtSize(text,size), y, size, font: latin }); y -= size+12;
  };
  line("عقد Study DZ — البيانات التعاقدية والتوقيعان", 18);
  line("رقم العقد:"); latinLine(record.number);
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const value = (record.fields as ContractFields)[key as keyof ContractFields];
    if (/^[\x20-\x7E]+$/.test(value)) { line(`${label}:`); latinLine(value); } else line(`${label}: ${value}`);
  }
  const provider = record.provider as Record<string, string>;
  line("الطرف الثاني: مزود الخدمة — Study DZ", 15);
  line("النشاط: تطوير وتقديم حلول برمجية ومنصات تعليمية رقمية");
  line("العنوان: الجزائر");
  line(`رقم التعريف الوطني (NIN): ${provider.nin}`);
  line(`رقم التعريف الجبائي (NIF): ${provider.nif}`);
  line("الصورة الرسمية المرفقة جزء من هذا العقد وتضم كامل مواده دون أي تغيير.");
  for (const evidence of [record.institution_evidence as SigningEvidence, platform]) {
    if (y < 270) { page = doc.addPage([595.28, 841.89]); y = 790; }
    line(evidence.role === "institution_admin" ? "إمضاء الطرف الأول (المؤسسة)" : "إمضاء الطرف الثاني (مزود الخدمة)", 15);
    line(`الاسم: ${evidence.name}`);
    line("هوية الحساب:", 10); latinLine(evidence.actor_id);
    line("تاريخ ووقت التوقيع (UTC):", 10); latinLine(evidence.signed_at);
    line("تم التحقق من الحساب بكلمة المرور وتسجيل الموافقة الصريحة على محتوى العقد.", 10);
    const sig = await doc.embedPng(evidence.signature);
    page.drawImage(sig, { x: 340, y: y - 75, width: 200, height: 65 }); y -= 100;
  }
  line(`SHA-256 للمحتوى: ${record.content_hash}`, 8);
  const annex = doc.addPage([595.28, 841.89]);
  const image = await doc.embedJpg(imageBytes);
  const dims = image.scaleToFit(571, 818);
  annex.drawImage(image, { x: (595.28-dims.width)/2, y: (841.89-dims.height)/2, ...dims });
  return doc.save();
}