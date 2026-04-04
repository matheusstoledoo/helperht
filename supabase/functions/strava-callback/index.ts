import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userId = url.searchParams.get("state")

  if (!code || !userId) {
    return new Response("Missing code or state", { status: 400 })
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
    }),
  })

  const tokens = await res.json()

  if (!tokens.access_token) {
    return new Response(JSON.stringify({ error: "Token exchange failed", details: tokens }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  await supabase.from("strava_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    athlete_id: tokens.athlete?.id,
  })

  const appUrl = Deno.env.get("APP_URL") || "https://helperht.lovable.app"
  return Response.redirect(`${appUrl}/patient/workouts?strava=connected`, 302)
})
