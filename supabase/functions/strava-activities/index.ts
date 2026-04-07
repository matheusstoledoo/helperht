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

async function fetchLaps(activityId: number, accessToken: string) {
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/laps`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    const laps = await res.json()
    return Array.isArray(laps)
      ? laps.map((l: any) => ({
          name: l.name,
          distance: l.distance,
          moving_time: l.moving_time,
          elapsed_time: l.elapsed_time,
          average_speed: l.average_speed,
          max_speed: l.max_speed,
          average_heartrate: l.average_heartrate,
          max_heartrate: l.max_heartrate,
          average_cadence: l.average_cadence,
          total_elevation_gain: l.total_elevation_gain,
          lap_index: l.lap_index,
        }))
      : []
  } catch {
    return []
  }
}

function enrichActivity(a: any) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    sport_type: a.sport_type,
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    start_date_local: a.start_date_local,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    average_speed: a.average_speed ?? null,
    max_speed: a.max_speed ?? null,
    average_cadence: a.average_cadence ?? null,
    total_elevation_gain: a.total_elevation_gain ?? null,
    elev_high: a.elev_high ?? null,
    elev_low: a.elev_low ?? null,
    suffer_score: a.suffer_score ?? null,
    calories: a.calories ?? null,
    has_heartrate: a.has_heartrate ?? false,
    laps: [], // will be filled for top 5
  }
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

  let accessToken = tokenData.access_token

  // First attempt
  let res = await fetchActivities(accessToken)

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
    accessToken = newTokens.access_token

    await supabase.from("strava_tokens").update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_at: newTokens.expires_at,
    }).eq("user_id", userId)

    // Retry with new token
    res = await fetchActivities(accessToken)
  }

  if (!res.ok) {
    const errorBody = await res.text()
    return new Response(
      JSON.stringify({ error: `Erro ao buscar atividades do Strava: ${errorBody}` }),
      { status: res.status >= 400 && res.status < 500 ? res.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const rawActivities = await res.json()
  if (!Array.isArray(rawActivities)) {
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Enrich all activities with detailed fields
  const activities = rawActivities.map(enrichActivity)

  // Fetch laps for the 5 most recent activities in parallel
  const top5 = activities.slice(0, 5)
  const lapsResults = await Promise.all(
    top5.map((a: any) => fetchLaps(a.id, accessToken))
  )
  top5.forEach((a: any, i: number) => {
    a.laps = lapsResults[i]
  })

  // Save strava_details to training_plans for this user (upsert into a dedicated strava cache)
  // Store in the sessions JSONB of the active training plan if one exists
  try {
    const { data: activePlan } = await supabase
      .from("training_plans")
      .select("id, sessions")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activePlan) {
      // Merge strava data into strava_details column
      await supabase.from("training_plans").update({
        strava_details: {
          last_sync: new Date().toISOString(),
          activities: activities,
        },
      }).eq("id", activePlan.id)
    }
  } catch (e) {
    console.error("Failed to save strava_details:", e)
  }

  return new Response(JSON.stringify(activities), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
