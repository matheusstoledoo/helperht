import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export interface TrailTaskInstance {
  id: string;
  enrollment_id: string;
  contact_point_id: string;
  patient_id: string;
  professional_id: string;
  scheduled_date: string;
  scheduled_time: string;
  title: string;
  description: string | null;
  action_category: string;
  status: "pending" | "completed" | "postponed" | "ignored";
  completed_at: string | null;
  postponed_to: string | null;
  ignored_at: string | null;
  ignore_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithPatient extends TrailTaskInstance {
  patient_name?: string;
  patient_email?: string | null;
  trail_name?: string;
}

export const useTodayTasks = () => {
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["trail-tasks-today", today],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      // Fetch tasks for today
      const { data: tasks, error } = await supabase
        .from("trail_task_instances")
        .select("*")
        .eq("professional_id", userData.user.id)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });

      if (error) throw error;

      // Fetch patient names and trail names
      if (!tasks || tasks.length === 0) return [];

      const patientIds = [...new Set(tasks.map(t => t.patient_id))];
      const enrollmentIds = [...new Set(tasks.map(t => t.enrollment_id))];

      const [patientsResult, enrollmentsResult] = await Promise.all([
        supabase
          .from("patients")
          .select("id, users(name, email)")
          .in("id", patientIds),
        supabase
          .from("trail_enrollments")
          .select("id, trail_id, care_trails(name)")
          .in("id", enrollmentIds),
      ]);

      const patientMap = new Map(
        (patientsResult.data || []).map((p: any) => [p.id, p.users])
      );
      const enrollmentMap = new Map(
        (enrollmentsResult.data || []).map((e: any) => [e.id, e.care_trails?.name])
      );

      return tasks.map((task): TaskWithPatient => ({
        ...task,
        status: task.status as TaskWithPatient["status"],
        patient_name: patientMap.get(task.patient_id)?.name,
        patient_email: patientMap.get(task.patient_id)?.email,
        trail_name: enrollmentMap.get(task.enrollment_id),
      }));
    },
  });
};

export const usePendingTasksCount = () => {
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["trail-tasks-pending-count", today],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return 0;

      const { count, error } = await supabase
        .from("trail_task_instances")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", userData.user.id)
        .eq("scheduled_date", today)
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("trail_task_instances")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-today"] });
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-pending-count"] });
      toast.success("Tarefa concluída!");
    },
    onError: (error) => {
      toast.error("Erro ao concluir tarefa: " + error.message);
    },
  });
};

export const usePostponeTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, postponeTo }: { taskId: string; postponeTo: string }) => {
      const { data, error } = await supabase
        .from("trail_task_instances")
        .update({
          status: "postponed",
          postponed_to: postponeTo,
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;

      // Create a new task for the postponed date
      const { error: insertError } = await supabase
        .from("trail_task_instances")
        .insert({
          enrollment_id: data.enrollment_id,
          contact_point_id: data.contact_point_id,
          patient_id: data.patient_id,
          professional_id: data.professional_id,
          scheduled_date: postponeTo,
          scheduled_time: data.scheduled_time,
          title: data.title,
          description: data.description,
          action_category: data.action_category,
        });

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-today"] });
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-pending-count"] });
      toast.success("Tarefa adiada!");
    },
    onError: (error) => {
      toast.error("Erro ao adiar tarefa: " + error.message);
    },
  });
};

export const useIgnoreTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("trail_task_instances")
        .update({
          status: "ignored",
          ignored_at: new Date().toISOString(),
          ignore_reason: reason,
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-today"] });
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-pending-count"] });
      toast.success("Tarefa ignorada (registrada no log).");
    },
    onError: (error) => {
      toast.error("Erro ao ignorar tarefa: " + error.message);
    },
  });
};

/**
 * Generate task instances for an enrollment based on trail contact points.
 * Called after enrolling a patient in a trail.
 */
export const useGenerateTaskInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, trailId, patientId }: {
      enrollmentId: string;
      trailId: string;
      patientId: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      // Get contact points for the trail
      const { data: contactPoints, error: cpError } = await supabase
        .from("trail_contact_points")
        .select("*")
        .eq("trail_id", trailId)
        .order("sort_order", { ascending: true });

      if (cpError) throw cpError;
      if (!contactPoints || contactPoints.length === 0) return [];

      // Get trail duration
      const { data: trail, error: trailError } = await supabase
        .from("care_trails")
        .select("duration_days")
        .eq("id", trailId)
        .single();

      if (trailError) throw trailError;

      const today = new Date();
      const tasks: any[] = [];

      for (const cp of contactPoints) {
        const recType = cp.recurrence_type || "once";
        const interval = cp.recurrence_interval || 1;
        const daysOfWeek: number[] = cp.recurrence_days_of_week || [];
        const maxOccurrences = cp.recurrence_max_occurrences;
        const endDateStr = cp.recurrence_end_date;
        const startDayOffset = cp.day_offset || 0;
        const scheduledTime = `${String(cp.hour_of_day).padStart(2, '0')}:${String(cp.minute_of_day).padStart(2, '0')}:00`;

        let occurrenceCount = 0;
        const maxDays = trail.duration_days;

        for (let dayOffset = startDayOffset; dayOffset <= maxDays; dayOffset++) {
          if (maxOccurrences && occurrenceCount >= maxOccurrences) break;

          const taskDate = new Date(today);
          taskDate.setDate(taskDate.getDate() + dayOffset);

          if (endDateStr && taskDate > new Date(endDateStr)) break;

          let shouldAdd = false;

          if (recType === "once") {
            shouldAdd = dayOffset === startDayOffset;
          } else if (recType === "daily") {
            shouldAdd = (dayOffset - startDayOffset) % interval === 0;
          } else if (recType === "weekly") {
            const dayOfWeek = taskDate.getDay();
            if (daysOfWeek.length > 0) {
              shouldAdd = daysOfWeek.includes(dayOfWeek) && (dayOffset - startDayOffset) % (interval * 7) < 7;
            } else {
              shouldAdd = (dayOffset - startDayOffset) % (interval * 7) === 0;
            }
          } else if (recType === "monthly") {
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() + startDayOffset);
            const monthsDiff = (taskDate.getFullYear() - startDate.getFullYear()) * 12 + taskDate.getMonth() - startDate.getMonth();
            shouldAdd = monthsDiff % interval === 0 && taskDate.getDate() === startDate.getDate();
          } else if (recType === "custom") {
            if (daysOfWeek.length > 0) {
              shouldAdd = daysOfWeek.includes(taskDate.getDay());
            } else {
              shouldAdd = (dayOffset - startDayOffset) % interval === 0;
            }
          }

          if (shouldAdd) {
            tasks.push({
              enrollment_id: enrollmentId,
              contact_point_id: cp.id,
              patient_id: patientId,
              professional_id: userData.user.id,
              scheduled_date: format(taskDate, "yyyy-MM-dd"),
              scheduled_time: scheduledTime,
              title: cp.title,
              description: cp.message_content,
              action_category: cp.action_category || "communication",
            });
            occurrenceCount++;
          }
        }
      }

      console.log(`[GenerateTaskInstances] Gerando ${tasks.length} tarefas para enrollment ${enrollmentId}`);
      if (tasks.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < tasks.length; i += 100) {
          const batch = tasks.slice(i, i + 100);
          console.log(`[GenerateTaskInstances] Inserindo batch ${i / 100 + 1} com ${batch.length} tarefas`);
          const { error } = await supabase
            .from("trail_task_instances")
            .insert(batch);
          if (error) {
            console.error("[GenerateTaskInstances] Erro ao inserir tarefas:", error);
            throw error;
          }
        }
      }

      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-today"] });
      queryClient.invalidateQueries({ queryKey: ["trail-tasks-pending-count"] });
    },
    onError: (error) => {
      console.error("Error generating tasks:", error);
      toast.error("Erro ao gerar tarefas da trilha: " + error.message);
    },
  });
};
