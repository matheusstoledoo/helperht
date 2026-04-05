import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExtractedData {
  suggested_category: string;
  confidence_score: number;
  document_date: string | null;
  professional_name: string | null;
  professional_registry: string | null;
  specialty: string | null;
  institution: string | null;
  diagnoses: Array<{ name: string; icd_code: string | null }>;
  medications: Array<{ name: string; dose: string; posology: string; duration: string | null }>;
  lab_results: Array<{
    marker_name: string;
    value: number | string;
    unit: string;
    reference_min: number | null;
    reference_max: number | null;
    reference_text: string | null;
    category: string;
  }>;
  nutrition_data: {
    total_calories: number | null;
    carbs_grams: number | null;
    carbs_percent: number | null;
    protein_grams: number | null;
    protein_percent: number | null;
    fat_grams: number | null;
    fat_percent: number | null;
    meals: Array<{ name: string; time: string | null; foods: Array<{ item: string; quantity: string }> }>;
    restrictions: string[];
    supplements: Array<{ name: string; dose: string; timing: string }>;
  } | null;
  training_data: {
    sport: string | null;
    frequency_per_week: number | null;
    sessions: Array<{
      day: string;
      name: string;
      exercises: Array<{ name: string; sets: number | null; reps: string | null; load: string | null; rest: string | null }>;
    }>;
  } | null;
  raw_text_summary: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extraction_status: string;
  extracted_data: ExtractedData | null;
  suggested_category: string | null;
  confidence_score: number | null;
  document_date: string | null;
  professional_name: string | null;
  professional_registry: string | null;
  specialty: string | null;
  institution: string | null;
  error_message: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
  exame_laboratorial: "exame_laboratorial",
  exame_imagem: "exame_imagem",
  laudo: "laudo",
  receita: "receita",
  resumo_internacao: "resumo_internacao",
  prescricao_nutricional: "prescricao_nutricional",
  prescricao_treino: "prescricao_treino",
  prescricao_suplementacao: "prescricao_suplementacao",
  outros: "outros",
};

export function useDocumentExtraction() {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const uploadAndExtract = async (
    file: File,
    patientId: string,
    userId: string,
    userRole: string,
    userName: string,
    categoryHint?: string
  ) => {
    setIsUploading(true);
    setIsExtracting(false);
    setExtraction(null);
    setExtractedData(null);

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Create document record
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          patient_id: patientId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          category: categoryHint ? (CATEGORY_MAP[categoryHint] || "outros") : "outros",
          uploaded_by: userId,
          uploaded_by_role: userRole,
          is_public: true,
        })
        .select("id")
        .single();

      if (docError) throw docError;

      // 4. Create extraction record
      const { error: extractionError } = await supabase
        .from("document_extractions")
        .insert({
          document_id: docData.id,
          user_id: userId,
          extraction_status: "pending",
          suggested_category: categoryHint,
        });

      if (extractionError) throw extractionError;

      setIsUploading(false);
      setIsExtracting(true);

      // 5. Call extraction edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "extract-document",
        {
          body: {
            document_id: docData.id,
            file_path: fileName,
            file_type: file.type,
            category_hint: categoryHint,
          },
        }
      );

      if (fnError) throw fnError;

      // 6. Fetch the extraction result
      const { data: resultData } = await supabase
        .from("document_extractions")
        .select("*")
        .eq("document_id", docData.id)
        .single();

      if (resultData) {
        setExtraction(resultData as unknown as DocumentExtraction);
        setExtractedData(resultData.extracted_data as unknown as ExtractedData);
      }

      setIsExtracting(false);
      return { documentId: docData.id, extraction: resultData };
    } catch (error: any) {
      console.error("Upload/extract error:", error);
      setIsUploading(false);
      setIsExtracting(false);
      toast.error(error.message || "Erro ao processar documento");
      return null;
    }
  };

  const confirmExtraction = async (
    documentId: string,
    userId: string,
    patientId: string,
    data: ExtractedData,
    finalCategory: string
  ) => {
    try {
      // Update document category
      await supabase
        .from("documents")
        .update({ category: CATEGORY_MAP[finalCategory] || "outros" })
        .eq("id", documentId);

      // Mark extraction as confirmed
      await supabase
        .from("document_extractions")
        .update({
          extraction_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          extracted_data: data as any,
          suggested_category: finalCategory,
        })
        .eq("document_id", documentId);

      // Save lab results (sorted chronologically by collection_date)
      if (data.lab_results && data.lab_results.length > 0) {
        const collectionDate = data.document_date || new Date().toISOString().split("T")[0];
        const labRows = data.lab_results.map((lr) => ({
          user_id: userId,
          patient_id: patientId,
          document_id: documentId,
          marker_name: lr.marker_name,
          marker_category: lr.category || "other",
          value: typeof lr.value === "number" ? lr.value : null,
          value_text: typeof lr.value === "string" ? lr.value : null,
          unit: lr.unit,
          reference_min: lr.reference_min,
          reference_max: lr.reference_max,
          reference_text: lr.reference_text,
          collection_date: collectionDate,
          status: getLabStatus(lr.value, lr.reference_min, lr.reference_max),
        }));

        await supabase.from("lab_results").insert(labRows);
      }

      // Save nutrition plan
      if (data.nutrition_data && (data.nutrition_data.total_calories || data.nutrition_data.meals?.length)) {
        await supabase.from("nutrition_plans").insert({
          user_id: userId,
          patient_id: patientId,
          document_id: documentId,
          professional_name: data.professional_name,
          professional_registry: data.professional_registry,
          total_calories: data.nutrition_data.total_calories,
          carbs_grams: data.nutrition_data.carbs_grams,
          carbs_percent: data.nutrition_data.carbs_percent,
          protein_grams: data.nutrition_data.protein_grams,
          protein_percent: data.nutrition_data.protein_percent,
          fat_grams: data.nutrition_data.fat_grams,
          fat_percent: data.nutrition_data.fat_percent,
          meals: data.nutrition_data.meals as any,
          restrictions: data.nutrition_data.restrictions,
          supplements: data.nutrition_data.supplements as any,
        });
      }

      // Save training plan
      if (data.training_data && data.training_data.sessions?.length) {
        await supabase.from("training_plans").insert({
          user_id: userId,
          patient_id: patientId,
          document_id: documentId,
          professional_name: data.professional_name,
          professional_registry: data.professional_registry,
          sport: data.training_data.sport,
          frequency_per_week: data.training_data.frequency_per_week,
          sessions: data.training_data.sessions as any,
        });
      }

      toast.success("Documento processado e dados salvos com sucesso! 🎉");
      return true;
    } catch (error: any) {
      console.error("Confirm extraction error:", error);
      toast.error("Erro ao salvar dados extraídos");
      return false;
    }
  };

  const reset = () => {
    setIsUploading(false);
    setIsExtracting(false);
    setExtraction(null);
    setExtractedData(null);
  };

  return {
    isUploading,
    isExtracting,
    extraction,
    extractedData,
    setExtractedData,
    uploadAndExtract,
    confirmExtraction,
    reset,
  };
}

function getLabStatus(
  value: number | string,
  refMin: number | null,
  refMax: number | null
): string {
  if (typeof value !== "number" || (refMin === null && refMax === null)) return "normal";
  if (refMin !== null && value < refMin) return "abnormal";
  if (refMax !== null && value > refMax) return "abnormal";
  if (refMin !== null && value < refMin * 1.1) return "attention";
  if (refMax !== null && value > refMax * 0.9) return "attention";
  return "normal";
}
