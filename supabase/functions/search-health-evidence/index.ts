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

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      throw new Error("Pergunta muito curta. Descreva melhor sua dúvida.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch patient context for personalized answers
    const [patientRes, labRes] = await Promise.all([
      supabase.from("patients").select("id, allergies, blood_type").eq("user_id", user.id).maybeSingle(),
      supabase.from("lab_results")
        .select("marker_name, value, unit, status")
        .eq("user_id", user.id)
        .order("collection_date", { ascending: false })
        .limit(10),
    ]);

    const patientId = patientRes?.data?.id;
    let diagNames: string[] = [];
    let treatNames: string[] = [];

    if (patientId) {
      const [diagRes, treatRes] = await Promise.all([
        supabase.from("diagnoses").select("name").eq("patient_id", patientId).eq("status", "active"),
        supabase.from("treatments").select("name").eq("patient_id", patientId).eq("status", "active"),
      ]);
      diagNames = (diagRes.data || []).map(d => d.name);
      treatNames = (treatRes.data || []).map(t => t.name);
    }

    const patientContextSummary = [
      diagNames.length > 0 ? `Diagnósticos ativos: ${diagNames.join(", ")}` : "",
      treatNames.length > 0 ? `Tratamentos: ${treatNames.join(", ")}` : "",
      patientRes.data?.allergies?.length ? `Alergias: ${patientRes.data.allergies.join(", ")}` : "",
    ].filter(Boolean).join(". ");

    const systemPrompt = `Você é um assistente de saúde baseado em evidências científicas. Sua função é responder perguntas de saúde de pacientes leigos de forma clara, precisa e acessível.

DIRETRIZES CRÍTICAS:
1. Baseie suas respostas em evidências médicas reconhecidas (guidelines, meta-análises, revisões sistemáticas)
2. Use linguagem SIMPLES — explique termos técnicos quando necessário
3. NUNCA diagnostique nem prescreva — oriente sempre a consultar o profissional
4. Quando relevante, mencione o nível de evidência (ex: "estudos mostram que...", "há evidências moderadas de que...")
5. Se o paciente tiver contexto clínico, personalize a resposta considerando seus diagnósticos e tratamentos
6. Organize a resposta de forma clara com parágrafos curtos
7. Ao final, sempre inclua um disclaimer sobre consultar profissional de saúde
8. NÃO alucine — se não tiver certeza, diga claramente

${patientContextSummary ? `\nCONTEXTO DO PACIENTE:\n${patientContextSummary}\nUse esse contexto para personalizar a resposta quando relevante, mas não revele dados sensíveis de volta ao paciente de forma desnecessária.` : ""}

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks):
{
  "answer": "Resposta completa em texto simples com parágrafos separados por \\n\\n",
  "confidence": "high" | "medium" | "low",
  "sources_note": "Nota breve sobre as fontes de evidência utilizadas (ex: 'Baseado em guidelines da OMS e revisões do Cochrane')",
  "disclaimer": "Lembrete curto sobre consultar profissional"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        answer: content || "Não foi possível processar sua pergunta no momento.",
        confidence: "low",
        sources_note: "",
        disclaimer: "Consulte sempre seu profissional de saúde.",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-health-evidence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
