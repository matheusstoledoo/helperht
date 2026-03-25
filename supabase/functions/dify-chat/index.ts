import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DIFY_API_URL = Deno.env.get("DIFY_API_URL");
  const DIFY_API_KEY = Deno.env.get("DIFY_API_KEY");

  if (!DIFY_API_URL || !DIFY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Dify API not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { query, conversation_id, user } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length < 1) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = DIFY_API_URL.replace(/\/$/, "");

    const difyResponse = await fetch(`${baseUrl}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: query.trim(),
        response_mode: "blocking",
        conversation_id: conversation_id || "",
        user: user || "patient",
      }),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error(`Dify API error [${difyResponse.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar o assistente de saúde." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await difyResponse.json();

    return new Response(
      JSON.stringify({
        answer: data.answer,
        conversation_id: data.conversation_id,
        message_id: data.message_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Dify chat error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar sua mensagem." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
