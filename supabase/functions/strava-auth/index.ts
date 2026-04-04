import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const url = new URL(req.url)
  const state = url.searchParams.get("state") ?? ""
  const clientId = Deno.env.get("STRAVA_CLIENT_ID")
  const redirectUri = Deno.env.get("STRAVA_REDIRECT_URI")

  if (!clientId || !redirectUri) {
    return new Response(JSON.stringify({ error: "Strava not configured" }), { status: 500 })
  }

  const authUrl = new URL("https://www.strava.com/oauth/authorize")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("approval_prompt", "force")
  authUrl.searchParams.set("scope", "activity:read_all")
  authUrl.searchParams.set("state", state)

  return Response.redirect(authUrl.toString(), 302)
})
