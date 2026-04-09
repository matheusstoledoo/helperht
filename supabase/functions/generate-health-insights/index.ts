import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Step 1: get patient profile + user info + lab results
    const [patientRes, userRes, labRes] = await Promise.all([
      supabase.from("patients").select("id, allergies, blood_type, birthdate").eq("user_id", user.id).maybeSingle(),
      supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
      supabase.from("lab_results")
        .select("marker_name, value, unit, status, collection_date, reference_min, reference_max, marker_category")
        .eq("user_id", user.id)
        .order("collection_date", { ascending: false })
        .limit(50),
    ]);

    const patientId = patientRes?.data?.id || "00000000-0000-0000-0000-000000000000";
    const patientName = userRes?.data?.name || "Paciente";
    const birthdate = patientRes?.data?.birthdate;
    const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    // Step 2: all clinical data in parallel
    const [diagRes, treatRes, nutritionRes, trainingRes, examsRes, supplementsRes, goalsRes, patientGoalsRes] = await Promise.all([
      supabase.from("diagnoses")
        .select("name, status, severity, icd_code, diagnosed_date, resolved_date, public_notes")
        .eq("patient_id", patientId),
      supabase.from("treatments")
        .select("name, status, dosage, frequency, start_date, end_date, description, public_notes")
        .eq("patient_id", patientId),
      supabase.from("nutrition_plans")
        .select("total_calories, protein_grams, carbs_grams, fat_grams, restrictions, recommended_foods, avoided_foods, meals, supplements, observations, status, start_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase.from("training_plans")
        .select("sport, frequency_per_week, sessions, periodization_notes, observations, status, start_date, strava_details")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase.from("exams")
        .select("name, exam_type, status, result, findings, interpretation, requested_date, completed_date")
        .eq("patient_id", patientId)
        .order("requested_date", { ascending: false })
        .limit(20),
      supabase.from("supplements_log")
        .select("product, quantity, timing, log_date, notes")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false })
        .limit(20),
      supabase.from("goals")
        .select("title, status, category, progress, target_date")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .limit(10),
      supabase.from("patient_goals")
        .select("goal, priority, status, target_date, target_metrics, baseline_snapshot, notes")
        .eq("patient_id", patientId)
        .in("status", ["ativo", "pausado"])
        .limit(10),
    ]);

    // Separate active and resolved diagnoses
    const allDiagnoses = diagRes.data || [];
    const activeDiagnoses = allDiagnoses.filter((d: any) => d.status === "active");
    const resolvedDiagnoses = allDiagnoses.filter((d: any) => d.status !== "active");

    // Separate active and past treatments
    const allTreatments = treatRes.data || [];
    const activeTreatments = allTreatments.filter((t: any) => t.status === "active");
    const pastTreatments = allTreatments.filter((t: any) => t.status !== "active").slice(0, 10);

    // Nutrition
    const activeNutrition = (nutritionRes.data || []).find((n: any) => n.status === "active") || null;

    // Training
    const activeTraining = (trainingRes.data || []).find((t: any) => t.status === "active") || null;

    // Build structured sections
    const diagSection = activeDiagnoses.length > 0
      ? activeDiagnoses.map((d: any) => `- ${d.name}${d.icd_code ? ` (CID: ${d.icd_code})` : ""} | Severidade: ${d.severity || "não informada"} | Desde: ${d.diagnosed_date}${d.public_notes ? ` | Obs: ${d.public_notes}` : ""}`).join("\n")
      : "Sem diagnósticos ativos registrados";

    const resolvedDiagSection = resolvedDiagnoses.length > 0
      ? resolvedDiagnoses.slice(0, 5).map((d: any) => `- ${d.name} (${d.status}) | Resolvido em: ${d.resolved_date || "não informado"}`).join("\n")
      : "Nenhum";

    const treatSection = activeTreatments.length > 0
      ? activeTreatments.map((t: any) => `- ${t.name}${t.dosage ? ` | Dose: ${t.dosage}` : ""}${t.frequency ? ` | Frequência: ${t.frequency}` : ""} | Início: ${t.start_date || "não informado"}${t.public_notes ? ` | Obs: ${t.public_notes}` : ""}`).join("\n")
      : "Sem medicamentos ou tratamentos ativos";

    const labResults = (labRes.data || []).slice(0, 30);
    const labSection = labResults.length > 0
      ? labResults.map((l: any) => `- ${l.marker_name}: ${l.value ?? "N/A"} ${l.unit || ""} (Ref: ${l.reference_min ?? "?"}-${l.reference_max ?? "?"}) | Status: ${l.status || "N/A"} | Data: ${l.collection_date}`).join("\n")
      : "Sem exames laboratoriais registrados";

    const exams = examsRes.data || [];
    const completedExams = exams.filter((e: any) => e.status === "completed");
    const examsSection = completedExams.length > 0
      ? completedExams.map((e: any) => `- ${e.name}${e.exam_type ? ` (${e.exam_type})` : ""} | Data: ${e.completed_date || e.requested_date}${e.result ? ` | Resultado: ${e.result}` : ""}${e.findings ? ` | Achados: ${e.findings}` : ""}${e.interpretation ? ` | Interpretação: ${e.interpretation}` : ""}`).join("\n")
      : "Sem exames de imagem/complementares registrados";

    const nutritionSection = activeNutrition
      ? [
          `Calorias: ${activeNutrition.total_calories ?? "N/A"} kcal`,
          `Proteínas: ${activeNutrition.protein_grams ?? "N/A"}g | Carboidratos: ${activeNutrition.carbs_grams ?? "N/A"}g | Gorduras: ${activeNutrition.fat_grams ?? "N/A"}g`,
          activeNutrition.restrictions?.length ? `Restrições: ${activeNutrition.restrictions.join(", ")}` : null,
          activeNutrition.recommended_foods?.length ? `Alimentos recomendados: ${activeNutrition.recommended_foods.join(", ")}` : null,
          activeNutrition.avoided_foods?.length ? `Alimentos evitados: ${activeNutrition.avoided_foods.join(", ")}` : null,
          activeNutrition.observations ? `Observações: ${activeNutrition.observations}` : null,
        ].filter(Boolean).join("\n")
      : "Sem plano nutricional ativo";

    const supplements = supplementsRes.data || [];
    const supplementsSection = supplements.length > 0
      ? supplements.map((s: any) => `- ${s.product}${s.quantity ? ` (${s.quantity})` : ""} | Horário: ${s.timing} | Data: ${s.log_date}${s.notes ? ` | Obs: ${s.notes}` : ""}`).join("\n")
      : "Sem registros de suplementação";

    // Training + Strava detailed data
    const stravaDetails = activeTraining?.strava_details as any;
    const stravaActivities: any[] = stravaDetails?.activities || [];

    const formatPace = (speedMs: number) => {
      if (!speedMs || speedMs <= 0) return "N/A";
      const paceMin = 1000 / speedMs / 60;
      const mins = Math.floor(paceMin);
      const secs = Math.round((paceMin - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, "0")} min/km`;
    };

    let trainingSection: string;
    if (stravaActivities.length > 0) {
      // Detailed Strava section
      const activityLines = stravaActivities.map((a: any) => {
        const distKm = ((a.distance || 0) / 1000).toFixed(2);
        const durMin = Math.round((a.moving_time || 0) / 60);
        const date = a.start_date_local ? a.start_date_local.split("T")[0] : "N/A";
        let line = `📍 ${a.name} | ${a.type} | ${date}\n`;
        line += `  Distância: ${distKm} km | Duração: ${durMin} min | Pace médio: ${a.average_speed ? formatPace(a.average_speed) : "N/A"}\n`;
        line += `  FC média: ${a.average_heartrate ?? "N/A"} bpm | FC máxima: ${a.max_heartrate ?? "N/A"} bpm\n`;
        line += `  Velocidade média: ${a.average_speed ? ((a.average_speed * 3.6).toFixed(1) + " km/h") : "N/A"} | Velocidade máxima: ${a.max_speed ? ((a.max_speed * 3.6).toFixed(1) + " km/h") : "N/A"}\n`;
        line += `  Ganho de elevação: ${a.total_elevation_gain ?? "N/A"} m | Alt. máxima: ${a.elev_high ?? "N/A"} m | Alt. mínima: ${a.elev_low ?? "N/A"} m\n`;
        line += `  Carga estimada (suffer score): ${a.suffer_score ?? "N/A"} | Calorias: ${a.calories ?? "N/A"} kcal`;
        if (a.laps && a.laps.length > 0) {
          line += "\n  Análise por trechos (laps):";
          a.laps.forEach((lap: any, i: number) => {
            const lapDist = ((lap.distance || 0) / 1000).toFixed(2);
            line += `\n    Trecho ${i + 1}: ${lapDist} km | Pace ${lap.average_speed ? formatPace(lap.average_speed) : "N/A"} | FC ${lap.average_heartrate ?? "N/A"} bpm | Vel. ${lap.average_speed ? ((lap.average_speed * 3.6).toFixed(1) + " km/h") : "N/A"} | Elevação +${lap.total_elevation_gain ?? 0} m`;
          });
        }
        return line;
      }).join("\n\n");

      // Summary stats
      const totalDist = stravaActivities.reduce((s: number, a: any) => s + (a.distance || 0), 0);
      const totalTime = stravaActivities.reduce((s: number, a: any) => s + (a.moving_time || 0), 0);
      const avgHrs = stravaActivities.filter((a: any) => a.average_heartrate);
      const avgHr = avgHrs.length > 0 ? Math.round(avgHrs.reduce((s: number, a: any) => s + a.average_heartrate, 0) / avgHrs.length) : null;
      const maxHr = stravaActivities.reduce((max: number, a: any) => Math.max(max, a.max_heartrate || 0), 0);

      trainingSection = `${activityLines}

RESUMO DO PERÍODO:
Volume total: ${(totalDist / 1000).toFixed(1)} km | ${(totalTime / 3600).toFixed(1)} horas de treino
FC média geral: ${avgHr ?? "N/A"} bpm | FC máxima registrada: ${maxHr || "N/A"} bpm
Total de atividades: ${stravaActivities.length}
Fonte: Strava (dados sincronizados)`;
    } else if (activeTraining) {
      trainingSection = [
        `Modalidade: ${activeTraining.sport || "não informada"}`,
        `Frequência: ${activeTraining.frequency_per_week ?? "N/A"}x/semana`,
        `Sessões planejadas: ${Array.isArray(activeTraining.sessions) ? activeTraining.sessions.length : 0}`,
        activeTraining.periodization_notes ? `Periodização: ${activeTraining.periodization_notes}` : null,
        activeTraining.observations ? `Observações: ${activeTraining.observations}` : null,
      ].filter(Boolean).join("\n");
    } else {
      trainingSection = "Sem plano de treino ativo e sem dados do Strava";
    }

    const goalsSection = (goalsRes.data || []).length > 0
      ? (goalsRes.data || []).map((g: any) => `- ${g.title} | Categoria: ${g.category || "geral"} | Progresso: ${g.progress ?? 0}%${g.target_date ? ` | Meta: ${g.target_date}` : ""}`).join("\n")
      : "Sem metas ativas";

    // Patient Goals (structured health goals with metrics)
    const GOAL_LABELS: Record<string, string> = {
      longevidade: "Longevidade",
      performance_aerobica: "Performance Aeróbica",
      performance_forca: "Performance e Força",
      perda_de_peso: "Perda de Peso",
      ganho_de_massa: "Ganho de Massa",
      saude_metabolica: "Saúde Metabólica",
      saude_cardiovascular: "Saúde Cardiovascular",
      bem_estar_geral: "Bem-estar Geral",
    };

    const patientGoals = patientGoalsRes.data || [];
    const patientGoalsSection = patientGoals.length > 0
      ? patientGoals.map((g: any) => {
          const label = GOAL_LABELS[g.goal] || g.goal;
          const priority = g.priority === "primario" ? "Principal" : "Secundário";
          let line = `- ${label} (${priority}) | Status: ${g.status}`;
          if (g.target_date) line += ` | Prazo: ${g.target_date}`;
          if (g.target_metrics && Object.keys(g.target_metrics).length > 0) {
            line += ` | Métricas alvo: ${JSON.stringify(g.target_metrics)}`;
          }
          if (g.baseline_snapshot) {
            line += `\n  Linha de base quando definiu o objetivo: ${JSON.stringify(g.baseline_snapshot)}`;
          }
          if (g.notes) line += `\n  Notas: ${g.notes}`;
          return line;
        }).join("\n")
      : "Sem objetivos de saúde definidos";

    // Check if there's any data at all
    const hasData = labResults.length > 0 ||
      activeDiagnoses.length > 0 ||
      activeTreatments.length > 0 ||
      activeNutrition !== null ||
      activeTraining !== null ||
      stravaActivities.length > 0 ||
      completedExams.length > 0 ||
      supplements.length > 0;

    if (!hasData) {
      return new Response(JSON.stringify({
        insights: [],
        summary: "Ainda não há dados suficientes para gerar insights. Faça upload de exames ou aguarde seus profissionais registrarem informações clínicas.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente médico de suporte clínico especializado em análise integrada de saúde, respondendo em português brasileiro.

Analise o perfil completo do paciente abaixo, considerando TODAS as dimensões de saúde de forma integrada. Identifique relações entre diagnósticos, medicações, exames, nutrição e atividade física. Gere insights clínicos relevantes, padrões e recomendações personalizadas.

IMPORTANTE:
- NÃO faça diagnósticos definitivos nem prescrições
- Use linguagem simples, acessível e acolhedora
- Sempre recomende consultar o profissional de saúde para decisões clínicas
- CONECTE os dados entre si: analise como diagnósticos se relacionam com tratamentos, como a nutrição pode impactar os exames, como o treino se conecta com os resultados laboratoriais
- Identifique sinergias e potenciais conflitos entre tratamentos, nutrição e atividade física
- Se uma seção mostrar "Sem registros", considere isso como lacuna informacional e sugira ao paciente registrar esses dados
- Se houver dados detalhados do Strava (frequência cardíaca, pace, elevação, suffer score, laps), analise especificamente:
  * Impacto cardiovascular dos treinos considerando diagnósticos e medicações do paciente
  * Se há sinais de sobrecarga (FC muito elevada, suffer score alto, redução de pace ao longo das sessões)
  * Relação entre volume de treino e resultados de exames (ex: glicemia, colesterol, pressão)
  * Adequação da intensidade ao perfil clínico do paciente
  * Evolução do condicionamento (melhora ou piora de pace/FC entre atividades)
  * Recomendações de ajuste de treino baseadas no histórico médico completo

- Se o paciente tiver OBJETIVOS DE SAÚDE definidos (com métricas alvo e linha de base), direcione os insights para esses objetivos específicos: compare a linha de base com os dados atuais, avalie o progresso, sugira ajustes e identifique se os tratamentos/treinos/nutrição estão alinhados com os objetivos

Com base em TODAS as informações integradas do paciente, forneça:
1. Resumo geral do estado de saúde atual
2. Relações importantes entre as diferentes áreas (ex: como os treinos impactam os exames, como a nutrição se relaciona com os diagnósticos)
3. Alertas ou pontos de atenção
4. Recomendações práticas e personalizadas
5. Evolução percebida com base nos dados disponíveis
6. Progresso em relação aos objetivos definidos pelo paciente

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) no formato:
{
  "summary": "Resumo geral de 3-5 frases sobre a saúde do paciente, conectando os diferentes aspectos e a evolução percebida",
  "insights": [
    {
      "category": "exames" | "nutricao" | "treino" | "estilo_de_vida" | "atencao" | "positivo" | "conexao" | "medicacao" | "meta",
      "title": "Título curto do insight",
      "description": "Descrição de 2-4 frases com recomendação prática",
      "priority": "info" | "attention" | "positive"
    }
  ]
}

Gere entre 4 e 10 insights relevantes. Use a categoria "conexao" para insights que cruzam dados de diferentes áreas. Use "atencao" para alertas clínicos. Use "positivo" para pontos favoráveis.`;

    const userPrompt = `PERFIL DO PACIENTE:
Nome: ${patientName}
Idade: ${age !== null ? `${age} anos` : "não informada"}
Tipo sanguíneo: ${patientRes.data?.blood_type || "não informado"}
Alergias: ${(patientRes.data?.allergies || []).length > 0 ? patientRes.data.allergies.join(", ") : "nenhuma registrada"}

DIAGNÓSTICOS ATIVOS:
${diagSection}

HISTÓRICO DE DIAGNÓSTICOS RESOLVIDOS:
${resolvedDiagSection}

MEDICAMENTOS E TRATAMENTOS ATUAIS:
${treatSection}

EXAMES LABORATORIAIS RECENTES:
${labSection}

EXAMES COMPLEMENTARES/IMAGEM:
${examsSection}

PLANO NUTRICIONAL ATIVO:
${nutritionSection}

SUPLEMENTAÇÃO RECENTE:
${supplementsSection}

ATIVIDADE FÍSICA — DADOS DE TREINO${stravaActivities.length > 0 ? " (STRAVA DETALHADO)" : ""}:
${trainingSection}

METAS DE SAÚDE ATIVAS:
${goalsSection}

OBJETIVOS ATIVOS DO PACIENTE (com métricas e linha de base):
${patientGoalsSection}`;

    console.log("Sending context to AI with sections:", {
      diagnoses: activeDiagnoses.length,
      treatments: activeTreatments.length,
      labResults: labResults.length,
      exams: completedExams.length,
      hasNutrition: !!activeNutrition,
      hasTraining: !!activeTraining,
      stravaActivities: stravaActivities.length,
      supplements: supplements.length,
      goals: (goalsRes.data || []).length,
      patientGoals: patientGoals.length,
    });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas solicitações. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para gerar insights." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        summary: "Não foi possível processar os insights no momento. Tente novamente mais tarde.",
        insights: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-health-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
