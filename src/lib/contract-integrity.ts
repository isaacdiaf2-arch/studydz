export async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}
export function canonicalContract(record: { version: string; fields: unknown; provider: unknown; legal_text: string; number: string }) {
  return JSON.stringify([record.version, record.number, record.legal_text, record.fields, record.provider]);
}