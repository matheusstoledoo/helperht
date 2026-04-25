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

    // Buscar workout_logs com source = 'garmin'
    const { data: logsWithoutGps, error: logsError } = await supabase
      .from("workout_logs")
      .select("id, user_id, patient_id")
      .eq("source", "garmin")
      .limit(50);

    if (logsError) throw logsError;
    if (!logsWithoutGps || logsWithoutGps.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum log Garmin encontrado", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const log of logsWithoutGps) {
      const { data: existingRecords } = await supabase
        .from("workout_records")
        .select("id, lat")
        .eq("workout_log_id", log.id)
        .limit(1);

      if (!existingRecords || existingRecords.length === 0) {
        results.push({ log_id: log.id, status: "sem_records" });
        continue;
      }
      if (existingRecords[0].lat != null) {
        results.push({ log_id: log.id, status: "gps_ja_existe" });
        continue;
      }

      const { data: documents } = await supabase
        .from("documents")
        .select("file_path, file_type")
        .eq("patient_id", log.patient_id)
        .ilike("file_path", "%.fit")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!documents || documents.length === 0) {
        results.push({ log_id: log.id, status: "arquivo_nao_encontrado" });
        continue;
      }

      let matched = false;
      for (const doc of documents) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("patient-documents")
            .download(doc.file_path);

          if (downloadError || !fileData) continue;

          const arrayBuffer = await fileData.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          const gpsPoints = extractGpsFromFit(uint8Array);

          if (gpsPoints.length < 2) {
            results.push({ log_id: log.id, status: "sem_gps_no_arquivo" });
            continue;
          }

          const { data: records } = await supabase
            .from("workout_records")
            .select("id, elapsed_seconds")
            .eq("workout_log_id", log.id)
            .order("elapsed_seconds");

          if (!records || records.length === 0) continue;

          const updates = records.map((record, i) => {
            const ratio = i / (records.length - 1);
            const gpsIdx = Math.min(
              Math.round(ratio * (gpsPoints.length - 1)),
              gpsPoints.length - 1
            );
            const point = gpsPoints[gpsIdx];
            return {
              id: record.id,
              lat: point.lat,
              lng: point.lng,
            };
          });

          const batchSize = 100;
          for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            for (const update of batch) {
              await supabase
                .from("workout_records")
                .update({ lat: update.lat, lng: update.lng })
                .eq("id", update.id);
            }
          }

          results.push({ log_id: log.id, status: "atualizado", points: updates.length });
          matched = true;
          break;
        } catch (e) {
          console.error(`Erro ao processar ${doc.file_path}:`, e);
          continue;
        }
      }

      if (!matched) {
        results.push({ log_id: log.id, status: "falha_no_parse" });
      }
    }

    return new Response(JSON.stringify({ results, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("backfill-gps-records error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractGpsFromFit(data: Uint8Array): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];

  try {
    let offset = 12; // Pular header FIT

    const localMessageDefs: Record<number, { fields: { number: number; size: number; type: number }[] }> = {};

    while (offset < data.length - 4) {
      const recordHeader = data[offset];
      offset++;

      const isDefinition = (recordHeader & 0x40) !== 0;
      const localMsgType = recordHeader & 0x0F;

      if (isDefinition) {
        offset++; // reserved
        const architecture = data[offset++];
        const globalMsgNum = architecture === 0
          ? data[offset] | (data[offset + 1] << 8)
          : (data[offset] << 8) | data[offset + 1];
        offset += 2;

        const numFields = data[offset++];
        const fields = [];
        for (let i = 0; i < numFields; i++) {
          fields.push({
            number: data[offset++],
            size: data[offset++],
            type: data[offset++],
          });
        }
        localMessageDefs[localMsgType] = { fields };
      } else {
        const def = localMessageDefs[localMsgType];
        if (!def) { offset++; continue; }

        let lat: number | null = null;
        let lng: number | null = null;

        for (const field of def.fields) {
          if (field.size === 4) {
            const val = data[offset] | (data[offset + 1] << 8) |
              (data[offset + 2] << 16) | (data[offset + 3] << 24);
            const signed = val > 0x7FFFFFFF ? val - 0x100000000 : val;

            if (field.number === 0) lat = signed * (180 / Math.pow(2, 31));
            if (field.number === 1) lng = signed * (180 / Math.pow(2, 31));
          }
          offset += field.size;
        }

        if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          if (!(Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001)) {
            points.push({
              lat: Math.round(lat * 1000000) / 1000000,
              lng: Math.round(lng * 1000000) / 1000000,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("FIT parse error:", e);
  }

  if (points.length > 500) {
    const step = Math.ceil(points.length / 500);
    return points.filter((_, i) => i % step === 0);
  }

  return points;
}
