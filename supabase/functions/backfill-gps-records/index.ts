import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Identifica o usuário a partir do JWT (RLS-friendly)
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    let userId: string | null = null;
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      userId = userData?.user?.id ?? null;
    }

    // Buscar todos os workout_logs com source = 'garmin' do paciente
    let query = supabase
      .from("workout_logs")
      .select("id")
      .eq("source", "garmin");

    if (userId) query = query.eq("user_id", userId);

    const { data: garminLogs, error: logsError } = await query;
    if (logsError) throw logsError;

    if (!garminLogs || garminLogs.length === 0) {
      return new Response(
        JSON.stringify({
          total: 0,
          withGps: 0,
          withoutGps: 0,
          message: "Nenhuma atividade Garmin encontrada",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let logsWithGps = 0;
    let logsWithoutGps = 0;

    for (const log of garminLogs) {
      const { data: gpsRecords } = await (supabase.from("workout_records") as any)
        .select("id")
        .eq("workout_log_id", log.id)
        .not("lat", "is", null)
        .limit(1);

      if (gpsRecords && gpsRecords.length > 0) {
        logsWithGps++;
      } else {
        logsWithoutGps++;
      }
    }

    return new Response(
      JSON.stringify({
        total: logsWithGps + logsWithoutGps,
        withGps: logsWithGps,
        withoutGps: logsWithoutGps,
        message:
          logsWithGps > 0
            ? `GPS disponível em ${logsWithGps} atividade(s)`
            : "GPS disponível apenas em atividades importadas via arquivo .FIT",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backfill-gps-records error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
