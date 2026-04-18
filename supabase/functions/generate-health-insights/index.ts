import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERFORMANCE_SYSTEM_PROMPT = `Você é um especialista em medicina esportiva e longevidade para adultos ativos.
Analise os dados de saúde com foco em:
- Performance física: VO2max estimado, zonas de treino, recuperação, HRV
- Dados do Strava se disponíveis: carga de treino, distribuição de intensidade, tendências de pace e frequência cardíaca por trecho
- Marcadores laboratoriais relevantes para performance: ferritina, vitamina D, testosterona/estradiol, PCR, hemograma completo
- Composição corporal e tendências de peso
- Sono e recuperação
- Riscos de overtraining ou lesão
- Oportunidades de otimização baseadas nos dados longitudinais

Gere insights acionáveis com evidência científica. Seja direto e quantitativo.

IMPORTANTE:
- NÃO faça diagnósticos definitivos nem prescrições
- Use linguagem simples, acessível e acolhedora
- Sempre recomende consultar o profissional de saúde para decisões clínicas
- CONECTE os dados entre si
- Se houver dados detalhados do Strava, analise impacto cardiovascular, sinais de sobrecarga, evolução do condicionamento
- Se o paciente tiver OBJETIVOS DE SAÚDE definidos, direcione os insights para esses objetivos

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) no formato:
{
  "summary": "Resumo geral de 3-5 frases sobre a saúde do paciente",
  "insights": [
    {
      "category": "exames" | "nutricao" | "treino" | "estilo_de_vida" | "atencao" | "positivo" | "conexao" | "medicacao" | "meta",
      "title": "Título curto do insight",
      "description": "Descrição de 2-4 frases com recomendação prática",
      "priority": "info" | "attention" | "positive"
    }
  ]
}

Gere entre 4 e 10 insights relevantes. Use "conexao" para insights que cruzam dados de diferentes áreas. Use "atencao" para alertas. Use "positivo" para pontos favoráveis.`;

const GERIATRIC_SYSTEM_PROMPT = `Você é um especialista em geriatria e medicina interna com foco em manejo de doenças crônicas em idosos. Analise os dados com atenção especial a:

PRESSÃO ARTERIAL (HAS):
- Avaliar controle pressórico com base nos registros de sinais vitais
- Identificar padrões: hipertensão matinal, variabilidade excessiva, episódios de hipotensão ortostática
- Alvo: PA < 130/80 para maioria dos idosos, < 140/90 se fragilidade alta
- Alertar se PA sistólica > 160 em mais de 30% das medições da semana

DIABETES (DM2):
- Avaliar controle glicêmico: média, variabilidade, episódios de hipoglicemia
- Atenção especial a hipoglicemia em idosos (risco de queda e demência)
- Alvo glicêmico individualizado: HbA1c < 7.5% se sem fragilidade, < 8% se frágil
- Verificar padrão pós-prandial vs jejum

INSUFICIÊNCIA CARDÍACA (ICC):
- Monitorar variação de peso (> 2kg em 3 dias = sinal de alerta)
- Identificar sintomas de descompensação: dispneia, edema, fadiga
- Avaliar adesão à restrição hídrica e salina se registrada

RISCO DE QUEDA:
- Analisar relatos de tontura, hipotensão, fraqueza nos sintomas diários
- Identificar medicamentos de risco (betabloqueadores, diuréticos, BZD se informados)
- Recomendar avaliação de força e equilíbrio se múltiplos fatores de risco

POLIFARMÁCIA:
- Se paciente usa 5 ou mais medicamentos, alertar para risco de interação
- Identificar medicamentos potencialmente inapropriados em idosos (critérios Beers)
- Sugerir revisão farmacológica periódica

FRAGILIDADE:
- Estimar escore de fragilidade com base em: peso, bem-estar subjetivo, sintomas, exames (albumina, hemoglobina se disponíveis)
- Categorizar: Robusto / Pré-frágil / Frágil
- Adaptar metas clínicas à categoria de fragilidade

FORMATO DA RESPOSTA:
Estruture sempre em: (1) Resumo do período, (2) Alertas prioritários, (3) Tendências positivas, (4) Recomendações para próxima consulta.
Seja clínico e preciso. Mencione valores numéricos específicos dos registros.

IMPORTANTE:
- NÃO faça diagnósticos definitivos nem prescrições
- Sempre recomende consultar o profissional de saúde para decisões clínicas
- Se o paciente tiver OBJETIVOS DE SAÚDE definidos, direcione os insights para esses objetivos

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) no formato:
{
  "summary": "Resumo geral de 3-5 frases sobre a saúde do paciente",
  "insights": [
    {
      "category": "exames" | "nutricao" | "treino" | "estilo_de_vida" | "atencao" | "positivo" | "conexao" | "medicacao" | "meta",
      "title": "Título curto do insight",
      "description": "Descrição de 2-4 frases com recomendação prática",
      "priority": "info" | "attention" | "positive"
    }
  ]
}

Gere entre 4 e 10 insights relevantes. Use "conexao" para insights que cruzam dados. Use "atencao" para alertas clínicos. Use "positivo" para pontos favoráveis.`;

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
    const isGeriatricProfile = age !== null && age >= 50;

    // Step 2: all clinical data in parallel (including vitals_log and alerts)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [diagRes, treatRes, nutritionRes, trainingRes, examsRes, supplementsRes, goalsRes, patientGoalsRes, vitalsRes, alertsRes, consultationsRes] = await Promise.all([
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
      // Vital signs - last 30 days
      supabase.from("vital_signs")
        .select("type, systolic, diastolic, heart_rate, glucose, glucose_moment, weight, symptoms, wellbeing, recorded_at, created_at")
        .eq("patient_id", patientId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(100),
      // Alerts from last 30 days
      supabase.from("vitals_alerts")
        .select("alert_type, severity, message, acknowledged, created_at")
        .eq("patient_id", patientId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(50),
      // Last consultation
      supabase.from("consultations")
        .select("consultation_date, chief_complaint, assessment, plan, notes")
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: false })
        .limit(1),
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

    // Vitals section
    const vitals = vitalsRes.data || [];
    let vitalsSection = "Sem registros de sinais vitais no período";
    if (vitals.length > 0) {
      const paReadings = vitals.filter((v: any) => v.type === "pa");
      const glucoseReadings = vitals.filter((v: any) => v.type === "glicemia");
      const weightReadings = vitals.filter((v: any) => v.type === "peso");
      const symptomReadings = vitals.filter((v: any) => v.type === "sintoma");

      const parts: string[] = [];

      if (paReadings.length > 0) {
        const avgSys = Math.round(paReadings.reduce((s: number, v: any) => s + (v.systolic || 0), 0) / paReadings.length);
        const avgDia = Math.round(paReadings.reduce((s: number, v: any) => s + (v.diastolic || 0), 0) / paReadings.length);
        const avgHr = Math.round(paReadings.reduce((s: number, v: any) => s + (v.heart_rate || 0), 0) / paReadings.length);
        const highCount = paReadings.filter((v: any) => v.systolic >= 160 || v.diastolic >= 100).length;
        parts.push(`PRESSÃO ARTERIAL (${paReadings.length} medições):
  Média: ${avgSys}/${avgDia} mmHg | FC média: ${avgHr} bpm
  Medições elevadas (≥160/100): ${highCount} (${Math.round(highCount / paReadings.length * 100)}%)
  Registros: ${paReadings.slice(0, 10).map((v: any) => `${v.systolic}/${v.diastolic} FC${v.heart_rate} (${new Date(v.recorded_at || v.created_at).toLocaleDateString("pt-BR")})`).join(", ")}`);
      }

      if (glucoseReadings.length > 0) {
        const avgGlc = Math.round(glucoseReadings.reduce((s: number, v: any) => s + (v.glucose || 0), 0) / glucoseReadings.length);
        const hypoCount = glucoseReadings.filter((v: any) => v.glucose < 70).length;
        const hyperCount = glucoseReadings.filter((v: any) => v.glucose > 250).length;
        parts.push(`GLICEMIA (${glucoseReadings.length} medições):
  Média: ${avgGlc} mg/dL
  Hipoglicemias (<70): ${hypoCount} | Hiperglicemias (>250): ${hyperCount}
  Registros: ${glucoseReadings.slice(0, 10).map((v: any) => `${v.glucose} mg/dL ${v.glucose_moment || ""} (${new Date(v.recorded_at || v.created_at).toLocaleDateString("pt-BR")})`).join(", ")}`);
      }

      if (weightReadings.length > 0) {
        const latest = weightReadings[0];
        const oldest = weightReadings[weightReadings.length - 1];
        const delta = latest.weight - oldest.weight;
        parts.push(`PESO (${weightReadings.length} registros):
  Atual: ${latest.weight} kg | Variação no período: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg
  Registros: ${weightReadings.slice(0, 10).map((v: any) => `${v.weight}kg (${new Date(v.recorded_at || v.created_at).toLocaleDateString("pt-BR")})`).join(", ")}`);
      }

      if (symptomReadings.length > 0) {
        const allSymptoms: Record<string, number> = {};
        symptomReadings.forEach((v: any) => {
          (v.symptoms || []).forEach((s: string) => { allSymptoms[s] = (allSymptoms[s] || 0) + 1; });
        });
        const wellbeingScores = symptomReadings.filter((v: any) => v.wellbeing != null);
        const avgWellbeing = wellbeingScores.length > 0
          ? (wellbeingScores.reduce((s: number, v: any) => s + v.wellbeing, 0) / wellbeingScores.length).toFixed(1)
          : "N/A";
        parts.push(`SINTOMAS (${symptomReadings.length} registros):
  Frequência: ${Object.entries(allSymptoms).sort((a, b) => b[1] - a[1]).map(([s, c]) => `${s} (${c}x)`).join(", ")}
  Bem-estar subjetivo médio: ${avgWellbeing}/10`);
      }

      vitalsSection = parts.join("\n\n");
    }

    // Alerts section
    const alerts = alertsRes.data || [];
    const alertsSection = alerts.length > 0
      ? alerts.map((a: any) => `- [${a.severity}] ${a.alert_type}: ${a.message} (${new Date(a.created_at).toLocaleDateString("pt-BR")})${a.acknowledged ? " ✓ reconhecido" : ""}`).join("\n")
      : "Nenhum alerta gerado no período";

    // Last consultation
    const lastConsultation = (consultationsRes.data || [])[0];
    const consultationSection = lastConsultation
      ? `Data: ${new Date(lastConsultation.consultation_date).toLocaleDateString("pt-BR")}
  Queixa: ${lastConsultation.chief_complaint || "N/A"}
  Avaliação: ${lastConsultation.assessment || "N/A"}
  Plano: ${lastConsultation.plan || "N/A"}
  Notas: ${lastConsultation.notes || "N/A"}`
      : "Nenhuma consulta registrada";

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

    // Patient Goals
    const GOAL_LABELS: Record<string, string> = {
      longevidade: "Longevidade", performance_aerobica: "Performance Aeróbica",
      performance_forca: "Performance e Força", perda_de_peso: "Perda de Peso",
      ganho_de_massa: "Ganho de Massa", saude_metabolica: "Saúde Metabólica",
      saude_cardiovascular: "Saúde Cardiovascular", bem_estar_geral: "Bem-estar Geral",
    };

    const patientGoals = patientGoalsRes.data || [];
    const patientGoalsSection = patientGoals.length > 0
      ? patientGoals.map((g: any) => {
          const label = GOAL_LABELS[g.goal] || g.goal;
          const priority = g.priority === "primario" ? "Principal" : "Secundário";
          let line = `- ${label} (${priority}) | Status: ${g.status}`;
          if (g.target_date) line += ` | Prazo: ${g.target_date}`;
          if (g.target_metrics && Object.keys(g.target_metrics).length > 0) line += ` | Métricas alvo: ${JSON.stringify(g.target_metrics)}`;
          if (g.baseline_snapshot) line += `\n  Linha de base: ${JSON.stringify(g.baseline_snapshot)}`;
          if (g.notes) line += `\n  Notas: ${g.notes}`;
          return line;
        }).join("\n")
      : "Sem objetivos de saúde definidos";

    // Check if there's any data at all
    const hasData = labResults.length > 0 || activeDiagnoses.length > 0 || activeTreatments.length > 0 ||
      activeNutrition !== null || activeTraining !== null || stravaActivities.length > 0 ||
      completedExams.length > 0 || supplements.length > 0 || vitals.length > 0;

    if (!hasData) {
      return new Response(JSON.stringify({
        insights: [],
        summary: "Ainda não há dados suficientes para gerar insights. Faça upload de exames ou aguarde seus profissionais registrarem informações clínicas.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Select system prompt based on age
    const systemPrompt = isGeriatricProfile ? GERIATRIC_SYSTEM_PROMPT : PERFORMANCE_SYSTEM_PROMPT;

    // Build comorbidities and medications from diagnoses/treatments
    const comorbidities = activeDiagnoses.map((d: any) => d.name).join(", ") || "nenhuma registrada";
    const medications = activeTreatments.map((t: any) => `${t.name}${t.dosage ? ` ${t.dosage}` : ""}`).join(", ") || "nenhum registrado";

    const today = new Date();
    const periodStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userPrompt = `Paciente: ${patientName}, ${age !== null ? `${age} anos` : "idade não informada"}.
Tipo sanguíneo: ${patientRes.data?.blood_type || "não informado"}
Alergias: ${(patientRes.data?.allergies || []).length > 0 ? patientRes.data.allergies.join(", ") : "nenhuma registrada"}
Comorbidades: ${comorbidities}
Medicamentos: ${medications}
Dados do período ${periodStart.toLocaleDateString("pt-BR")} a ${today.toLocaleDateString("pt-BR")}:

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

SINAIS VITAIS (ÚLTIMOS 30 DIAS):
${vitalsSection}

ALERTAS GERADOS NO PERÍODO:
${alertsSection}

ÚLTIMA CONSULTA REGISTRADA:
${consultationSection}

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
      profile: isGeriatricProfile ? "geriatric (≥50)" : "performance (<50)",
      age,
      diagnoses: activeDiagnoses.length,
      treatments: activeTreatments.length,
      labResults: labResults.length,
      exams: completedExams.length,
      vitals: vitals.length,
      alerts: alerts.length,
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
