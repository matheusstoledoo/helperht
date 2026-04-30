import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um sistema de extração de fichas de treino de musculação.
Responda APENAS com JSON válido, sem markdown.
Extraia todos os exercícios organizados por treino/dia.

ESTRUTURA OBRIGATÓRIA:
{
  "template_name": "Nome sugerido para o template (ex: Treino A/B, Push/Pull/Legs)",
  "sport": "musculacao",
  "frequency_per_week": 3,
  "professional_name": "Nome do personal se visível, ou null",
  "sessions": [
    {
      "name": "Treino A",
      "day": "Segunda/Quarta/Sexta",
      "exercises": [
        {
          "name": "Supino Reto",
          "sets": 4,
          "reps": "8-12",
          "load": "carga moderada",
          "rest": "90s",
          "notes": "Observações se houver"
        }
      ]
    }
  ],
  "periodization_notes": "Observações gerais do programa se houver, ou null"
}

REGRAS:
- Extraia TODOS os exercícios visíveis
- Se não houver separação por dias, coloque tudo em uma única sessão chamada "Treino"
- Para reps, mantenha o formato original (ex: "8-12", "10", "até falha")
- Para descanso, mantenha o formato original (ex: "60s", "1-2 min")
- Se não houver informação de carga, use null`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

    const { base64, mimeType } = await req.json();
    if (!base64 || !mimeType) {
      return new Response(JSON.stringify({ error: "base64 e mimeType obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentItem =
      mimeType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentItem,
              { type: "text", text: "Extraia todos os exercícios desta ficha de treino e retorne o JSON estruturado." },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Claude error", resp.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao chamar Claude", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extracted: any;
    try {
      extracted = JSON.parse(clean);
    } catch {
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      extracted = JSON.parse(clean.substring(start, end + 1));
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-workout-template error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
