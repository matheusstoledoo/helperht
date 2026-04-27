import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MARKER_NAMES: Record<string, string> = {
  "glucose": "Glicose", "glicemia": "Glicose", "blood glucose": "Glicose", "fasting glucose": "Glicose",
  "total cholesterol": "Colesterol Total", "cholesterol": "Colesterol Total",
  "ldl cholesterol": "LDL", "ldl-c": "LDL", "hdl cholesterol": "HDL", "hdl-c": "HDL",
  "triglycerides": "Triglicerídeos", "triglyceride": "Triglicerídeos",
  "hemoglobin": "Hemoglobina", "haemoglobin": "Hemoglobina",
  "hba1c": "Hemoglobina Glicada", "hemoglobin a1c": "Hemoglobina Glicada",
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

// Tenta parsear JSON com limpeza progressiva
function parseJSON(raw: string): any {
  const attempts = [
    raw.trim(),
    raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim(),
    raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
  ];
  for (const attempt of attempts) {
    try { return JSON.parse(attempt); } catch { continue; }
  }
  throw new Error("JSON inválido após todas as tentativas de limpeza");
}

// Chama Claude com retry automático em caso de JSON malformado
async function callClaude(
  apiKey: string,
  messages: any[],
  systemPrompt: string,
  attempt = 1
): Promise<any> {
  const model = "claude-opus-4-6";
  const bodyStr = JSON.stringify({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages,
  });

  console.log("chamando Claude API", {
    model,
    contentLength: bodyStr.length,
    attempt,
  });

  // Timeout explícito de 90s para PDFs com múltiplas páginas
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: bodyStr,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr?.name === "AbortError") {
      throw new Error("Claude API timeout após 90 segundos");
    }
    throw fetchErr;
  }
  clearTimeout(timeoutId);

  console.log("resposta Claude recebida", { status: response.status });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  try {
    return parseJSON(content);
  } catch (e) {
    // Uma segunda tentativa pedindo correção do JSON
    if (attempt < 2) {
      console.warn("JSON malformado na tentativa 1, tentando correção...");
      return callClaude(
        apiKey,
        [
          ...messages,
          { role: "assistant", content },
          { role: "user", content: "O JSON retornado está malformado. Retorne APENAS o JSON corrigido, sem nenhum texto adicional." },
        ],
        systemPrompt,
        2
      );
    }
    throw e;
  }
}

const SYSTEM_PROMPT = `Você é um sistema de extração de dados de documentos médicos brasileiros.
Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.

Analise o documento e extraia todos os dados estruturados disponíveis.
O documento pode estar em português ou inglês.

ESTRUTURA DE SAÍDA OBRIGATÓRIA:
{
  "suggested_category": "Use 'exame_laboratorial' para qualquer documento que contenha resultados numéricos de marcadores sanguíneos, urinários ou bioquímicos (hemograma, glicose, colesterol, TSH, creatinina, etc.) — mesmo que o documento também tenha laudo textual junto. Use 'exame_imagem' apenas para radiografia, tomografia, ressonância, ultrassom ou similares sem valores numéricos de marcadores. Use 'laudo' apenas para documentos sem nenhum valor numérico de marcador laboratorial.",
  "confidence_score": 0.95,
  "document_date": "2024-03-15",
  "professional_name": "Dr. João Silva",
  "professional_registry": "CRM 12345",
  "specialty": "Clínica Geral",
  "institution": "Laboratório XYZ",
  "diagnoses": [
    {"name": "Diabetes Mellitus Tipo 2", "icd_code": "E11"}
  ],
  "medications": [
    {"name": "Metformina", "dose": "850mg", "posology": "2x ao dia", "duration": "30 dias"}
  ],
  "lab_results": [
    {
      "marker_name": "Glicose",
      "value": 102,
      "unit": "mg/dL",
      "reference_min": 70,
      "reference_max": 99,
      "reference_text": "70 - 99 mg/dL",
      "category": "bioquimica"
    },
    {
      "marker_name": "TSH",
      "value": 2.1,
      "unit": "mUI/L",
      "reference_min": 0.4,
      "reference_max": 4.0,
      "reference_text": "0,4 - 4,0 mUI/L",
      "category": "tireoide"
    }
  ],
  "nutrition_data": {
    "total_calories": null,
    "carbs_grams": null, "carbs_percent": null,
    "protein_grams": null, "protein_percent": null,
    "fat_grams": null, "fat_percent": null,
    "meals": [],
    "restrictions": [],
    "supplements": []
  },
  "training_data": {
    "sport": null,
    "frequency_per_week": null,
    "sessions": []
  },
  "raw_text_summary": "Hemograma completo com glicose levemente elevada e TSH normal. Paciente João, 45 anos."
}

REGRAS CRÍTICAS:
- Extraia TODOS os marcadores laboratoriais visíveis, sem exceção
- Para valores como "102" ou "102,5" — sempre converta para número (102.5)
- Se o valor de referência estiver no formato "70 - 99", separe em reference_min e reference_max
- Se não houver dados para uma seção, retorne arrays vazios ou null — nunca omita a chave
- Para documentos em inglês, traduza os nomes dos marcadores para português
- O campo raw_text_summary deve ter no máximo 200 caracteres
- Para os marcadores abaixo, use SEMPRE estes intervalos de referência baseados em diretrizes internacionais (AHA, ESC, SBD, SBC) quando o documento não especificar:

  HbA1c: reference_min: 0, reference_max: 5.6 (%, ADA 2024 — normal <5.7%)
  Glicose jejum: reference_min: 70, reference_max: 99 (mg/dL)
  LDL: reference_min: 0, reference_max: 130 (mg/dL — risco intermediário)
  HDL homem: reference_min: 40, reference_max: 60 (mg/dL)
  HDL mulher: reference_min: 50, reference_max: 60 (mg/dL)
  Colesterol Total: reference_min: 0, reference_max: 200 (mg/dL)
  Triglicerídeos: reference_min: 0, reference_max: 150 (mg/dL)
  PCR ultrassensível: reference_min: 0, reference_max: 1.0 (mg/L — baixo risco cardiovascular)
  Vitamina D: reference_min: 30, reference_max: 100 (ng/mL, Endocrine Society)
  TSH: reference_min: 0.4, reference_max: 4.0 (mUI/L)
  T4 Livre: reference_min: 0.8, reference_max: 1.8 (ng/dL)
  Hemoglobina homem: reference_min: 13.5, reference_max: 17.5 (g/dL)
  Hemoglobina mulher: reference_min: 12.0, reference_max: 16.0 (g/dL)
  Ferritina homem: reference_min: 30, reference_max: 400 (ng/mL)
  Ferritina mulher: reference_min: 13, reference_max: 150 (ng/mL)
  Creatinina homem: reference_min: 0.7, reference_max: 1.2 (mg/dL)
  Creatinina mulher: reference_min: 0.5, reference_max: 1.0 (mg/dL)
  Ureia: reference_min: 15, reference_max: 45 (mg/dL)
  Ácido Úrico homem: reference_min: 3.5, reference_max: 7.2 (mg/dL)
  Ácido Úrico mulher: reference_min: 2.6, reference_max: 6.0 (mg/dL)
  AST (TGO): reference_min: 0, reference_max: 40 (U/L)
  ALT (TGP): reference_min: 0, reference_max: 41 (U/L)
  GGT: reference_min: 0, reference_max: 61 (U/L)
  Plaquetas: reference_min: 150000, reference_max: 400000 (/mm³)
  Leucócitos: reference_min: 4000, reference_max: 11000 (/mm³)
  Hemácias homem: reference_min: 4.5, reference_max: 5.9 (milhões/mm³)
  Hemácias mulher: reference_min: 4.0, reference_max: 5.2 (milhões/mm³)
  Insulina jejum: reference_min: 2, reference_max: 25 (uUI/mL)
  Cortisol matinal: reference_min: 6.2, reference_max: 19.4 (mcg/dL)
  Testosterona total homem: reference_min: 300, reference_max: 1000 (ng/dL)
  Vitamina B12: reference_min: 200, reference_max: 900 (pg/mL)
  Ácido Fólico: reference_min: 3.1, reference_max: 20.5 (ng/mL)

- NUNCA use valores placeholder como 999999, 0 como máximo, ou intervalos que não fazem sentido clínico
- Se o sexo do paciente não for conhecido, use os intervalos masculinos como padrão`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id, file_path, file_type, category_hint } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("document_extractions")
      .update({ extraction_status: "processing" })
      .eq("document_id", document_id);

    // Download do arquivo
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("patient-documents")
      .download(file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("document_extractions")
        .update({
          extraction_status: "failed",
          error_message: "Não foi possível acessar o arquivo no armazenamento.",
        })
        .eq("document_id", document_id);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Data = base64Encode(arrayBuffer);
    const mimeType = file_type || "application/octet-stream";

    console.log(`Arquivo: ${file_path}, tamanho: ${uint8Array.length} bytes, tipo: ${mimeType}`);

    // Monta o conteúdo para o Claude conforme o tipo de arquivo
    let userContent: any[];

    if (mimeType === "application/pdf") {
      // Claude tem suporte nativo a PDF via tipo "document"
      userContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        },
        {
          type: "text",
          text: `Extraia todos os dados deste documento médico${category_hint ? ` (categoria esperada: ${category_hint})` : ""}. Retorne o JSON estruturado conforme as instruções.`,
        },
      ];
    } else if (mimeType.startsWith("image/")) {
      // Imagens via tipo "image" nativo do Claude
      userContent = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64Data,
          },
        },
        {
          type: "text",
          text: `Extraia todos os dados deste documento médico${category_hint ? ` (categoria esperada: ${category_hint})` : ""}. Retorne o JSON estruturado conforme as instruções.`,
        },
      ];
    } else {
      // Fallback: tenta decodificar como texto
      const textContent = new TextDecoder().decode(uint8Array);
      userContent = [
        {
          type: "text",
          text: `Documento médico:\n${textContent.substring(0, 50000)}\n\nExtraia os dados e retorne o JSON estruturado.`,
        },
      ];
    }

    // Chama Claude com retry automático
    let extracted: any;
    try {
      extracted = await callClaude(
        ANTHROPIC_API_KEY,
        [{ role: "user", content: userContent }],
        SYSTEM_PROMPT
      );
    } catch (parseError) {
      console.error("Falha na extração após retries:", parseError);
      await supabase
        .from("document_extractions")
        .update({
          extraction_status: "failed",
          error_message: "Não foi possível interpretar o documento. Tente novamente ou preencha manualmente.",
        })
        .eq("document_id", document_id);
      return new Response(
        JSON.stringify({ error: "Extraction failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salva resultado da extração
    await supabase
      .from("document_extractions")
      .update({
        extraction_status: "completed",
        extracted_data: extracted,
        suggested_category: extracted.suggested_category || category_hint,
        confidence_score: extracted.confidence_score || 0.5,
        document_date: extracted.document_date || null,
        professional_name: extracted.professional_name || null,
        professional_registry: extracted.professional_registry || null,
        specialty: extracted.specialty || null,
        institution: extracted.institution || null,
        raw_text: extracted.raw_text_summary || null,
      })
      .eq("document_id", document_id);

    // Insere lab_results se for exame laboratorial
    if (
      Array.isArray(extracted.lab_results) &&
      extracted.lab_results.length > 0 &&
      extracted.suggested_category === "exame_laboratorial"
    ) {
      const { data: docRow } = await supabase
        .from("documents")
        .select("patient_id, uploaded_by")
        .eq("id", document_id)
        .single();

      const patientId = docRow?.patient_id ?? null;
      const userId = docRow?.uploaded_by ?? null;
      const collectionDate = extracted.document_date || new Date().toISOString().split("T")[0];

      const labRows = extracted.lab_results
        .filter((item: any) => item.value != null && !isNaN(parseFloat(item.value)))
        .map((item: any) => {
          const numValue = parseFloat(item.value);
          const refMin = item.reference_min != null ? parseFloat(item.reference_min) : null;
          const refMax = item.reference_max != null ? parseFloat(item.reference_max) : null;

          let status: string | null = null;
          if (refMin !== null && refMax !== null && !isNaN(refMin) && !isNaN(refMax)) {
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
            reference_min: refMin !== null && !isNaN(refMin) ? refMin : null,
            reference_max: refMax !== null && !isNaN(refMax) ? refMax : null,
            reference_text: item.reference_text || null,
            marker_category: item.category || "other",
            collection_date: collectionDate,
            lab_name: extracted.institution || null,
            status,
          };
        });

      if (labRows.length > 0) {
        const { error: labError } = await supabase
          .from("lab_results")
          .upsert(labRows, { onConflict: "document_id,marker_name" });

        if (labError) {
          console.error("Erro ao inserir lab_results:", labError);
        } else {
          console.log(`lab_results inseridos: ${labRows.length}`);
        }
      }
    }

    // Insere nutrition_plans se for prescrição nutricional
    if (
      extracted.suggested_category === 'prescricao_nutricional' &&
      extracted.nutrition_data &&
      (
        extracted.nutrition_data.total_calories ||
        (Array.isArray(extracted.nutrition_data.meals) && extracted.nutrition_data.meals.length > 0)
      )
    ) {
      const { data: docRow2 } = await supabase
        .from('documents')
        .select('patient_id, uploaded_by')
        .eq('id', document_id)
        .single();

      const patientId = docRow2?.patient_id ?? null;
      const userId = docRow2?.uploaded_by ?? null;

      // Desativar planos anteriores ativos do mesmo usuário
      await supabase
        .from('nutrition_plans')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('status', 'active');

      const nd = extracted.nutrition_data;

      // Normalizar refeições para o formato esperado pelo frontend
      const meals = Array.isArray(nd.meals) ? nd.meals.map((m: any) => ({
        name: m.name || m.meal_name || 'Refeição',
        time: m.time || m.horario || null,
        foods: Array.isArray(m.foods)
          ? m.foods.map((f: any) => typeof f === 'string' ? f : `${f.name || f.alimento}${f.quantity ? ` — ${f.quantity}` : ''}${f.quantidade ? ` — ${f.quantidade}` : ''}`)
          : [],
        calories: m.calories || m.calorias || null,
        notes: m.notes || m.observacoes || null,
      })) : [];

      const { error: nutritionError } = await supabase
        .from('nutrition_plans')
        .insert({
          document_id,
          patient_id: patientId,
          user_id: userId,
          professional_name: extracted.professional_name || null,
          professional_registry: extracted.professional_registry || null,
          total_calories: nd.total_calories ? parseFloat(nd.total_calories) : null,
          protein_grams: nd.protein_grams ? parseFloat(nd.protein_grams) : null,
          protein_percent: nd.protein_percent ? parseFloat(nd.protein_percent) : null,
          carbs_grams: nd.carbs_grams ? parseFloat(nd.carbs_grams) : null,
          carbs_percent: nd.carbs_percent ? parseFloat(nd.carbs_percent) : null,
          fat_grams: nd.fat_grams ? parseFloat(nd.fat_grams) : null,
          fat_percent: nd.fat_percent ? parseFloat(nd.fat_percent) : null,
          meals,
          supplements: Array.isArray(nd.supplements) ? nd.supplements : [],
          restrictions: Array.isArray(nd.restrictions) ? nd.restrictions : [],
          observations: extracted.raw_text_summary || null,
          status: 'active',
          start_date: extracted.document_date || null,
        });

      if (nutritionError) {
        console.error('Erro ao inserir nutrition_plan:', nutritionError);
      } else {
        console.log('nutrition_plan inserido com sucesso');
      }
    }

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
