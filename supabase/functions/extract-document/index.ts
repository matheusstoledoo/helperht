import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, file_path, file_type, category_hint } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update extraction status to processing
    await supabase
      .from("document_extractions")
      .update({ extraction_status: "processing" })
      .eq("document_id", document_id);

    // Download the file from private storage using service role
    console.log("Downloading file from storage:", file_path);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("patient-documents")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      await supabase
        .from("document_extractions")
        .update({
          extraction_status: "failed",
          error_message: "Não foi possível acessar o arquivo no armazenamento.",
        })
        .eq("document_id", document_id);
      return new Response(
        JSON.stringify({ error: "Failed to download file from storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64 for the AI
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Data = base64Encode(uint8Array.buffer);

    console.log("File downloaded, size:", uint8Array.length, "bytes, type:", file_type);

    // Build the prompt based on document type
    const systemPrompt = `You are a medical document extraction AI for a Brazilian healthcare app. 
You MUST respond in valid JSON only, no markdown, no explanation.

Analyze the document and extract structured data. The document may be in Portuguese.

Return this exact JSON structure:
{
  "suggested_category": "one of: exame_laboratorial, exame_imagem, laudo, receita, resumo_internacao, prescricao_nutricional, prescricao_treino, prescricao_suplementacao, outros",
  "confidence_score": 0.0 to 1.0,
  "document_date": "YYYY-MM-DD or null",
  "professional_name": "string or null",
  "professional_registry": "CRM/CRN/CREF number or null",
  "specialty": "string or null", 
  "institution": "string or null",
  "diagnoses": [{"name": "string", "icd_code": "string or null"}],
  "medications": [{"name": "string", "dose": "string", "posology": "string", "duration": "string or null"}],
  "lab_results": [{"marker_name": "string", "value": "number or string", "unit": "string", "reference_min": "number or null", "reference_max": "number or null", "reference_text": "string or null", "category": "hemograma|bioquimica|lipidico|tireoide|inflamatorios|hormonal|other"}],
  "nutrition_data": {"total_calories": "number or null", "carbs_grams": "number or null", "carbs_percent": "number or null", "protein_grams": "number or null", "protein_percent": "number or null", "fat_grams": "number or null", "fat_percent": "number or null", "meals": [{"name": "string", "time": "string or null", "foods": [{"item": "string", "quantity": "string"}]}], "restrictions": ["string"], "supplements": [{"name": "string", "dose": "string", "timing": "string"}]},
  "training_data": {"sport": "string or null", "frequency_per_week": "number or null", "sessions": [{"day": "string", "name": "string", "exercises": [{"name": "string", "sets": "number or null", "reps": "string or null", "load": "string or null", "rest": "string or null"}]}]},
  "raw_text_summary": "brief summary of the document content in Portuguese, max 200 chars"
}

If a section is not applicable, return empty arrays or null values. Always try to extract as much as possible.`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Extract data from this ${category_hint || "medical"} document. File type: ${file_type}`,
      },
    ];

    // Determine the MIME type for the AI
    const mimeType = file_type || "application/octet-stream";

    if (mimeType.startsWith("image/")) {
      // Send image inline as base64
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Data}` },
      });
    } else if (mimeType === "application/pdf") {
      // Send PDF as inline data for Gemini (supports PDF natively)
      userContent.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${base64Data}` },
      });
    } else {
      // For other types, try to send as text
      const textDecoder = new TextDecoder();
      const textContent = textDecoder.decode(uint8Array);
      userContent.push({
        type: "text",
        text: `Document content:\n${textContent.substring(0, 50000)}`,
      });
    }

    console.log("Calling AI gateway...");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        await supabase
          .from("document_extractions")
          .update({
            extraction_status: "failed",
            error_message: "Taxa de requisições excedida. Tente novamente em alguns minutos.",
          })
          .eq("document_id", document_id);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        await supabase
          .from("document_extractions")
          .update({
            extraction_status: "failed",
            error_message: "Créditos de IA insuficientes.",
          })
          .eq("document_id", document_id);
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    console.log("AI response received, parsing...");

    // Parse the JSON from AI response
    let extracted;
    try {
      // Remove potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      await supabase
        .from("document_extractions")
        .update({
          extraction_status: "failed",
          error_message: "Não foi possível interpretar o documento. Tente novamente ou preencha manualmente.",
          raw_text: content,
        })
        .eq("document_id", document_id);

      return new Response(
        JSON.stringify({ error: "Failed to parse extraction", raw: content }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save extraction results
    await supabase
      .from("document_extractions")
      .update({
        extraction_status: "completed",
        extracted_data: extracted,
        suggested_category: extracted.suggested_category || category_hint,
        confidence_score: extracted.confidence_score || 0.5,
        document_date: extracted.document_date,
        professional_name: extracted.professional_name,
        professional_registry: extracted.professional_registry,
        specialty: extracted.specialty,
        institution: extracted.institution,
        raw_text: extracted.raw_text_summary,
      })
      .eq("document_id", document_id);

    // Auto-insert lab_results if category is exame_laboratorial
    if (
      Array.isArray(extracted.lab_results) &&
      extracted.lab_results.length > 0 &&
      extracted.suggested_category === "exame_laboratorial"
    ) {
      // Fetch patient_id and uploaded_by from documents table
      const { data: docRow } = await supabase
        .from("documents")
        .select("patient_id, uploaded_by")
        .eq("id", document_id)
        .single();

      let patientId = docRow?.patient_id ?? null;
      let userId = docRow?.uploaded_by ?? null;

      // Fallback: fetch from document_extractions
      if (!patientId || !userId) {
        const { data: extRow } = await supabase
          .from("document_extractions")
          .select("user_id")
          .eq("document_id", document_id)
          .single();
        if (!userId && extRow?.user_id) userId = extRow.user_id;
      }

      const collectionDate = extracted.document_date || new Date().toISOString().split("T")[0];

      const MARKER_NAMES: Record<string, string> = {
        "glucose": "Glicose", "glicemia": "Glicose", "blood glucose": "Glicose", "fasting glucose": "Glicose",
        "total cholesterol": "Colesterol Total", "cholesterol": "Colesterol Total",
        "ldl cholesterol": "LDL", "ldl-c": "LDL", "hdl cholesterol": "HDL", "hdl-c": "HDL",
        "triglycerides": "Triglicerídeos", "triglyceride": "Triglicerídeos",
        "hemoglobin": "Hemoglobina", "haemoglobin": "Hemoglobina",
        "hba1c": "Hemoglobina Glicada", "hemoglobin a1c": "Hemoglobina Glicada", "glycated hemoglobin": "Hemoglobina Glicada",
        "creatinine": "Creatinina", "urea": "Ureia", "uric acid": "Ácido Úrico",
        "tsh": "TSH", "t4": "T4 Livre", "free t4": "T4 Livre", "t3": "T3",
        "vitamin d": "Vitamina D", "25-oh vitamin d": "Vitamina D",
        "ferritin": "Ferritina", "iron": "Ferro",
        "crp": "PCR", "c-reactive protein": "PCR",
        "sodium": "Sódio", "potassium": "Potássio", "calcium": "Cálcio", "magnesium": "Magnésio",
        "albumin": "Albumina", "ast": "AST (TGO)", "alt": "ALT (TGP)", "ggt": "GGT",
        "alkaline phosphatase": "Fosfatase Alcalina",
        "platelets": "Plaquetas", "platelet count": "Plaquetas", "hematocrit": "Hematócrito",
        "wbc": "Leucócitos", "white blood cells": "Leucócitos",
        "rbc": "Hemácias", "red blood cells": "Hemácias",
        "insulin": "Insulina", "cortisol": "Cortisol",
        "testosterone": "Testosterona", "estradiol": "Estradiol", "progesterone": "Progesterona",
        "vitamin b12": "Vitamina B12", "folic acid": "Ácido Fólico", "folate": "Ácido Fólico",
      };

      function normalizeMarkerName(name: string): string {
        const key = name.toLowerCase().trim();
        return MARKER_NAMES[key] || name;
      }

      const labRows = extracted.lab_results
        .filter((item: any) => {
          if (item.value == null || item.value === "") return false;
          return !isNaN(parseFloat(item.value));
        })
        .map((item: any) => {
          const numValue = parseFloat(item.value);
          const refMin = item.reference_min != null ? parseFloat(item.reference_min) : null;
          const refMax = item.reference_max != null ? parseFloat(item.reference_max) : null;

          let status: string | null = null;
          if (refMin !== null && refMax !== null) {
            if (numValue > refMax) status = "high";
            else if (numValue < refMin) status = "low";
            else status = "normal";
          }

          return {
            document_id,
            patient_id: patientId,
            user_id: userId,
            marker_name: normalizeMarkerName(item.marker_name),
            value: numValue,
            value_text: String(item.value),
            unit: item.unit || null,
            reference_min: isNaN(refMin as number) ? null : refMin,
            reference_max: isNaN(refMax as number) ? null : refMax,
            reference_text: item.reference_text || null,
            marker_category: item.category || "other",
            collection_date: collectionDate,
            lab_name: extracted.institution || null,
            status,
          };
        });

      const { error: labError } = await supabase
        .from("lab_results")
        .upsert(labRows, { onConflict: "document_id,marker_name" });

      if (labError) {
        console.error("Error inserting lab_results:", labError);
      } else {
        console.log("lab_results inseridos:", labRows.length);
      }
    }

    console.log("Extraction completed successfully for document:", document_id);

    return new Response(
      JSON.stringify({ success: true, extraction: extracted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extract document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
