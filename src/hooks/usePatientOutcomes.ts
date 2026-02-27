import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PatientOutcome {
  id: string;
  patient_id: string;
  enrollment_id: string | null;
  recorded_by: string;
  outcome_type: string;
  outcome_date: string;
  severity: string | null;
  description: string | null;
  clinical_context: string | null;
  structured_data: Record<string, unknown>;
  fhir_resource_type: string | null;
  fhir_code_system: string | null;
  fhir_code: string | null;
  related_diagnosis_id: string | null;
  related_treatment_id: string | null;
  created_at: string;
  recorded_by_user?: { name: string } | null;
  enrollment?: { trail: { name: string } | null } | null;
  related_diagnosis?: { name: string } | null;
  related_treatment?: { name: string } | null;
}

export const OUTCOME_TYPES = [
  { value: "discharge", label: "Alta Clínica", icon: "🏠" },
  { value: "complication", label: "Complicação", icon: "⚠️" },
  { value: "reoperation", label: "Nova Intervenção", icon: "🔄" },
  { value: "hospitalization", label: "Internação", icon: "🏥" },
  { value: "functional_improvement", label: "Melhora Funcional", icon: "📈" },
  { value: "relapse", label: "Recidiva", icon: "🔁" },
  { value: "stable", label: "Quadro Estável", icon: "➡️" },
  { value: "worsening", label: "Piora do Quadro", icon: "📉" },
  { value: "nutritional_improvement", label: "Melhora Nutricional", icon: "🥗" },
  { value: "nutritional_goal", label: "Meta Nutricional Atingida", icon: "🎯" },
  { value: "psychological_improvement", label: "Melhora Psicológica", icon: "🧠" },
  { value: "therapy_milestone", label: "Marco Terapêutico", icon: "💬" },
  { value: "physical_rehab_progress", label: "Progresso na Reabilitação", icon: "🏋️" },
  { value: "mobility_improvement", label: "Melhora da Mobilidade", icon: "🚶" },
  { value: "pain_reduction", label: "Redução da Dor", icon: "💊" },
  { value: "treatment_completed", label: "Tratamento Concluído", icon: "✅" },
  { value: "end_of_life_care", label: "Cuidados Paliativos", icon: "🕊️" },
] as const;

export const SEVERITY_LEVELS = [
  { value: "mild", label: "Leve" },
  { value: "moderate", label: "Moderado" },
  { value: "severe", label: "Grave" },
  { value: "critical", label: "Crítico" },
] as const;

export const usePatientOutcomes = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-outcomes", patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from("patient_outcomes")
        .select(`
          *,
          recorded_by_user:users!patient_outcomes_recorded_by_fkey(name),
          enrollment:trail_enrollments(
            trail:care_trails(name)
          ),
          related_diagnosis:diagnoses(name),
          related_treatment:treatments(name)
        `)
        .eq("patient_id", patientId)
        .order("outcome_date", { ascending: false });

      if (error) throw error;
      return (data || []) as PatientOutcome[];
    },
    enabled: !!patientId,
  });
};

export const useCreatePatientOutcome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outcome: {
      patient_id: string;
      enrollment_id?: string | null;
      outcome_type: string;
      outcome_date: string;
      severity?: string | null;
      description?: string | null;
      clinical_context?: string | null;
      structured_data?: Record<string, unknown>;
      related_diagnosis_id?: string | null;
      related_treatment_id?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const insertData = {
        patient_id: outcome.patient_id,
        outcome_type: outcome.outcome_type,
        outcome_date: outcome.outcome_date,
        recorded_by: userData.user.id,
        severity: outcome.severity ?? null,
        description: outcome.description ?? null,
        clinical_context: outcome.clinical_context ?? null,
        enrollment_id: outcome.enrollment_id ?? null,
        related_diagnosis_id: outcome.related_diagnosis_id ?? null,
        related_treatment_id: outcome.related_treatment_id ?? null,
        structured_data: (outcome.structured_data || {}) as unknown as import("@/integrations/supabase/types").Json,
      };

      const { data, error } = await supabase
        .from("patient_outcomes")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patient-outcomes", data.patient_id] });
      toast.success("Desfecho registrado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar desfecho: " + error.message);
    },
  });
};
