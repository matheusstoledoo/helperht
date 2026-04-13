import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TrailStatus = "draft" | "active" | "paused" | "archived";
export type ContactPointType = 
  | "educational_message"
  | "open_question"
  | "closed_question"
  | "structured_data"
  | "reminder"
  | "professional_task";

export type StructuredDataType = 
  | "glucose"
  | "weight"
  | "blood_pressure"
  | "mood"
  | "pain_scale"
  | "adherence"
  | "custom_numeric"
  | "custom_text";

export interface CareTrail {
  id: string;
  professional_id: string;
  name: string;
  description: string | null;
  specialty: string | null;
  clinical_condition: string | null;
  clinical_objective: string | null;
  duration_days: number;
  status: TrailStatus;
  is_template: boolean;
  template_category: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
  contact_points_count?: number;
  active_enrollments_count?: number;
}

export interface TrailContactPoint {
  id: string;
  trail_id: string;
  day_offset: number;
  hour_of_day: number;
  minute_of_day: number;
  point_type: ContactPointType;
  title: string;
  message_content: string | null;
  structured_data_type: StructuredDataType | null;
  question_options: string[] | null;
  requires_response: boolean;
  reminder_hours_if_no_response: number | null;
  notify_professional_if_no_response: boolean;
  continue_if_no_response: boolean;
  critical_keywords: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrailConditionalRule {
  id: string;
  contact_point_id: string;
  condition_type: string;
  condition_value: string;
  action_type: string;
  action_config: Record<string, unknown>;
  created_at: string;
}

export interface TrailEnrollment {
  id: string;
  trail_id: string;
  patient_id: string;
  enrolled_by: string;
  status: "active" | "completed" | "paused" | "exited";
  started_at: string;
  completed_at: string | null;
  exited_at: string | null;
  exit_reason: string | null;
  current_day: number;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    user_id: string;
    users?: {
      name: string;
      email: string | null;
    };
  };
}

export const useCareTrails = () => {
  return useQuery({
    queryKey: ["care-trails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_trails")
        .select("*, trail_enrollments(id)")
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        has_enrollments: (t.trail_enrollments?.length || 0) > 0,
        trail_enrollments: undefined,
      })) as (CareTrail & { has_enrollments: boolean })[];
    },
  });
};

export const usePublishedTrails = () => {
  return useQuery({
    queryKey: ["care-trails-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_trails")
        .select("*")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as CareTrail[];
    },
  });
};

export const useCareTrailTemplates = () => {
  return useQuery({
    queryKey: ["care-trail-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_trails")
        .select("*")
        .eq("is_template", true)
        .order("template_category", { ascending: true });

      if (error) throw error;
      return data as CareTrail[];
    },
  });
};

export const useCareTrail = (trailId: string | undefined) => {
  return useQuery({
    queryKey: ["care-trail", trailId],
    queryFn: async () => {
      if (!trailId) return null;
      
      const { data, error } = await supabase
        .from("care_trails")
        .select("*")
        .eq("id", trailId)
        .single();

      if (error) throw error;
      return data as CareTrail;
    },
    enabled: !!trailId,
  });
};

export const useTrailContactPoints = (trailId: string | undefined) => {
  return useQuery({
    queryKey: ["trail-contact-points", trailId],
    queryFn: async () => {
      if (!trailId) return [];
      
      const { data, error } = await supabase
        .from("trail_contact_points")
        .select("*")
        .eq("trail_id", trailId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as TrailContactPoint[];
    },
    enabled: !!trailId,
  });
};

export const useTrailEnrollments = (trailId: string | undefined) => {
  return useQuery({
    queryKey: ["trail-enrollments", trailId],
    queryFn: async () => {
      if (!trailId) return [];
      
      const { data, error } = await supabase
        .from("trail_enrollments")
        .select(`
          *,
          patient:patients(
            id,
            user_id,
            users(name, email)
          )
        `)
        .eq("trail_id", trailId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TrailEnrollment[];
    },
    enabled: !!trailId,
  });
};

export const useCreateCareTrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trail: Partial<CareTrail> & { name: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const payload = {
        name: trail.name,
        professional_id: userData.user.id,
        description: trail.description || null,
        specialty: trail.specialty || null,
        clinical_condition: trail.clinical_condition || null,
        clinical_objective: trail.clinical_objective || null,
        duration_days: trail.duration_days ?? 30,
        status: trail.status ?? "draft",
        is_template: trail.is_template ?? false,
        template_category: trail.template_category || null,
        icon: trail.icon || null,
      };
      console.log("[CreateCareTrail] Inserindo trilha:", payload);

      const { data, error } = await supabase
        .from("care_trails")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("[CreateCareTrail] Erro ao criar trilha:", error);
        throw error;
      }
      console.log("[CreateCareTrail] Trilha criada:", data);
      return data as CareTrail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-trails"] });
      toast.success("Trilha criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar trilha: " + error.message);
    },
  });
};

export const useUpdateCareTrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CareTrail> & { id: string }) => {
      const { data, error } = await supabase
        .from("care_trails")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CareTrail;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["care-trails"] });
      queryClient.invalidateQueries({ queryKey: ["care-trail", data.id] });
      toast.success("Trilha atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar trilha: " + error.message);
    },
  });
};

export const useDeleteCareTrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trailId: string) => {
      const { error } = await supabase
        .from("care_trails")
        .delete()
        .eq("id", trailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-trails"] });
      toast.success("Trilha excluída!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir trilha: " + error.message);
    },
  });
};

export const useDuplicateCareTrail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trailId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Get original trail
      const { data: originalTrail, error: trailError } = await supabase
        .from("care_trails")
        .select("*")
        .eq("id", trailId)
        .single();

      if (trailError) throw trailError;

      // Create new trail
      const { data: newTrail, error: newTrailError } = await supabase
        .from("care_trails")
        .insert([{
          professional_id: userData.user.id,
          name: `${originalTrail.name} (Cópia)`,
          description: originalTrail.description,
          specialty: originalTrail.specialty,
          clinical_condition: originalTrail.clinical_condition,
          clinical_objective: originalTrail.clinical_objective,
          duration_days: originalTrail.duration_days,
          status: "draft" as TrailStatus,
          is_template: false,
          icon: originalTrail.icon,
        }])
        .select()
        .single();

      if (newTrailError) throw newTrailError;

      // Get original contact points
      const { data: originalPoints, error: pointsError } = await supabase
        .from("trail_contact_points")
        .select("*")
        .eq("trail_id", trailId);

      if (pointsError) throw pointsError;

      // Duplicate contact points
      if (originalPoints && originalPoints.length > 0) {
        const newPoints = originalPoints.map((point) => ({
          trail_id: newTrail.id,
          day_offset: point.day_offset,
          hour_of_day: point.hour_of_day,
          minute_of_day: point.minute_of_day,
          point_type: point.point_type,
          title: point.title,
          message_content: point.message_content,
          structured_data_type: point.structured_data_type,
          question_options: point.question_options,
          requires_response: point.requires_response,
          reminder_hours_if_no_response: point.reminder_hours_if_no_response,
          notify_professional_if_no_response: point.notify_professional_if_no_response,
          continue_if_no_response: point.continue_if_no_response,
          critical_keywords: point.critical_keywords,
          sort_order: point.sort_order,
        }));

        const { error: insertPointsError } = await supabase
          .from("trail_contact_points")
          .insert(newPoints);

        if (insertPointsError) throw insertPointsError;
      }

      return newTrail as CareTrail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care-trails"] });
      toast.success("Trilha duplicada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao duplicar trilha: " + error.message);
    },
  });
};

export const useCreateContactPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (point: Partial<TrailContactPoint> & { trail_id: string; title: string; point_type: ContactPointType }) => {
      const { data, error } = await supabase
        .from("trail_contact_points")
        .insert([{
          trail_id: point.trail_id,
          title: point.title,
          point_type: point.point_type,
          day_offset: point.day_offset ?? 0,
          hour_of_day: point.hour_of_day ?? 9,
          minute_of_day: point.minute_of_day ?? 0,
          message_content: point.message_content,
          structured_data_type: point.structured_data_type,
          question_options: point.question_options,
          requires_response: point.requires_response ?? false,
          reminder_hours_if_no_response: point.reminder_hours_if_no_response,
          notify_professional_if_no_response: point.notify_professional_if_no_response ?? false,
          continue_if_no_response: point.continue_if_no_response ?? true,
          critical_keywords: point.critical_keywords,
          sort_order: point.sort_order ?? 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as TrailContactPoint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trail-contact-points", data.trail_id] });
      toast.success("Ponto de contato adicionado!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar ponto: " + error.message);
    },
  });
};

export const useUpdateContactPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrailContactPoint> & { id: string }) => {
      const { data, error } = await supabase
        .from("trail_contact_points")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TrailContactPoint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trail-contact-points", data.trail_id] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar ponto: " + error.message);
    },
  });
};

export const useDeleteContactPoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trail_id }: { id: string; trail_id: string }) => {
      const { error } = await supabase
        .from("trail_contact_points")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { trail_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trail-contact-points", data.trail_id] });
      toast.success("Ponto de contato removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover ponto: " + error.message);
    },
  });
};

export const useEnrollPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trail_id, patient_id }: { trail_id: string; patient_id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const payload = {
        trail_id,
        patient_id,
        enrolled_by: userData.user.id,
      };
      console.log("[EnrollPatient] Inserindo enrollment:", payload);

      const { data, error } = await supabase
        .from("trail_enrollments")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("[EnrollPatient] Erro ao inserir enrollment:", error);
        throw error;
      }
      console.log("[EnrollPatient] Enrollment criado:", data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trail-enrollments", variables.trail_id] });
      queryClient.invalidateQueries({ queryKey: ["patient-enrollments", variables.patient_id] });
      toast.success("Paciente inscrito na trilha!");
    },
    onError: (error) => {
      toast.error("Erro ao inscrever paciente: " + error.message);
    },
  });
};

export const usePauseTrailEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, pause }: { enrollmentId: string; pause: boolean }) => {
      const { data, error } = await supabase
        .from("trail_enrollments")
        .update({ 
          status: pause ? "paused" : "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trail-enrollments", data.trail_id] });
      queryClient.invalidateQueries({ queryKey: ["patient-enrollments"] });
      toast.success(data.status === "paused" ? "Inscrição pausada!" : "Inscrição reativada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar inscrição: " + error.message);
    },
  });
};

export const useExitTrailEnrollment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, reason }: { enrollmentId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("trail_enrollments")
        .update({ 
          status: "exited",
          exited_at: new Date().toISOString(),
          exit_reason: reason || "Encerrado manualmente pelo profissional",
          updated_at: new Date().toISOString()
        })
        .eq("id", enrollmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trail-enrollments", data.trail_id] });
      queryClient.invalidateQueries({ queryKey: ["patient-enrollments"] });
      toast.success("Paciente removido da trilha!");
    },
    onError: (error) => {
      toast.error("Erro ao remover paciente: " + error.message);
    },
  });
};
