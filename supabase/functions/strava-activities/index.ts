import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "https://deno.land/x/edge_cors@0.0.1/src/cors.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: cors })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: tokenData } = await supabase
      .from("strava_tokens")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (!tokenData) {
      return new Response(JSON.stringify({ error: "Token não encontrado" }), { status: 404, headers: cors })
    }

    // Check if token is expired and refresh if needed
    const now = Math.floor(Date.now() / 1000)
    let accessToken = tokenData.access_token

    if (tokenData.expires_at && tokenData.expires_at < now) {
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

      const refreshed = await refreshRes.json()

      if (refreshed.access_token) {
        accessToken = refreshed.access_token
        await supabase.from("strava_tokens").update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: refreshed.expires_at,
        }).eq("user_id", userId)
      }
    }

    const activities = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=10",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ).then(r => r.json())

    return new Response(JSON.stringify(activities), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors })
  }
})
