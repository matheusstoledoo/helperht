import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Step 1: get patient + lab results
    const [patientRes, labRes] = await Promise.all([
      supabase.from("patients").select("id, allergies, blood_type").eq("user_id", user.id).maybeSingle(),
      supabase.from("lab_results")
        .select("marker_name, value, unit, status, collection_date, reference_min, reference_max")
        .eq("user_id", user.id)
        .order("collection_date", { ascending: false })
        .limit(50),
    ]);

    const patientId = patientRes?.data?.id || "00000000-0000-0000-0000-000000000000";

    // Step 2: diagnoses, treatments, nutrition, training
    const [diagRes, treatRes, nutritionRes, trainingRes] = await Promise.all([
      supabase.from("diagnoses")
        .select("name, status, severity, icd_code, diagnosed_date")
        .eq("patient_id", patientId)
        .eq("status", "active"),
      supabase.from("treatments")
        .select("name, status, dosage, frequency, start_date")
        .eq("patient_id", patientId)
        .eq("status", "active"),
      supabase.from("nutrition_plans")
        .select("total_calories, protein_grams, carbs_grams, fat_grams, restrictions, recommended_foods, avoided_foods, meals, supplements, observations, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("training_plans")
        .select("sport, frequency_per_week, sessions, periodization_notes, observations, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const activeNutrition = nutritionRes.data?.[0] || null;
    const activeTraining = trainingRes.data?.[0] || null;

    const patientContext = {
      allergies: patientRes.data?.allergies || [],
      blood_type: patientRes.data?.blood_type || null,
      lab_results: (labRes.data || []).slice(0, 30),
      active_diagnoses: diagRes.data || [],
      active_treatments: treatRes.data || [],
      nutrition: activeNutrition ? {
        calories: activeNutrition.total_calories,
        protein_g: activeNutrition.protein_grams,
        carbs_g: activeNutrition.carbs_grams,
        fat_g: activeNutrition.fat_grams,
        restrictions: activeNutrition.restrictions,
        recommended_foods: activeNutrition.recommended_foods,
        avoided_foods: activeNutrition.avoided_foods,
        supplements: activeNutrition.supplements,
        observations: activeNutrition.observations,
      } : null,
      training: activeTraining ? {
        sport: activeTraining.sport,
        frequency_per_week: activeTraining.frequency_per_week,
        periodization: activeTraining.periodization_notes,
        observations: activeTraining.observations,
        session_count: Array.isArray(activeTraining.sessions) ? activeTraining.sessions.length : 0,
      } : null,
    };

    const hasData = patientContext.lab_results.length > 0 ||
      patientContext.active_diagnoses.length > 0 ||
      patientContext.active_treatments.length > 0 ||
      patientContext.nutrition !== null ||
      patientContext.training !== null;

    if (!hasData) {
      return new Response(JSON.stringify({
        insights: [],
        summary: "Ainda não há dados suficientes para gerar insights. Faça upload de exames ou aguarde seus profissionais registrarem informações clínicas.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente de saúde que analisa dados clínicos de pacientes e gera insights educativos e acolhedores em português brasileiro.

IMPORTANTE:
- NÃO faça diagnósticos nem prescrições
- Use linguagem simples e acessível
- Sempre recomende consultar o profissional de saúde
- Foque em tendências nos exames, possíveis correlações e dicas gerais de bem-estar
- Seja empático e encorajador
- CONECTE os dados entre si: analise como diagnósticos se relacionam com tratamentos, como a nutrição pode impactar os exames, como o treino se conecta com os resultados laboratoriais e diagnósticos
- Se houver dados de nutrição, analise se a dieta é adequada para os diagnósticos e exames do paciente
- Se houver dados de treino, analise se a modalidade e frequência são compatíveis com o quadro clínico
- Identifique sinergias e potenciais conflitos entre tratamentos, nutrição e atividade física

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) no formato:
{
  "summary": "Resumo geral de 2-3 frases sobre a saúde do paciente, conectando os diferentes aspectos",
  "insights": [
    {
      "category": "exames" | "nutricao" | "treino" | "estilo_de_vida" | "atencao" | "positivo" | "conexao",
      "title": "Título curto do insight",
      "description": "Descrição de 2-3 frases",
      "priority": "info" | "attention" | "positive"
    }
  ]
}

Gere entre 3 e 8 insights relevantes. Use a categoria "conexao" para insights que cruzam dados de diferentes áreas (ex: relação entre exames e nutrição, treino e diagnóstico).`;

    const userPrompt = `Dados do paciente:\n${JSON.stringify(patientContext, null, 2)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas solicitações. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para gerar insights." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        summary: "Não foi possível processar os insights no momento. Tente novamente mais tarde.",
        insights: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-health-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
