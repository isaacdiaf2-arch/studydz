import { describe, expect, it } from "vitest";
import { canTakeQuiz, gradeQuiz } from "./quiz.service";

const scope = { studentId: "s", institutionId: "I1", groupIds: new Set(["gA"]), moduleIds: new Set(["mA"]) };
const quiz = { kind: "quiz", published: true, exam_id: "e", institution_id: "I1", group_id: "gA", module_id: "mA" };

describe("quiz scope", () => {
  it("allows own group and module", () => expect(canTakeQuiz(scope, quiz)).toBe(true));
  it("denies another group (Group A → Group B)", () => expect(canTakeQuiz(scope, { ...quiz, group_id: "gB" })).toBe(false));
  it("denies another subject (Subject A → Subject B)", () => expect(canTakeQuiz(scope, { ...quiz, module_id: "mB" })).toBe(false));
  it("denies another institution", () => expect(canTakeQuiz(scope, { ...quiz, institution_id: "I2" })).toBe(false));
  it("denies unpublished", () => expect(canTakeQuiz(scope, { ...quiz, published: false })).toBe(false));
});

describe("quiz grading", () => {
  const qs = [
    { id: "q1", points: 2, options: [{ id: "a", is_correct: true }, { id: "b", is_correct: false }] },
    { id: "q2", points: 1, options: [{ id: "c", is_correct: true }] },
  ];
  it("scores correct answers only", () => expect(gradeQuiz(qs, { q1: "a", q2: null })).toMatchObject({ score: 2, maxScore: 3 }));
  it("ignores an option id from another question", () => expect(gradeQuiz(qs, { q1: "c" }).score).toBe(0));
});
