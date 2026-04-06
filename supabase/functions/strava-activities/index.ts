import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchActivities(accessToken: string) {
  return await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=10",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let userId: string
  try {
    const body = await req.json()
    userId = body.userId
  } catch {
    return new Response(
      JSON.stringify({ error: "Body inválido ou ausente" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "userId é obrigatório" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: tokenData, error: tokenError } = await supabase
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (!tokenData || tokenError) {
    return new Response(
      JSON.stringify({ error: "Token não encontrado" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // First attempt
  let res = await fetchActivities(tokenData.access_token)

  // If 401, try refreshing the token
  if (res.status === 401 && tokenData.refresh_token) {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID"),
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
        grant_type: "refresh_token",
        refresh_token: tokenData.refresh_token,
      }),
    })

    if (!refreshRes.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao renovar token do Strava. Reconecte sua conta." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const newTokens = await refreshRes.json()

    await supabase.from("strava_tokens").update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newTokens.expires_at,
    }).eq("user_id", userId)

    // Retry with new token
    res = await fetchActivities(newTokens.access_token)
  }

  if (!res.ok) {
    const errorBody = await res.text()
    return new Response(
      JSON.stringify({ error: `Erro ao buscar atividades do Strava: ${errorBody}` }),
      { status: res.status >= 400 && res.status < 500 ? res.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const activities = await res.json()

  return new Response(JSON.stringify(activities), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
