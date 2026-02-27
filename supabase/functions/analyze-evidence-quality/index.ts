import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PMC API base URL
const PMC_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const PMC_FETCH_URL = "https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json";

// Study type detection patterns
const STUDY_TYPE_PATTERNS = {
  systematic_review: [
    /systematic\s+review/i,
    /meta[\-\s]?analysis/i,
    /pooled\s+analysis/i,
    /umbrella\s+review/i,
  ],
  rct: [
    /randomized\s+controlled\s+trial/i,
    /randomised\s+controlled\s+trial/i,
    /double[\-\s]?blind/i,
    /placebo[\-\s]?controlled/i,
    /random(ly)?\s+assign(ed)?/i,
  ],
  non_randomized_trial: [
    /non[\-\s]?randomized/i,
    /quasi[\-\s]?experiment/i,
    /controlled\s+clinical\s+trial/i,
  ],
  cohort_study: [
    /cohort\s+study/i,
    /prospective\s+study/i,
    /longitudinal\s+study/i,
    /follow[\-\s]?up\s+study/i,
  ],
  case_control: [
    /case[\-\s]?control/i,
    /matched\s+controls/i,
  ],
  cross_sectional: [
    /cross[\-\s]?sectional/i,
    /prevalence\s+study/i,
    /survey\s+study/i,
  ],
  case_series: [
    /case\s+series/i,
    /case\s+report/i,
  ],
};

// Methodology checklists by study type
const METHODOLOGY_CHECKLISTS = {
  systematic_review: {
    tool: "AMSTAR-2",
    criticalDomains: [
      { id: "protocol", label: "Protocolo registrado", critical: true },
      { id: "search_strategy", label: "Estratégia de busca adequada", critical: true },
      { id: "study_selection", label: "Seleção de estudos em duplicata", critical: false },
      { id: "data_extraction", label: "Extração de dados em duplicata", critical: false },
      { id: "excluded_studies", label: "Lista de estudos excluídos justificada", critical: false },
      { id: "included_details", label: "Descrição adequada dos estudos incluídos", critical: false },
      { id: "rob_assessment", label: "Avaliação de risco de viés", critical: true },
      { id: "funding_sources", label: "Fontes de financiamento relatadas", critical: false },
      { id: "meta_analysis_methods", label: "Métodos estatísticos adequados", critical: true },
      { id: "rob_impact", label: "Impacto do risco de viés considerado", critical: true },
      { id: "heterogeneity", label: "Heterogeneidade avaliada", critical: false },
      { id: "publication_bias", label: "Viés de publicação avaliado", critical: true },
      { id: "conflicts", label: "Conflitos de interesse declarados", critical: false },
    ],
  },
  rct: {
    tool: "Cochrane RoB 2",
    domains: [
      { id: "randomization", label: "Processo de randomização", key: "D1" },
      { id: "allocation_concealment", label: "Ocultação da alocação", key: "D1" },
      { id: "blinding_participants", label: "Cegamento de participantes", key: "D2" },
      { id: "blinding_personnel", label: "Cegamento de profissionais", key: "D2" },
      { id: "blinding_outcome", label: "Cegamento na avaliação de desfechos", key: "D4" },
      { id: "missing_data", label: "Dados ausentes", key: "D3" },
      { id: "outcome_measurement", label: "Mensuração do desfecho", key: "D4" },
      { id: "selective_reporting", label: "Relato seletivo de resultados", key: "D5" },
    ],
  },
  non_randomized_trial: {
    tool: "ROBINS-I",
    domains: [
      { id: "confounding", label: "Viés de confusão", key: "D1" },
      { id: "selection", label: "Viés de seleção", key: "D2" },
      { id: "intervention_classification", label: "Classificação da intervenção", key: "D3" },
      { id: "deviations", label: "Desvios da intervenção", key: "D4" },
      { id: "missing_data", label: "Dados ausentes", key: "D5" },
      { id: "outcome_measurement", label: "Mensuração do desfecho", key: "D6" },
      { id: "selective_reporting", label: "Relato seletivo", key: "D7" },
    ],
  },
  observational: {
    tool: "Newcastle-Ottawa Scale",
    domains: [
      { id: "representativeness", label: "Representatividade da coorte exposta", category: "selection" },
      { id: "selection_non_exposed", label: "Seleção da coorte não exposta", category: "selection" },
      { id: "exposure_ascertainment", label: "Verificação da exposição", category: "selection" },
      { id: "outcome_baseline", label: "Demonstração de que o desfecho não estava presente no início", category: "selection" },
      { id: "comparability", label: "Comparabilidade das coortes", category: "comparability" },
      { id: "outcome_assessment", label: "Avaliação do desfecho", category: "outcome" },
      { id: "follow_up_length", label: "Duração do seguimento", category: "outcome" },
      { id: "follow_up_adequacy", label: "Adequação do seguimento", category: "outcome" },
    ],
  },
};

// GRADE factors
const GRADE_FACTORS = [
  { id: "risk_of_bias", label: "Risco de viés", direction: "down" },
  { id: "inconsistency", label: "Inconsistência", direction: "down" },
  { id: "indirectness", label: "Evidência indireta", direction: "down" },
  { id: "imprecision", label: "Imprecisão", direction: "down" },
  { id: "publication_bias", label: "Viés de publicação", direction: "down" },
  { id: "large_effect", label: "Grande magnitude de efeito", direction: "up" },
  { id: "dose_response", label: "Gradiente dose-resposta", direction: "up" },
  { id: "confounders_reduced", label: "Confundidores reduzem efeito", direction: "up" },
];

interface PatientContext {
  id: string;
  age?: number;
  sex?: string;
  diagnoses: Array<{ name: string; icd_code?: string }>;
  treatments: Array<{ name: string; dosage?: string }>;
  comorbidities?: string[];
}

interface AnalysisRequest {
  evidenceResultId: string;
  patientId: string;
  patientContext: PatientContext;
}

// Detect study type from text
function detectStudyType(text: string, existingType?: string): string {
  // First check if we have a reliable existing type
  if (existingType && existingType !== "other") {
    // Map existing types
    const typeMap: Record<string, string> = {
      meta_analysis: "systematic_review",
      systematic_review: "systematic_review",
      randomized_controlled_trial: "rct",
      cohort_study: "cohort_study",
      case_control: "case_control",
      case_report: "case_series",
    };
    if (typeMap[existingType]) return typeMap[existingType];
  }

  // Pattern-based detection from text
  for (const [type, patterns] of Object.entries(STUDY_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
  }

  return "observational"; // Default
}

// Fetch full text from PMC
async function fetchPMCFullText(pmcId: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    // Clean PMC ID
    const cleanId = pmcId.replace(/^PMC/i, "");
    
    // Try to get full text via PMC OA service
    const response = await fetch(`${PMC_FETCH_URL}/${cleanId}/unicode`);
    
    if (!response.ok) {
      // Fallback: try efetch
      const efetchUrl = `${PMC_BASE_URL}/efetch.fcgi?db=pmc&id=${cleanId}&rettype=xml`;
      const efetchResponse = await fetch(efetchUrl);
      
      if (!efetchResponse.ok) {
        return { success: false, error: "Article not available in PMC Open Access" };
      }
      
      const xmlText = await efetchResponse.text();
      // Extract text content from XML (simplified)
      const textContent = xmlText
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      return { success: true, text: textContent };
    }
    
    const data = await response.json();
    
    // Extract passages from BioC format
    let fullText = "";
    if (data.documents) {
      for (const doc of data.documents) {
        if (doc.passages) {
          for (const passage of doc.passages) {
            if (passage.text) {
              fullText += passage.text + "\n\n";
            }
          }
        }
      }
    }
    
    return { success: true, text: fullText };
  } catch (error) {
    console.error("[PMC] Error fetching full text:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Search for PMC ID from PubMed ID
async function getPMCIdFromPubMed(pubmedId: string): Promise<string | null> {
  try {
    const url = `${PMC_BASE_URL}/elink.fcgi?dbfrom=pubmed&db=pmc&id=${pubmedId}&retmode=json`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const linkSets = data.linksets?.[0]?.linksetdbs;
    
    if (linkSets) {
      for (const linkSet of linkSets) {
        if (linkSet.dbto === "pmc" && linkSet.links?.length > 0) {
          return `PMC${linkSet.links[0]}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("[PMC] Error getting PMC ID:", error);
    return null;
  }
}

// Analyze methodology with LLM
async function analyzeWithLLM(
  studyType: string,
  text: string,
  patientContext: PatientContext,
  abstract?: string,
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const checklist = METHODOLOGY_CHECKLISTS[studyType as keyof typeof METHODOLOGY_CHECKLISTS] 
    || METHODOLOGY_CHECKLISTS.observational;

  const systemPrompt = `Você é um especialista em metodologia científica e medicina baseada em evidências.
Sua tarefa é avaliar a qualidade metodológica de estudos clínicos de forma rigorosa e imparcial.

Você deve responder SEMPRE em JSON válido com a estrutura especificada.

Ferramentas de avaliação por tipo de estudo:
- Revisões sistemáticas: Use critérios baseados no AMSTAR-2
- Ensaios clínicos randomizados: Use critérios baseados no Cochrane RoB 2
- Ensaios não randomizados: Use critérios baseados no ROBINS-I
- Estudos observacionais: Use critérios baseados na Newcastle-Ottawa Scale
- Para classificação da certeza da evidência: Use abordagem GRADE

Seja objetivo e baseie suas avaliações apenas no que está explicitamente relatado no texto.`;

  const checklistItems = "criticalDomains" in checklist 
    ? checklist.criticalDomains 
    : checklist.domains;
  const checklistText = checklistItems
    .map((item: any) => `- ${item.label} (${item.id})`)
    .join("\n");

  const userPrompt = `Analise o seguinte estudo científico e forneça uma avaliação completa.

TIPO DE ESTUDO DETECTADO: ${studyType}

FERRAMENTA DE AVALIAÇÃO: ${checklist.tool}

ITENS DO CHECKLIST A AVALIAR:
${checklistText}

FATORES GRADE PARA CERTEZA DA EVIDÊNCIA:
${GRADE_FACTORS.map(f => `- ${f.label} (${f.id})`).join("\n")}

CONTEXTO DO PACIENTE PARA AVALIAÇÃO DE APLICABILIDADE:
- Idade: ${patientContext.age || "não informada"}
- Sexo: ${patientContext.sex || "não informado"}
- Diagnósticos: ${patientContext.diagnoses.map(d => d.name).join(", ") || "nenhum"}
- Tratamentos: ${patientContext.treatments.map(t => t.name).join(", ") || "nenhum"}

${abstract ? `ABSTRACT:\n${abstract}\n\n` : ""}
TEXTO DO ARTIGO (pode estar truncado):
${text.slice(0, 15000)}

Responda EXCLUSIVAMENTE com o seguinte JSON:
{
  "study_type_confirmed": "tipo de estudo confirmado após análise",
  "study_design_details": {
    "design": "detalhes do desenho",
    "population": "população estudada",
    "intervention": "intervenção ou exposição",
    "comparison": "grupo de comparação",
    "outcomes": ["desfechos principais"],
    "sample_size": "tamanho da amostra se disponível",
    "follow_up": "tempo de seguimento se aplicável"
  },
  "methodology_assessment": {
    "checklist_results": {
      "item_id": {
        "met": true/false/null,
        "justification": "justificativa breve"
      }
    },
    "overall_quality": "high|moderate|low|critically_low",
    "score": 0-100,
    "summary": "Resumo em português da qualidade metodológica (2-3 frases)"
  },
  "bias_assessment": {
    "domain_results": {
      "domain_id": {
        "risk": "low|some_concerns|high|serious|critical",
        "justification": "justificativa breve"
      }
    },
    "overall_risk": "low|some_concerns|high|serious|critical",
    "summary": "Resumo em português do risco de viés (2-3 frases)"
  },
  "grade_assessment": {
    "factors": {
      "factor_id": {
        "concern": "none|serious|very_serious",
        "justification": "justificativa breve"
      }
    },
    "certainty": "high|moderate|low|very_low",
    "summary": "Resumo em português da certeza da evidência (2-3 frases)"
  },
  "applicability_assessment": {
    "population_match": {
      "score": "high|moderate|low",
      "justification": "comparação com o paciente"
    },
    "intervention_match": {
      "score": "high|moderate|low",
      "justification": "se a intervenção é aplicável"
    },
    "setting_match": {
      "score": "high|moderate|low",
      "justification": "se o contexto clínico é similar"
    },
    "overall": "high|moderate|low",
    "summary": "Resumo em português da aplicabilidade ao paciente (2-3 frases)"
  },
  "overall": {
    "recommendation": "Recomendação breve sobre a utilidade deste estudo para o caso clínico",
    "strengths": ["pontos fortes do estudo"],
    "limitations": ["limitações importantes"]
  }
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LLM] API error:", response.status, errorText);
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in LLM response");
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from LLM response");
  }

  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { evidenceResultId, patientId, patientContext } = await req.json() as AnalysisRequest;

    if (!evidenceResultId || !patientId) {
      return new Response(
        JSON.stringify({ success: false, error: "evidenceResultId and patientId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Get the evidence result
    const { data: evidenceResult, error: resultError } = await supabase
      .from("evidence_results")
      .select("*")
      .eq("id", evidenceResultId)
      .single();

    if (resultError || !evidenceResult) {
      return new Response(
        JSON.stringify({ success: false, error: "Evidence result not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Analysis] Starting analysis for:", evidenceResult.title);

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from("evidence_quality_analyses")
      .select("*")
      .eq("evidence_result_id", evidenceResultId)
      .eq("patient_id", patientId)
      .single();

    if (existingAnalysis) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: existingAnalysis,
          cached: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to get PMC ID and full text
    let pmcId = evidenceResult.pmc_id;
    let fullText = "";
    let fullTextAvailable = false;
    let fullTextSource = null;

    if (!pmcId && evidenceResult.pubmed_id) {
      pmcId = await getPMCIdFromPubMed(evidenceResult.pubmed_id);
    }

    if (pmcId) {
      console.log("[Analysis] Fetching full text from PMC:", pmcId);
      const pmcResult = await fetchPMCFullText(pmcId);
      
      if (pmcResult.success && pmcResult.text) {
        fullText = pmcResult.text;
        fullTextAvailable = true;
        fullTextSource = "pmc";
      }
    }

    // If no full text, use abstract
    const textToAnalyze = fullText || evidenceResult.abstract || evidenceResult.clinical_summary || "";
    
    if (!textToAnalyze) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No text available for analysis (no full text, abstract, or summary)" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect study type
    const studyType = detectStudyType(textToAnalyze, evidenceResult.study_type);
    console.log("[Analysis] Detected study type:", studyType);

    // Analyze with LLM
    console.log("[Analysis] Analyzing with LLM...");
    const llmAnalysis = await analyzeWithLLM(
      studyType,
      textToAnalyze,
      patientContext,
      evidenceResult.abstract
    );

    // Map LLM results to database fields
    const methodologyQualityMap: Record<string, string> = {
      high: "high",
      moderate: "moderate",
      low: "low",
      critically_low: "critically_low",
    };

    const biasRiskMap: Record<string, string> = {
      low: "low",
      some_concerns: "some_concerns",
      high: "high",
      serious: "serious",
      critical: "critical",
    };

    const certaintMap: Record<string, string> = {
      high: "high",
      moderate: "moderate",
      low: "low",
      very_low: "very_low",
    };

    const applicabilityMap: Record<string, string> = {
      high: "high",
      moderate: "moderate",
      low: "low",
    };

    // Create analysis record
    const analysisData = {
      evidence_result_id: evidenceResultId,
      patient_id: patientId,
      analyzed_by: userId,
      full_text_available: fullTextAvailable,
      full_text_source: fullTextSource,
      pmc_id: pmcId,
      study_type_detected: llmAnalysis.study_type_confirmed || studyType,
      study_design_details: llmAnalysis.study_design_details || {},
      methodology_quality: methodologyQualityMap[llmAnalysis.methodology_assessment?.overall_quality] || "low",
      methodology_score: llmAnalysis.methodology_assessment?.score || 0,
      methodology_checklist: llmAnalysis.methodology_assessment?.checklist_results || {},
      methodology_summary: llmAnalysis.methodology_assessment?.summary || "",
      bias_risk: biasRiskMap[llmAnalysis.bias_assessment?.overall_risk] || "high",
      bias_domains: llmAnalysis.bias_assessment?.domain_results || {},
      bias_summary: llmAnalysis.bias_assessment?.summary || "",
      evidence_certainty: certaintMap[llmAnalysis.grade_assessment?.certainty] || "low",
      grade_factors: llmAnalysis.grade_assessment?.factors || {},
      evidence_summary: llmAnalysis.grade_assessment?.summary || "",
      applicability: applicabilityMap[llmAnalysis.applicability_assessment?.overall] || "low",
      applicability_factors: {
        population: llmAnalysis.applicability_assessment?.population_match || {},
        intervention: llmAnalysis.applicability_assessment?.intervention_match || {},
        setting: llmAnalysis.applicability_assessment?.setting_match || {},
      },
      applicability_summary: llmAnalysis.applicability_assessment?.summary || "",
      overall_recommendation: llmAnalysis.overall?.recommendation || "",
      strengths: llmAnalysis.overall?.strengths || [],
      limitations: llmAnalysis.overall?.limitations || [],
      llm_model_used: "google/gemini-2.5-flash",
      processing_duration_ms: Date.now() - startTime,
    };

    const { data: analysis, error: insertError } = await supabase
      .from("evidence_quality_analyses")
      .insert(analysisData)
      .select()
      .single();

    if (insertError) {
      console.error("[Analysis] Insert error:", insertError);
      throw new Error(`Failed to save analysis: ${insertError.message}`);
    }

    // Create audit log
    await supabase.from("quality_analysis_audit_logs").insert({
      analysis_id: analysis.id,
      action: "analysis_completed",
      action_details: {
        study_type: studyType,
        full_text_available: fullTextAvailable,
        text_length: textToAnalyze.length,
        duration_ms: Date.now() - startTime,
      },
      performed_by: userId,
    });

    console.log("[Analysis] Completed in", Date.now() - startTime, "ms");

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        cached: false,
        processingTime: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Analysis] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
