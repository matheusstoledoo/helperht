import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PatientContext {
  id: string;
  age?: number;
  sex?: string;
  diagnoses: Array<{ name: string; icd_code?: string }>;
  treatments: Array<{ name: string; dosage?: string }>;
  comorbidities?: string[];
}

interface StudyDesignDetails {
  design?: string;
  population?: string;
  intervention?: string;
  comparison?: string;
  outcomes?: string[];
  sample_size?: string;
  follow_up?: string;
}

interface ApplicabilityFactors {
  population?: { score?: string; justification?: string };
  intervention?: { score?: string; justification?: string };
  setting?: { score?: string; justification?: string };
}

export interface QualityAnalysis {
  id: string;
  evidence_result_id: string;
  patient_id: string;
  analyzed_by: string;
  full_text_available: boolean;
  full_text_source: string | null;
  pmc_id: string | null;
  study_type_detected: string;
  study_design_details: StudyDesignDetails;
  methodology_quality: "high" | "moderate" | "low" | "critically_low";
  methodology_score: number;
  methodology_checklist: Record<string, { met: boolean; justification: string }>;
  methodology_summary: string;
  bias_risk: "low" | "some_concerns" | "high" | "serious" | "critical";
  bias_domains: Record<string, { risk: string; justification: string }>;
  bias_summary: string;
  evidence_certainty: "high" | "moderate" | "low" | "very_low";
  grade_factors: Record<string, { concern: string; justification: string }>;
  evidence_summary: string;
  applicability: "high" | "moderate" | "low";
  applicability_factors: ApplicabilityFactors;
  applicability_summary: string;
  overall_recommendation: string;
  strengths: string[];
  limitations: string[];
  llm_model_used: string;
  processing_duration_ms: number;
  created_at: string;
  updated_at: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis?: QualityAnalysis;
  cached?: boolean;
  processingTime?: number;
  error?: string;
}

export const useEvidenceQualityAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<QualityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeEvidence = async (
    evidenceResultId: string,
    patientId: string,
    patientContext: PatientContext
  ): Promise<QualityAnalysis | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log("[QualityAnalysis] Starting analysis for result:", evidenceResultId);

      const { data, error: invokeError } = await supabase.functions.invoke(
        "analyze-evidence-quality",
        {
          body: {
            evidenceResultId,
            patientId,
            patientContext,
          },
        }
      );

      if (invokeError) {
        console.error("[QualityAnalysis] Function error:", invokeError);
        throw new Error(invokeError.message || "Falha ao analisar evidência");
      }

      const response = data as AnalysisResponse;

      if (!response.success) {
        throw new Error(response.error || "Falha ao analisar evidência");
      }

      const analysisResult = response.analysis!;
      setAnalysis(analysisResult);

      if (response.cached) {
        toast.info("Análise carregada do cache", {
          description: "Esta evidência já foi analisada anteriormente.",
        });
      } else {
        toast.success("Análise concluída", {
          description: `Análise realizada em ${(response.processingTime! / 1000).toFixed(1)}s`,
        });
      }

      return analysisResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[QualityAnalysis] Error:", errorMessage);
      setError(errorMessage);

      toast.error("Erro na análise de qualidade", {
        description: errorMessage,
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAnalysis = async (
    evidenceResultId: string,
    patientId: string
  ): Promise<QualityAnalysis | null> => {
    try {
      const { data, error } = await supabase
        .from("evidence_quality_analyses")
        .select("*")
        .eq("evidence_result_id", evidenceResultId)
        .eq("patient_id", patientId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as unknown as QualityAnalysis;
    } catch (err) {
      console.error("[QualityAnalysis] Error fetching existing:", err);
      return null;
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
  };

  return {
    analyzeEvidence,
    fetchExistingAnalysis,
    clearAnalysis,
    loading,
    analysis,
    error,
  };
};
