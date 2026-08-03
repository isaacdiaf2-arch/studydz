import { SUPPORT_EMAIL } from "@/lib/inbound.shared";

/**
 * إرسال إشعار بريدي حقيقي إلى بريد الدعم.
 * يعمل فور إعداد نطاق البريد الخاص بالمنصة؛ وإلى حين ذلك يُسجَّل الطلب في قاعدة
 * البيانات ويظهر في لوحة مدير المنصة، وتُرجع الدالة false دون إسقاط العملية.
 */
export async function notifyInbound({
  subject,
  lines,
}: {
  subject: string;
  lines: [string, string][];
}): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const senderDomain = process.env["SENDER_DOMAIN"];
  if (!apiKey || !senderDomain) return false;

  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${lines
        .map(
          ([k, v]) =>
            `<tr><td style="font-weight:700;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`,
        )
        .join("")}
    </table>
  </div>`;

  try {
    const response = await fetch("https://email.lovable.dev/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Study DZ <notifications@${senderDomain}>`,
        to: [SUPPORT_EMAIL],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      console.error(`[inbound-email] failed ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[inbound-email] error", error);
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
