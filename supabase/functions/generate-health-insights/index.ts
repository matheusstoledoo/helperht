import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculateHealthScore(data: {
  labResults: any[],
  vitals: any[],
  activeTraining: any,
  activeNutrition: any,
  activeDiagnoses: any[],
  stravaActivities: any[],
  workoutLogs: any[],
  age: number | null,
}): { score: number, score_label: string, domain_scores: Record<string, number>, domain_details: Record<string, string> } {
  const domains: Record<string, number> = {};
  const details: Record<string, string> = {};

  // ── 1. PRESSÃO ARTERIAL ──
  const paReadings = data.vitals.filter((v: any) => v.type === "pressao" && v.systolic);
  if (paReadings.length > 0) {
    const avgSys = paReadings.reduce((s: number, v: any) => s + v.systolic, 0) / paReadings.length;
    const avgDia = paReadings.reduce((s: number, v: any) => s + v.diastolic, 0) / paReadings.length;
    if (avgSys < 120 && avgDia < 80) { domains.pressao = 100; details.pressao = `${Math.round(avgSys)}/${Math.round(avgDia)} mmHg — Ótimo`; }
    else if (avgSys < 130 && avgDia < 80) { domains.pressao = 80; details.pressao = `${Math.round(avgSys)}/${Math.round(avgDia)} mmHg — Normal-alto`; }
    else if (avgSys < 140 && avgDia < 90) { domains.pressao = 60; details.pressao = `${Math.round(avgSys)}/${Math.round(avgDia)} mmHg — Grau 1`; }
    else if (avgSys < 160 && avgDia < 100) { domains.pressao = 40; details.pressao = `${Math.round(avgSys)}/${Math.round(avgDia)} mmHg — Grau 2`; }
    else { domains.pressao = 20; details.pressao = `${Math.round(avgSys)}/${Math.round(avgDia)} mmHg — Grau 3`; }
  } else { domains.pressao = 50; details.pressao = "Sem dados — score neutro aplicado"; }

  // ── 2. GLICEMIA ──
  const glucoseMarkers = data.labResults.filter((l: any) =>
    ['glicose', 'glicemia', 'glucose', 'glicose em jejum', 'glicemia de jejum'].includes((l.marker_name || '').toLowerCase())
  );
  const hba1cMarkers = data.labResults.filter((l: any) =>
    ['hba1c', 'hemoglobina glicada', 'hemoglobina a1c', 'a1c'].includes((l.marker_name || '').toLowerCase())
  );
  const glucoseVitals = data.vitals.filter((v: any) => v.type === "glicemia" && v.glucose);
  let glucoseScore = 50;
  if (hba1cMarkers.length > 0) {
    const hba1c = parseFloat(hba1cMarkers[0].value);
    if (hba1c < 5.7) { glucoseScore = 100; details.glicemia = `HbA1c ${hba1c}% — Ótimo`; }
    else if (hba1c < 6.0) { glucoseScore = 75; details.glicemia = `HbA1c ${hba1c}% — Limítrofe`; }
    else if (hba1c < 6.5) { glucoseScore = 50; details.glicemia = `HbA1c ${hba1c}% — Pré-diabetes`; }
    else if (hba1c < 7.0) { glucoseScore = 30; details.glicemia = `HbA1c ${hba1c}% — Diabetes controlado`; }
    else { glucoseScore = 10; details.glicemia = `HbA1c ${hba1c}% — Diabetes descontrolado`; }
  } else if (glucoseMarkers.length > 0) {
    const g = parseFloat(glucoseMarkers[0].value);
    if (g < 100) { glucoseScore = 100; details.glicemia = `Glicose ${g} mg/dL — Ótimo`; }
    else if (g < 110) { glucoseScore = 75; details.glicemia = `Glicose ${g} mg/dL — Limítrofe`; }
    else if (g < 126) { glucoseScore = 50; details.glicemia = `Glicose ${g} mg/dL — Pré-diabetes`; }
    else { glucoseScore = 20; details.glicemia = `Glicose ${g} mg/dL — Critério de diabetes`; }
  } else if (glucoseVitals.length > 0) {
    const avg = glucoseVitals.reduce((s: number, v: any) => s + v.glucose, 0) / glucoseVitals.length;
    if (avg < 100) { glucoseScore = 100; details.glicemia = `Glicemia média ${Math.round(avg)} mg/dL — Ótimo`; }
    else if (avg < 126) { glucoseScore = 55; details.glicemia = `Glicemia média ${Math.round(avg)} mg/dL — Atenção`; }
    else { glucoseScore = 20; details.glicemia = `Glicemia média ${Math.round(avg)} mg/dL — Elevada`; }
  } else { details.glicemia = "Sem dados — score neutro aplicado"; }
  domains.glicemia = glucoseScore;

  // ── 3. COLESTEROL ──
  const ldlMarker = data.labResults.find((l: any) =>
    ['ldl', 'ldl-c', 'ldl colesterol', 'colesterol ldl'].includes((l.marker_name || '').toLowerCase())
  );
  const totalChol = data.labResults.find((l: any) =>
    ['colesterol total', 'cholesterol total', 'colesterol'].includes((l.marker_name || '').toLowerCase())
  );
  if (ldlMarker) {
    const ldl = parseFloat(ldlMarker.value);
    if (ldl < 100) { domains.colesterol = 100; details.colesterol = `LDL ${ldl} mg/dL — Ótimo`; }
    else if (ldl < 116) { domains.colesterol = 80; details.colesterol = `LDL ${ldl} mg/dL — Bom`; }
    else if (ldl < 130) { domains.colesterol = 60; details.colesterol = `LDL ${ldl} mg/dL — Limítrofe`; }
    else if (ldl < 160) { domains.colesterol = 40; details.colesterol = `LDL ${ldl} mg/dL — Elevado`; }
    else { domains.colesterol = 15; details.colesterol = `LDL ${ldl} mg/dL — Muito elevado`; }
  } else if (totalChol) {
    const tc = parseFloat(totalChol.value);
    if (tc < 170) { domains.colesterol = 100; details.colesterol = `Col. total ${tc} mg/dL — Ótimo`; }
    else if (tc < 200) { domains.colesterol = 75; details.colesterol = `Col. total ${tc} mg/dL — Bom`; }
    else if (tc < 240) { domains.colesterol = 50; details.colesterol = `Col. total ${tc} mg/dL — Limítrofe`; }
    else { domains.colesterol = 20; details.colesterol = `Col. total ${tc} mg/dL — Elevado`; }
  } else { domains.colesterol = 50; details.colesterol = "Sem dados — score neutro aplicado"; }

  // ── 4. IMC ──
  const weightReadings = data.vitals.filter((v: any) => v.type === "peso" && v.weight);
  const heightMarker = data.labResults.find((l: any) =>
    ['altura', 'height'].includes((l.marker_name || '').toLowerCase())
  );
  if (weightReadings.length > 0 && heightMarker) {
    const weight = weightReadings[0].weight;
    const height = parseFloat(heightMarker.value) / 100;
    const bmi = weight / (height * height);
    if (bmi < 25) { domains.imc = 100; details.imc = `IMC ${bmi.toFixed(1)} — Eutrófico`; }
    else if (bmi < 27.5) { domains.imc = 75; details.imc = `IMC ${bmi.toFixed(1)} — Sobrepeso leve`; }
    else if (bmi < 30) { domains.imc = 55; details.imc = `IMC ${bmi.toFixed(1)} — Sobrepeso`; }
    else if (bmi < 35) { domains.imc = 35; details.imc = `IMC ${bmi.toFixed(1)} — Obesidade grau 1`; }
    else { domains.imc = 15; details.imc = `IMC ${bmi.toFixed(1)} — Obesidade grau 2+`; }
  } else if (weightReadings.length > 0) {
    domains.imc = 50; details.imc = "Peso registrado mas altura não disponível — score neutro";
  } else { domains.imc = 50; details.imc = "Sem dados de peso — score neutro aplicado"; }

  // ── 5. ATIVIDADE FÍSICA ──
  let activityScore = 0;
  if (data.workoutLogs && data.workoutLogs.length > 0) {
    // Usar workout_logs como fonte primária
    const last28Days = data.workoutLogs.filter((l: any) => {
      const d = new Date(l.activity_date);
      return d >= new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    });
    const totalMinutes = last28Days.reduce((s: number, l: any) => s + (l.duration_minutes || 0), 0);
    const weeklyMin = totalMinutes / 4;
    if (weeklyMin >= 150) { activityScore = 100; details.atividade = `${Math.round(weeklyMin)} min/semana (${last28Days.length} treinos) — Ótimo`; }
    else if (weeklyMin >= 90) { activityScore = 75; details.atividade = `${Math.round(weeklyMin)} min/semana — Bom`; }
    else if (weeklyMin >= 60) { activityScore = 55; details.atividade = `${Math.round(weeklyMin)} min/semana — Regular`; }
    else if (weeklyMin >= 30) { activityScore = 35; details.atividade = `${Math.round(weeklyMin)} min/semana — Insuficiente`; }
    else { activityScore = 15; details.atividade = `${Math.round(weeklyMin)} min/semana — Muito baixo`; }
  } else if (data.stravaActivities.length > 0) {
    // Fallback para Strava se não houver workout_logs
    const totalMinutes = data.stravaActivities.reduce((s: number, a: any) => s + (a.moving_time || 0), 0) / 60;
    const weeklyMin = totalMinutes / 4;
    if (weeklyMin >= 150) { activityScore = 100; details.atividade = `${Math.round(weeklyMin)} min/semana (Strava) — Ótimo`; }
    else if (weeklyMin >= 90) { activityScore = 75; details.atividade = `${Math.round(weeklyMin)} min/semana — Bom`; }
    else if (weeklyMin >= 60) { activityScore = 55; details.atividade = `${Math.round(weeklyMin)} min/semana — Regular`; }
    else if (weeklyMin >= 30) { activityScore = 35; details.atividade = `${Math.round(weeklyMin)} min/semana — Insuficiente`; }
    else { activityScore = 15; details.atividade = `${Math.round(weeklyMin)} min/semana — Muito baixo`; }
  } else if (data.activeTraining) {
    const freq = data.activeTraining.frequency_per_week || 0;
    if (freq >= 5) { activityScore = 100; details.atividade = `${freq}x/semana (plano) — Ótimo`; }
    else if (freq >= 4) { activityScore = 80; details.atividade = `${freq}x/semana — Bom`; }
    else if (freq >= 3) { activityScore = 60; details.atividade = `${freq}x/semana — Regular`; }
    else if (freq >= 2) { activityScore = 40; details.atividade = `${freq}x/semana — Insuficiente`; }
    else { activityScore = 20; details.atividade = `${freq}x/semana — Muito baixo`; }
  } else { activityScore = 10; details.atividade = "Sem dados de atividade física registrados"; }
  domains.atividade = activityScore;

  // ── 6. SONO/BEM-ESTAR ──
  const wellbeingReadings = data.vitals.filter((v: any) => v.wellbeing != null);
  if (wellbeingReadings.length > 0) {
    const avg = wellbeingReadings.reduce((s: number, v: any) => s + v.wellbeing, 0) / wellbeingReadings.length;
    if (avg >= 8) { domains.sono = 100; details.sono = `Bem-estar médio ${avg.toFixed(1)}/10 — Ótimo`; }
    else if (avg >= 6) { domains.sono = 70; details.sono = `Bem-estar médio ${avg.toFixed(1)}/10 — Bom`; }
    else if (avg >= 4) { domains.sono = 45; details.sono = `Bem-estar médio ${avg.toFixed(1)}/10 — Regular`; }
    else { domains.sono = 20; details.sono = `Bem-estar médio ${avg.toFixed(1)}/10 — Ruim`; }
  } else { domains.sono = 50; details.sono = "Sem dados de sono/bem-estar — score neutro aplicado"; }

  // ── 7. NUTRIÇÃO ──
  if (data.activeNutrition) {
    const cal = data.activeNutrition.total_calories;
    const protein = data.activeNutrition.protein_grams;
    let nutritionScore = 70;
    if (cal && protein) {
      const proteinPct = (protein * 4 / cal) * 100;
      if (proteinPct >= 20 && cal >= 1500 && cal <= 2800) nutritionScore = 90;
      else if (proteinPct >= 15) nutritionScore = 70;
      else nutritionScore = 50;
    }
    domains.nutricao = nutritionScore;
    details.nutricao = `Plano ativo: ${cal || 'N/A'} kcal, ${protein || 'N/A'}g proteína`;
  } else { domains.nutricao = 40; details.nutricao = "Sem plano nutricional ativo"; }

  // ── 8. TABAGISMO ──
  const smokingDx = data.activeDiagnoses.find((d: any) =>
    ['tabagismo', 'fumante', 'dependência nicotina', 'uso de tabaco'].some(t =>
      (d.name || '').toLowerCase().includes(t)
    )
  );
  if (smokingDx) {
    domains.tabagismo = 0;
    details.tabagismo = "Tabagismo ativo registrado";
  } else {
    domains.tabagismo = 100;
    details.tabagismo = "Sem tabagismo registrado";
  }

  // ── PENALIZAÇÕES ──
  const severeConditions = data.activeDiagnoses.filter((d: any) =>
    d.severity === 'severe' || d.severity === 'grave'
  );
  const totalPenalty = Math.min(severeConditions.length * 5, 20);

  const domainValues = Object.values(domains);
  const rawScore = domainValues.reduce((s, v) => s + v, 0) / domainValues.length;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore - totalPenalty)));

  let score_label: string;
  if (finalScore >= 85) score_label = "Ótimo";
  else if (finalScore >= 70) score_label = "Bom";
  else if (finalScore >= 55) score_label = "Regular";
  else if (finalScore >= 40) score_label = "Atenção";
  else score_label = "Crítico";

  return { score: finalScore, score_label, domain_scores: domains, domain_details: details };
}

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
  "score": 0-100,
  "score_label": "Ótimo" | "Bom" | "Regular" | "Atenção" | "Crítico",
  "main_markers": [
    { "name": "Nome do marcador", "value": "valor com unidade", "status": "normal" | "attention" | "altered" }
  ],
  "priorities": ["Prioridade 1 em linguagem simples", "Prioridade 2", "Prioridade 3"],
  "insights": [
    {
      "category": "exames" | "nutricao" | "treino" | "estilo_de_vida" | "atencao" | "positivo" | "conexao" | "medicacao" | "meta",
      "title": "Título curto do insight",
      "description": "Descrição de 2-4 frases com recomendação prática",
      "priority": "info" | "attention" | "positive"
    }
  ]
}

USO DE EVIDÊNCIAS CIENTÍFICAS:
- Quando disponíveis, CITE as evidências científicas fornecidas para embasar seus insights. Mencione o estudo, o achado numérico e a fonte. Exemplo: "Segundo o estudo PREDIMED (NEJM, 2013), a dieta mediterrânea reduz eventos cardiovasculares em 30%."
- Priorize evidências de nível A (ensaios clínicos e meta-análises) sobre nível B
- Conecte os dados clínicos do paciente com as evidências: se o LDL está alto E há evidência sobre meta de LDL, cite o valor-alvo da diretriz

Para "score": número de 0 a 100 representando saúde geral. Para "main_markers": até 6 marcadores mais relevantes. Para "priorities": até 3 prioridades principais.
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
  "score": 0-100,
  "score_label": "Ótimo" | "Bom" | "Regular" | "Atenção" | "Crítico",
  "main_markers": [
    { "name": "Nome do marcador", "value": "valor com unidade", "status": "normal" | "attention" | "altered" }
  ],
  "priorities": ["Prioridade 1 em linguagem simples", "Prioridade 2", "Prioridade 3"],
  "insights": [
    {
      "category": "exames" | "nutricao" | "treino" | "estilo_de_vida" | "atencao" | "positivo" | "conexao" | "medicacao" | "meta",
      "title": "Título curto do insight",
      "description": "Descrição de 2-4 frases com recomendação prática",
      "priority": "info" | "attention" | "positive"
    }
  ]
}

USO DE EVIDÊNCIAS CIENTÍFICAS:
- Quando disponíveis, CITE as evidências científicas fornecidas para embasar seus insights. Mencione o estudo, o achado numérico e a fonte. Exemplo: "Segundo o estudo PREDIMED (NEJM, 2013), a dieta mediterrânea reduz eventos cardiovasculares em 30%."
- Priorize evidências de nível A (ensaios clínicos e meta-análises) sobre nível B
- Conecte os dados clínicos do paciente com as evidências: se o LDL está alto E há evidência sobre meta de LDL, cite o valor-alvo da diretriz

Para "score": número de 0 a 100 representando saúde geral. Para "main_markers": até 6 marcadores mais relevantes (PA, glicemia, peso, exames laboratoriais alterados, etc). Para "priorities": até 3 prioridades principais para próxima consulta.
Gere entre 4 e 10 insights relevantes. Use "conexao" para insights que cruzam dados. Use "atencao" para alertas clínicos. Use "positivo" para pontos favoráveis.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Sessão expirada. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Sessão expirada. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve patientId first (needed by most queries). Single small query.
    const patientPreRes = await supabase
      .from("patients")
      .select("id, allergies, blood_type, birthdate")
      .eq("user_id", user.id)
      .maybeSingle();

    const patientId = patientPreRes?.data?.id || "00000000-0000-0000-0000-000000000000";
    const birthdate = patientPreRes?.data?.birthdate;
    const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    const isGeriatricProfile = age !== null && age >= 50;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // All remaining queries in a single parallel wave (was 3 sequential waves before).
    // Note: kbRes uses overlaps with all goal types — same effective filter as before since the
    // patient_goals scope is already restricted by patient_id; we filter relevant ones in memory.
    const [
      userRes, labRes,
      diagRes, treatRes, nutritionRes, trainingRes, examsRes, supplementsRes,
      goalsRes, patientGoalsRes, vitalsRes, alertsRes, consultationsRes,
      workoutLogsRes, recoveryLogsRes, raceEventsRes, profRecsRes,
    ] = await Promise.all([
      supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
      supabase.from("lab_results")
        .select("marker_name, value, unit, status, collection_date, reference_min, reference_max, marker_category")
        .eq("user_id", user.id)
        .order("collection_date", { ascending: false })
        .limit(50),
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
      supabase.from("vital_signs")
        .select("type, systolic, diastolic, heart_rate, glucose, glucose_moment, weight, symptoms, wellbeing, recorded_at, created_at")
        .eq("patient_id", patientId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("vitals_alerts")
        .select("alert_type, severity, message, acknowledged, created_at")
        .eq("patient_id", patientId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("consultations")
        .select("consultation_date, chief_complaint, assessment, plan, notes")
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: false })
        .limit(1),
      supabase.from("workout_logs")
        .select("activity_date, activity_name, sport, duration_minutes, distance_km, avg_heart_rate, max_heart_rate, avg_pace_min_km, calories, elevation_gain_m, tss, srpe, perceived_effort, feeling_score, compliance_pct, notes, source")
        .eq("user_id", user.id)
        .gte("activity_date", new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order("activity_date", { ascending: false })
        .limit(50),
      supabase.from("recovery_logs")
        .select("log_date, hrv_rmssd, resting_heart_rate, sleep_quality, sleep_hours, disposition_score, energy_score, muscle_score, joint_score, stress_score, free_notes")
        .eq("user_id", user.id)
        .gte("log_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order("log_date", { ascending: false })
        .limit(14),
      supabase.from("race_events")
        .select("name, sport, event_date, distance_km, goal, status")
        .eq("user_id", user.id)
        .eq("status", "scheduled")
        .gte("event_date", new Date().toISOString().split('T')[0])
        .order("event_date", { ascending: true })
        .limit(5),
      supabase.from("professional_recommendations")
        .select("specialty, dimension, recommendation, priority, created_at")
        .eq("patient_id", patientId)
        .eq("visible_to_patient", true)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Reattach patient/user data to keep downstream code unchanged
    const patientRes = patientPreRes;
    const patientName = userRes?.data?.name || "Paciente";

    const workoutLogs = workoutLogsRes.data || [];
    const recoveryLogs = recoveryLogsRes.data || [];
    const raceEvents = raceEventsRes.data || [];
    const profRecs = profRecsRes.data || [];

    // Separate active and resolved diagnoses
    const allDiagnoses = diagRes.data || [];
    const activeDiagnoses = allDiagnoses.filter((d: any) => d.status === "active");
    const resolvedDiagnoses = allDiagnoses.filter((d: any) => d.status !== "active");

    // Separate active and past treatments
    const allTreatments = treatRes.data || [];
    const activeTreatments = allTreatments.filter((t: any) => t.status === "active");
    const pastTreatments = allTreatments.filter((t: any) => t.status !== "active").slice(0, 10);

    // Knowledge base query based on active patient goals (now runs in its own micro-wave
    // because it depends on patientGoalsRes, but happens after one fast paralelized fetch).
    const activePatientGoalsForKb = (patientGoalsRes.data || []).filter((g: any) => g.status === "ativo");
    const activeGoalTypes: string[] = activePatientGoalsForKb.length > 0
      ? Array.from(new Set(activePatientGoalsForKb.map((g: any) => g.goal)))
      : ["bem_estar_geral", "longevidade"];

    const kbRes = await supabase
      .from("knowledge_base")
      .select("title, source_name, published_year, category, summary, key_findings, evidence_level")
      .eq("is_active", true)
      .overlaps("goal_relevance", activeGoalTypes)
      .order("evidence_level", { ascending: true })
      .limit(12);
    const evidenceSection = (kbRes.data && kbRes.data.length > 0)
      ? kbRes.data.map((k: any) =>
          `[${k.evidence_level}] ${k.title} (${k.source_name}, ${k.published_year})\n` +
          `Resumo: ${k.summary}\n` +
          `Achados-chave: ${(k.key_findings || []).slice(0, 3).join(" | ")}`
        ).join("\n\n")
      : "Sem evidências específicas carregadas";

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

    // Workout logs section
    const workoutLogsSection = workoutLogs.length > 0 ? (() => {
      const last28 = workoutLogs.filter((l: any) =>
        new Date(l.activity_date) >= new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
      );
      const totalTss = last28.reduce((s: number, l: any) => s + (l.tss ?? l.srpe ?? 0), 0);
      const totalKm = last28.reduce((s: number, l: any) => s + (l.distance_km ?? 0), 0);
      const totalMin = last28.reduce((s: number, l: any) => s + (l.duration_minutes ?? 0), 0);
      const sportCounts: Record<string, number> = {};
      last28.forEach((l: any) => { sportCounts[l.sport || 'outro'] = (sportCounts[l.sport || 'outro'] || 0) + 1; });

      const summary = `Últimos 28 dias: ${last28.length} atividades | ${totalKm.toFixed(1)} km | ${Math.round(totalMin / 60)} horas | TSS/sRPE total: ${Math.round(totalTss)}\nEsportes: ${Object.entries(sportCounts).map(([k, v]) => `${k} (${v}x)`).join(', ')}`;

      const recent = workoutLogs.slice(0, 10).map((l: any) =>
        `- ${l.activity_date} | ${l.activity_name || l.sport} | ${l.duration_minutes ?? '?'} min | ${l.distance_km ? l.distance_km + ' km' : ''} | TSS: ${l.tss ?? l.srpe ?? '?'} | RPE: ${l.perceived_effort ?? '?'}/10 | FC: ${l.avg_heart_rate ?? '?'} bpm | Fonte: ${l.source}`
      ).join('\n');

      return `${summary}\n\nAtividades recentes:\n${recent}`;
    })() : "Sem atividades registradas nos últimos 28 dias";

    // Recovery logs section
    const recoverySection = recoveryLogs.length > 0 ? (() => {
      const avgHrv = recoveryLogs.filter((l: any) => l.hrv_rmssd).length > 0
        ? Math.round(recoveryLogs.filter((l: any) => l.hrv_rmssd).reduce((s: number, l: any) => s + l.hrv_rmssd, 0) / recoveryLogs.filter((l: any) => l.hrv_rmssd).length)
        : null;
      const avgSleep = recoveryLogs.filter((l: any) => l.sleep_hours).length > 0
        ? (recoveryLogs.filter((l: any) => l.sleep_hours).reduce((s: number, l: any) => s + l.sleep_hours, 0) / recoveryLogs.filter((l: any) => l.sleep_hours).length).toFixed(1)
        : null;
      const avgMuscle = recoveryLogs.filter((l: any) => l.muscle_score != null).length > 0
        ? Math.round(recoveryLogs.filter((l: any) => l.muscle_score != null).reduce((s: number, l: any) => s + l.muscle_score, 0) / recoveryLogs.filter((l: any) => l.muscle_score != null).length)
        : null;
      const avgJoint = recoveryLogs.filter((l: any) => l.joint_score != null).length > 0
        ? Math.round(recoveryLogs.filter((l: any) => l.joint_score != null).reduce((s: number, l: any) => s + l.joint_score, 0) / recoveryLogs.filter((l: any) => l.joint_score != null).length)
        : null;
      const latest = recoveryLogs[0];

      return `Médias (últimos 14 dias):
HRV matinal (RMSSD): ${avgHrv ?? 'N/A'} ms | Sono: ${avgSleep ?? 'N/A'} h/noite | Score muscular: ${avgMuscle ?? 'N/A'}/100 | Score articular: ${avgJoint ?? 'N/A'}/100

Registro mais recente (${latest.log_date}):
HRV: ${latest.hrv_rmssd ?? 'N/A'} ms | FC repouso: ${latest.resting_heart_rate ?? 'N/A'} bpm | Sono: ${latest.sleep_hours ?? 'N/A'} h (qualidade ${latest.sleep_quality ?? 'N/A'}/5)
Disposição: ${latest.disposition_score ?? 'N/A'}/100 | Energia: ${latest.energy_score ?? 'N/A'}/100 | Músculos: ${latest.muscle_score ?? 'N/A'}/100 | Articulações: ${latest.joint_score ?? 'N/A'}/100
${latest.free_notes ? `Notas: ${latest.free_notes}` : ''}`;
    })() : "Sem registros de recuperação";

    // Race events section
    const raceEventsSection = raceEvents.length > 0
      ? raceEvents.map((r: any) => {
          const daysUntil = Math.ceil((new Date(r.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return `- ${r.name} | ${r.sport} | ${r.event_date} (em ${daysUntil} dias) | ${r.distance_km ? r.distance_km + ' km' : ''}${r.goal ? ` | Objetivo: ${r.goal}` : ''}`;
        }).join('\n')
      : "Nenhuma prova agendada";

    // Professional recommendations section
    const profRecsSection = profRecs.length > 0
      ? profRecs.map((r: any) =>
          `- [${r.specialty}] ${r.dimension?.replace(/_/g, ' ')}: ${r.recommendation} (${new Date(r.created_at).toLocaleDateString('pt-BR')}) | Prioridade: ${r.priority}`
        ).join('\n')
      : "Nenhuma orientação de profissionais no período";

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

    // Compute deterministic health score (Life's Essential 8 — AHA)
    const healthScore = calculateHealthScore({
      labResults,
      vitals,
      activeTraining,
      activeNutrition,
      activeDiagnoses,
      stravaActivities,
      workoutLogs,
      age,
    });

    // Select system prompt based on age
    const systemPrompt = isGeriatricProfile ? GERIATRIC_SYSTEM_PROMPT : PERFORMANCE_SYSTEM_PROMPT;

    // Build comorbidities and medications from diagnoses/treatments
    const comorbidities = activeDiagnoses.map((d: any) => d.name).join(", ") || "nenhuma registrada";
    const medications = activeTreatments.map((t: any) => `${t.name}${t.dosage ? ` ${t.dosage}` : ""}`).join(", ") || "nenhum registrado";

    const today = new Date();
    const periodStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userPrompt = `Paciente: ${patientName}, ${age !== null ? `${age} anos` : "idade não informada"}.
Tipo sanguíneo: ${patientRes.data?.blood_type || "não informado"}
Alergias: ${(patientRes.data?.allergies || []).length > 0 ? (patientRes.data?.allergies || []).join(", ") : "nenhuma registrada"}
Comorbidades: ${comorbidities}
Medicamentos: ${medications}
Dados do período ${periodStart.toLocaleDateString("pt-BR")} a ${today.toLocaleDateString("pt-BR")}:

SCORE DE SAÚDE CALCULADO (Life's Essential 8 — AHA):
Score final: ${healthScore.score}/100 — ${healthScore.score_label}
Sub-scores por domínio:
${Object.entries(healthScore.domain_scores).map(([k, v]) => `- ${k}: ${v}/100 — ${healthScore.domain_details[k]}`).join('\n')}
IMPORTANTE: Use este score como dado fixo. Não recalcule nem altere o valor.
Explique os sub-scores mais baixos como prioridades nos insights.

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

TREINOS REALIZADOS (WORKOUT LOGS — ÚLTIMOS 28 DIAS):
${workoutLogsSection}

DIÁRIO DE RECUPERAÇÃO (ÚLTIMOS 14 DIAS):
${recoverySection}

PRÓXIMAS PROVAS AGENDADAS:
${raceEventsSection}

ORIENTAÇÕES DOS PROFISSIONAIS DE SAÚDE (ÚLTIMOS 30 DIAS):
${profRecsSection}

METAS DE SAÚDE ATIVAS:
${goalsSection}

═══════════════════════════════════════════════════
OBJETIVOS DE SAÚDE ATIVOS DO PACIENTE (PRIORIDADE MÁXIMA NA ANÁLISE):
${patientGoalsSection}

INSTRUÇÃO OBRIGATÓRIA SOBRE OS OBJETIVOS ACIMA:
Cada insight gerado DEVE indicar explicitamente, no campo "description",
se APOIA, CONTRADIZ ou é NEUTRO em relação aos objetivos listados acima.
Exemplos:
- Se o paciente tem objetivo de "Perda de Peso" e os dados de nutrição mostram
  excesso calórico ou poucos treinos cumpridos, mencione essa CONTRADIÇÃO
  diretamente: "Este padrão alimentar contradiz seu objetivo de perda de peso..."
- Se o paciente tem objetivo de "Performance Aeróbica" e o VO2max melhorou,
  mencione o APOIO: "Esta evolução APOIA seu objetivo de performance aeróbica."
- Quando um insight não se conectar a nenhum objetivo, marque como NEUTRO
  em relação aos objetivos.
Inclua sempre pelo menos 1 insight da categoria "meta" que conecte progresso
ou obstáculos diretamente a um dos objetivos ativos do paciente.
═══════════════════════════════════════════════════

EVIDÊNCIAS CIENTÍFICAS RELEVANTES PARA OS OBJETIVOS DO PACIENTE:
${evidenceSection}`;

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
      workoutLogs: workoutLogs.length,
      recoveryLogs: recoveryLogs.length,
      raceEvents: raceEvents.length,
      profRecs: profRecs.length,
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

    const finalPayload = {
      ...parsed,
      score: healthScore.score,
      score_label: healthScore.score_label,
      domain_scores: healthScore.domain_scores,
      domain_details: healthScore.domain_details,
    };

    // Salvar snapshot em patient_insights para acesso do profissional
    try {
      // Deletar insights anteriores do paciente para manter apenas o mais recente
      await supabase
        .from("patient_insights")
        .delete()
        .eq("patient_id", user.id);

      // Inserir novo snapshot (RLS exige patient_id = auth.uid())
      await supabase
        .from("patient_insights")
        .insert({
          patient_id: user.id,
          title: "Análise Integrada de Saúde",
          content: JSON.stringify(finalPayload),
          priority_score: Math.max(1, Math.min(10, Math.round(((100 - (healthScore.score ?? 50)) / 10)) || 1)),
          category: "correlacao_cruzada",
          status: "ativo",
          model_used: "google/gemini-2.5-flash",
          prompt_version: "v2-goals-aware",
          data_snapshot: {
            generated_at: new Date().toISOString(),
            score: healthScore.score,
            score_label: healthScore.score_label,
            domain_scores: healthScore.domain_scores,
          },
        });
    } catch (saveError) {
      console.error("Erro ao salvar patient_insights:", saveError);
      // Não bloquear o retorno ao frontend se falhar
    }

    return new Response(JSON.stringify(finalPayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-health-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
