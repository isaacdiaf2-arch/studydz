import { PDFDocument } from "pdf-lib";
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
  doc.registerFontkit(fontkit);
  doc.setTitle(`Study DZ — ${record.number}`);
  doc.setCreationDate(new Date(platform.signed_at));
  // Full embedding avoids incorrect glyph IDs when subsetting the variable Arabic font.
  const font = await doc.embedFont(fontBytes, { subset: false });
  const bidi = bidiFactory();
  const visual = (s: string) => { const shaped = ArabicShaper.convertArabic(s); return bidi.getReorderedString(shaped, bidi.getEmbeddingLevels(shaped, "rtl")); };
  let page = doc.addPage([595.28, 841.89]);
  let y = 790;
  const line = (text: string, size = 12) => {
    const words = text.split(/\s+/); let pending = "";
    const draw = (s: string) => {
      if (y < 65) { page = doc.addPage([595.28, 841.89]); y = 790; }
      const v = visual(s); page.drawText(v, { x: 550 - font.widthOfTextAtSize(v, size), y, size, font }); y -= size + 12;
    };
    for (const word of words) {
      const next = pending ? `${pending} ${word}` : word;
      if (font.widthOfTextAtSize(visual(next), size) > 500 && pending) { draw(pending); pending = word; } else pending = next;
    }
    if (pending) draw(pending);
  };
  line("عقد Study DZ — البيانات التعاقدية والتوقيعان", 18);
  line(`رقم العقد: ${record.number}`);
  for (const [key, label] of Object.entries(FIELD_LABELS)) line(`${label}: ${(record.fields as ContractFields)[key as keyof ContractFields]}`);
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
    line(`هوية الحساب: ${evidence.actor_id}`, 10);
    line(`تاريخ ووقت التوقيع (UTC): ${evidence.signed_at}`, 10);
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