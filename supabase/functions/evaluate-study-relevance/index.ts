/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  studyTitle?: string;
  studyClinicalSummary?: string;
  allStudies?: string;
  patientContext: string;
  patientId: string;
  isCollective?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { studyTitle, studyClinicalSummary, allStudies, patientContext, isCollective } = body;

    let prompt: string;

    if (isCollective && allStudies) {
      prompt = `Você é um especialista em medicina baseada em evidências. Analise os seguintes estudos científicos em conjunto e forneça uma síntese prática de como eles se aplicam ao caso do paciente.

CONTEXTO DO PACIENTE:
${patientContext}

ESTUDOS ENCONTRADOS:
${allStudies}

INSTRUÇÕES:
1. Analise como o conjunto de evidências se relaciona com o caso específico
2. Identifique padrões e consensos entre os estudos
3. Destaque pontos de atenção e possíveis contradições
4. Forneça recomendações práticas baseadas nas evidências
5. Seja conciso mas abrangente

Responda em português do Brasil, de forma clara e objetiva para uso clínico.`;
    } else {
      prompt = `Você é um especialista em medicina baseada em evidências. Avalie como o estudo abaixo se conecta especificamente ao caso do paciente.

CONTEXTO DO PACIENTE:
${patientContext}

ESTUDO:
Título: ${studyTitle}
Resumo Clínico: ${studyClinicalSummary || "Não disponível"}

INSTRUÇÕES:
1. Explique como os achados do estudo podem ser aplicados a este paciente específico
2. Identifique se há características do paciente que aumentam ou diminuem a aplicabilidade
3. Sugira pontos de atenção práticos para a decisão clínica
4. Seja breve e objetivo (máximo 150 palavras)

Responda em português do Brasil.`;
    }

    const response = await fetch("https://llm.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: isCollective ? 1000 : 400,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API error:", errorText);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const evaluation = data.choices?.[0]?.message?.content || "Não foi possível gerar a avaliação.";

    return new Response(
      JSON.stringify({
        success: true,
        evaluation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
