import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheSchedules, readCachedSchedules, type ScheduleRow } from "@/lib/schedule";

/**
 * جدول العضو (أستاذ أو طالب) مع دعم وضع عدم الاتصال 24 ساعة (للعرض فقط).
 */
export function useScheduleView(params: {
  institutionId?: string;
  teacherId?: string;
  classIds?: string[];
  cacheKey: string;
}) {
  const { institutionId, teacherId, classIds, cacheKey } = params;
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const [fallback, setFallback] = useState<ScheduleRow[] | null>(null);

  const query = useQuery({
    queryKey: ["schedule-view", cacheKey, institutionId, teacherId, classIds?.join(",")],
    enabled: !!institutionId,
    queryFn: async () => {
      let q = supabase
        .from("schedules")
        .select("*, classes(name), subjects(name), rooms(name)")
        .eq("institution_id", institutionId!)
        .eq("archived", false)
        .order("day_of_week")
        .order("start_time");
      if (teacherId) q = q.eq("teacher_id", teacherId);
      if (classIds && classIds.length > 0) q = q.in("class_id", classIds);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as ScheduleRow[];
      cacheSchedules(cacheKey, rows);
      return rows;
    },
  });

  const directoryFn = useServerFn(listInstitutionDirectory);
  const teachersQuery = useQuery({
    queryKey: ["schedule-view", "teachers", institutionId],
    enabled: !!institutionId,
    queryFn: async () => await directoryFn(),
  });


  useEffect(() => {
    if (query.isError && !fallback) {
      const cached = readCachedSchedules<ScheduleRow[]>(cacheKey);
      if (cached) {
        setFallback(cached.rows);
        setOfflineAt(cached.at);
      }
    }
  }, [query.isError, fallback, cacheKey]);

  const teacherNames = useMemo(
    () =>
      Object.fromEntries(
        (teachersQuery.data ?? []).map((t) => [t.id, `${t.first_name} ${t.last_name}`]),
      ) as Record<string, string>,
    [teachersQuery.data],
  );

  return {
    rows: query.data ?? fallback ?? [],
    teacherNames,
    offlineAt,
    isLoading: query.isLoading,
  };
}
