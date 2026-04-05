import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { userId } = await req.json()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: tokenData } = await supabase
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (!tokenData) return new Response(
    JSON.stringify({ error: "Token não encontrado" }), { status: 404 }
  )

  const activities = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=10",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  ).then(r => r.json())

  return new Response(JSON.stringify(activities), {
    headers: { "Content-Type": "application/json" }
  })
})
