import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/dashboard/DashboardShell";
import {
  createGroup,
  createLevel,
  createModule,
  createProgram,
  createSkill,
  createSpecialization,
  deleteAcademicNode,
  getAcademicStructure,
} from "@/lib/academic.functions";

type NodeKind = "program" | "specialization" | "level" | "group" | "module" | "skill";

const programKinds: { value: string; label: string }[] = [
  { value: "program", label: "مسار / برنامج" },
  { value: "branch", label: "فرع" },
  { value: "stream", label: "شعبة" },
  { value: "track", label: "مسلك" },
  { value: "language", label: "تكوين لغوي" },
];

export function AcademicStructure({ readOnly = false }: { readOnly?: boolean }) {
  const queryClient = useQueryClient();
  const fetchStructure = useServerFn(getAcademicStructure);
  const addProgram = useServerFn(createProgram);
  const addSpecialization = useServerFn(createSpecialization);
  const addLevel = useServerFn(createLevel);
  const addGroup = useServerFn(createGroup);
  const addModule = useServerFn(createModule);
  const addSkill = useServerFn(createSkill);
  const removeNode = useServerFn(deleteAcademicNode);

  const structure = useQuery({
    queryKey: ["academic-structure"],
    queryFn: () => fetchStructure({ data: undefined as never }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academic-structure"] });

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      invalidate();
      toast.success("تم الحفظ في قاعدة البيانات.");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ العملية."),
  });

  const del = (kind: NodeKind, id: string) =>
    mutate.mutate(() => removeNode({ data: { kind, id } }));

  const [programForm, setProgramForm] = useState({ name: "", code: "", kind: "program" });
  const [specForm, setSpecForm] = useState({ name: "", programId: "" });
  const [levelForm, setLevelForm] = useState({ name: "", specializationId: "", orderIndex: "1" });
  const [groupForm, setGroupForm] = useState({ name: "", levelId: "", capacity: "" });
  const [moduleForm, setModuleForm] = useState({ name: "", levelId: "", coefficient: "1" });
  const [skillForm, setSkillForm] = useState({ name: "", moduleId: "" });

  const data = structure.data;
  const busy = mutate.isPending;

  if (structure.isLoading) {
    return <p className="text-sm text-muted-foreground">جارٍ تحميل البنية الأكاديمية…</p>;
  }

  const selectClass =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">البنية الأكاديمية للمؤسسة</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          بنية ديناميكية: مسار/فرع → تخصص → مستوى → فوج، ومواد ووحدات ومهارات. كل عنصر يُحفظ في
          قاعدة البيانات ضمن مؤسستك فقط.
        </p>
      </div>

      {/* Programs */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">المسارات والفروع والشعب</h3>
        {!readOnly && (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="prog-name">الاسم</Label>
              <Input
                id="prog-name"
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prog-code">الرمز</Label>
              <Input
                id="prog-code"
                value={programForm.code}
                onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prog-kind">النوع</Label>
              <select
                id="prog-kind"
                className={selectClass}
                value={programForm.kind}
                onChange={(e) => setProgramForm({ ...programForm, kind: e.target.value })}
              >
                {programKinds.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="self-end"
              disabled={busy || programForm.name.trim().length < 2}
              onClick={() =>
                mutate.mutate(async () => {
                  await addProgram({
                    data: {
                      name: programForm.name.trim(),
                      code: programForm.code.trim() || null,
                      kind: programForm.kind as never,
                    },
                  });
                  setProgramForm({ name: "", code: "", kind: "program" });
                })
              }
            >
              إضافة
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-border">
          {(data?.programs ?? []).map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">
                {p.name} {p.code ? <span className="text-muted-foreground">({p.code})</span> : null}
              </span>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => del("program", p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(data?.programs ?? []).length === 0 && (
          <EmptyState title="لا توجد مسارات بعد" description="أضف أول مسار أو فرع لمؤسستك." />
        )}
      </section>

      {/* Specializations */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">التخصصات</h3>
        {!readOnly && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="spec-name">اسم التخصص</Label>
              <Input
                id="spec-name"
                value={specForm.name}
                onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="spec-prog">المسار</Label>
              <select
                id="spec-prog"
                className={selectClass}
                value={specForm.programId}
                onChange={(e) => setSpecForm({ ...specForm, programId: e.target.value })}
              >
                <option value="">بدون مسار</option>
                {(data?.programs ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="self-end"
              disabled={busy || specForm.name.trim().length < 2}
              onClick={() =>
                mutate.mutate(async () => {
                  await addSpecialization({
                    data: {
                      name: specForm.name.trim(),
                      programId: specForm.programId || null,
                    },
                  });
                  setSpecForm({ name: "", programId: "" });
                })
              }
            >
              إضافة
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-border">
          {(data?.specializations ?? []).map((s: any) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">{s.name}</span>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => del("specialization", s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(data?.specializations ?? []).length === 0 && (
          <EmptyState title="لا توجد تخصصات بعد" description="أضف تخصصات مؤسستك." />
        )}
      </section>

      {/* Levels */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">المستويات</h3>
        {!readOnly && (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lvl-name">اسم المستوى</Label>
              <Input
                id="lvl-name"
                value={levelForm.name}
                onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lvl-spec">التخصص</Label>
              <select
                id="lvl-spec"
                className={selectClass}
                value={levelForm.specializationId}
                onChange={(e) => setLevelForm({ ...levelForm, specializationId: e.target.value })}
              >
                <option value="">بدون تخصص</option>
                {(data?.specializations ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lvl-order">الترتيب</Label>
              <Input
                id="lvl-order"
                type="number"
                min={1}
                value={levelForm.orderIndex}
                onChange={(e) => setLevelForm({ ...levelForm, orderIndex: e.target.value })}
              />
            </div>
            <Button
              className="self-end"
              disabled={busy || levelForm.name.trim().length < 1}
              onClick={() =>
                mutate.mutate(async () => {
                  await addLevel({
                    data: {
                      name: levelForm.name.trim(),
                      specializationId: levelForm.specializationId || null,
                      orderIndex: Number(levelForm.orderIndex) || 1,
                    },
                  });
                  setLevelForm({ name: "", specializationId: "", orderIndex: "1" });
                })
              }
            >
              إضافة
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-border">
          {(data?.levels ?? []).map((l: any) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">{l.name}</span>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => del("level", l.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(data?.levels ?? []).length === 0 && (
          <EmptyState title="لا توجد مستويات بعد" description="أضف مستويات التكوين." />
        )}
      </section>

      {/* Groups */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">الأفواج</h3>
        {!readOnly && (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="grp-name">اسم الفوج</Label>
              <Input
                id="grp-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="grp-level">المستوى</Label>
              <select
                id="grp-level"
                className={selectClass}
                value={groupForm.levelId}
                onChange={(e) => setGroupForm({ ...groupForm, levelId: e.target.value })}
              >
                <option value="">بدون مستوى</option>
                {(data?.levels ?? []).map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="grp-cap">الطاقة</Label>
              <Input
                id="grp-cap"
                type="number"
                min={1}
                value={groupForm.capacity}
                onChange={(e) => setGroupForm({ ...groupForm, capacity: e.target.value })}
              />
            </div>
            <Button
              className="self-end"
              disabled={busy || groupForm.name.trim().length < 1}
              onClick={() =>
                mutate.mutate(async () => {
                  await addGroup({
                    data: {
                      name: groupForm.name.trim(),
                      levelId: groupForm.levelId || null,
                      capacity: groupForm.capacity ? Number(groupForm.capacity) : null,
                    },
                  });
                  setGroupForm({ name: "", levelId: "", capacity: "" });
                })
              }
            >
              إضافة
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-border">
          {(data?.groups ?? []).map((g: any) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">{g.name}</span>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => del("group", g.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(data?.groups ?? []).length === 0 && (
          <EmptyState title="لا توجد أفواج بعد" description="أضف أفواج المتربصين." />
        )}
      </section>

      {/* Modules */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">المواد والوحدات (Modules)</h3>
        {!readOnly && (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="mod-name">اسم الوحدة</Label>
              <Input
                id="mod-name"
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mod-level">المستوى</Label>
              <select
                id="mod-level"
                className={selectClass}
                value={moduleForm.levelId}
                onChange={(e) => setModuleForm({ ...moduleForm, levelId: e.target.value })}
              >
                <option value="">بدون مستوى</option>
                {(data?.levels ?? []).map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mod-coef">المعامل</Label>
              <Input
                id="mod-coef"
                type="number"
                step="0.5"
                min={0.5}
                value={moduleForm.coefficient}
                onChange={(e) => setModuleForm({ ...moduleForm, coefficient: e.target.value })}
              />
            </div>
            <Button
              className="self-end"
              disabled={busy || moduleForm.name.trim().length < 1}
              onClick={() =>
                mutate.mutate(async () => {
                  await addModule({
                    data: {
                      name: moduleForm.name.trim(),
                      levelId: moduleForm.levelId || null,
                      coefficient: Number(moduleForm.coefficient) || 1,
                    },
                  });
                  setModuleForm({ name: "", levelId: "", coefficient: "1" });
                })
              }
            >
              إضافة
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-border">
          {(data?.modules ?? []).map((m: any) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">
                {m.name} <span className="text-muted-foreground">— معامل {m.coefficient}</span>
              </span>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => del("module", m.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(data?.modules ?? []).length === 0 && (
          <EmptyState title="لا توجد وحدات بعد" description="أضف وحدات التكوين." />
        )}
      </section>

      {/* Skills */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold">المهارات (Skills)</h3>
        {!readOnly && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="skl-name">اسم المهارة</Label>
              <Input
                id="skl-name"
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="skl-module">الوحدة</Label>
              <select
                id="skl-module"
                className={selectClass}
                value={skillForm.moduleId}
                onChange={(e) => setSkillForm({ ...skillForm, moduleId: e.target.value })}
              >
                <option value="">اختر وحدة</option>
                {(data?.modules ?? []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="self-end"
              disabled={busy || !skillForm.moduleId || skillForm.name.trim().length < 1}
              onClick={() =>
                mutate.mutate(async () => {
                  await addSkill({
                    data: { name: skillForm.name.trim(), moduleId: skillForm.moduleId },
                  });
                  setSkillForm({ name: "", moduleId: "" });
                })
              }
            >
              إضافة
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-border">
          {(data?.skills ?? []).map((s: any) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">{s.name}</span>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => del("skill", s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {(data?.skills ?? []).length === 0 && (
          <EmptyState title="لا توجد مهارات بعد" description="أضف مهارات مرتبطة بالوحدات." />
        )}
      </section>
    </div>
  );
}
