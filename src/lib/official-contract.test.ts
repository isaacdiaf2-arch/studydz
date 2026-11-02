import { describe, it, expect } from "vitest";
import { canonicalContract, sha256 } from "./contract-integrity";
import { contractFieldsSchema, signatureSchema } from "./official-contract.shared";

const fields = { institution_name: "مدرسة", legal_form: "مؤسسة", address: "الجزائر", institution_nif: "123", commercial_register: "456", manager_name: "المدير", manager_capacity: "مدير", contract_date: "2026-11-01", signing_place: "الجزائر" };
describe("Official contract invariants", () => {
  it("requires all variable fields before review", () => { expect(contractFieldsSchema.safeParse({ ...fields, institution_nif: "" }).success).toBe(false); });
  it("rejects caller supplied legal clauses", () => { expect(contractFieldsSchema.safeParse({ ...fields, legal_text: "changed" }).success).toBe(false); });
  it("requires explicit consent rather than only a drawing", () => { expect(signatureSchema.safeParse({ id: "d18597b7-8f63-43a8-ae84-1e5d802a83be", signature: "data:image/png;base64,YWJj", password: "secret", expected_hash: "a".repeat(64), consent: false }).success).toBe(false); });
  it("rejects a non-existent calendar date", () => { expect(contractFieldsSchema.safeParse({ ...fields, contract_date: "2026-02-30" }).success).toBe(false); });
  it("keeps the digest stable after database JSON key reordering", async () => {
    const a = { number: "SDZ-1", version: "v1", legal_text: "fixed", fields, provider: { nin: "1", nif: "2" } };
    const b = { ...a, fields: Object.fromEntries(Object.entries(fields).reverse()), provider: { nif: "2", nin: "1" } };
    expect(await sha256(canonicalContract(a))).toBe(await sha256(canonicalContract(b)));
  });
  it("detects any alteration in signed fields", async () => {
    const a = { number: "SDZ-1", version: "v1", legal_text: "fixed", fields, provider: {} };
    expect(await sha256(canonicalContract(a))).not.toBe(await sha256(canonicalContract({ ...a, fields: { ...fields, manager_name: "other" } })));
  });
  it("detects a changed final PDF byte", async () => { expect(await sha256(new Uint8Array([37,80,68,70]))).not.toBe(await sha256(new Uint8Array([37,80,68,71]))); });
});