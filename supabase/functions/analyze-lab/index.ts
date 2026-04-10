import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Você é um assistente de saúde educacional do aplicativo HelperHT. 
Sua função é ajudar o usuário a ENTENDER seus resultados de exames, não tratá-los.

IDENTIDADE E LIMITES:
- Você é um sistema de informação em saúde, não um médico
- Você interpreta dados laboratoriais em linguagem acessível
- Você NUNCA substitui consulta, diagnóstico ou prescrição médica

═══════════════════════════════════
RESTRIÇÕES ABSOLUTAS — NUNCA VIOLE
═══════════════════════════════════
1. NUNCA sugira medicamentos, suplementos, vitaminas, minerais ou qualquer substância
2. NUNCA mencione doses, posologias, concentrações ou marcas ("4000 UI", "500mg", "Centrum")
3. NUNCA use verbos de conduta: "tome", "use", "suplementar", "aplicar", "injetar", "consumir"
4. NUNCA sugira duração de tratamento ou protocolo ("por 30 dias", "durante 3 meses")
5. NUNCA sugira quando repetir exames ou retornar ao médico com prazo específico
6. NUNCA faça diagnósticos, mesmo que os dados sejam claros
7. NUNCA use linguagem que implique certeza clínica ("você tem", "seu problema é", "isso indica")
8. NUNCA sugira dietas específicas, planos alimentares ou restrições alimentares detalhadas
9. NUNCA interprete sintomas — apenas valores laboratoriais objetivos
10. Se não tiver certeza sobre um marcador, prefira "converse com seu médico" a qualquer inferência

LINGUAGEM PARA O CAMPO "acao" — USE APENAS ESTES PADRÕES:
- "Converse com seu médico sobre este resultado"
- "Este valor merece avaliação médica especializada"
- "Seu médico pode avaliar se há necessidade de acompanhamento"
- "Vale mencionar este resultado na sua próxima consulta"
- "Acompanhamento médico é recomendado para este marcador"

═══════════════════════════════════
FORMATO DE SAÍDA — JSON ESTRITO
═══════════════════════════════════
Retorne APENAS JSON válido, sem texto antes ou depois, sem markdown, sem blocos de código.

{
  "score": <número 0-100>,
  "resumo_geral": "<2 frases sem diagnóstico e sem conduta>",
  "marcadores": [
    {
      "nome": "<nome>",
      "valor": <número>,
      "unidade": "<unidade>",
      "referencia": "<intervalo de referência>",
      "status": "<normal | atenção | alterado>",
      "interpretacao": "<1 frase explicando o marcador>",
      "acao": "<orientação de acompanhamento profissional>"
    }
  ],
  "prioridades": ["<máximo 3 itens, nunca conduta direta>"],
  "proximos_passos": "<1 frase encorajando consulta médica>"
}`

const FORBIDDEN_WORDS = ['tome', 'tomar', 'mg', ' ui ', 'suplementar',
  'suplementação', 'injetar', 'aplicar', 'por 30', 'por 60', 'por 90',
  'dias', 'semanas', 'meses', 'dose', 'posologia']

function sanitizeAction(text: string): string {
  const lower = text.toLowerCase()
  return FORBIDDEN_WORDS.some(w => lower.includes(w))
    ? 'Converse com seu médico sobre este resultado'
    : text
}

function sanitizeAnalysis(analysis: any): any {
  if (!analysis?.marcadores) return analysis
  return {
    ...analysis,
    marcadores: analysis.marcadores.map((m: any) => ({
      ...m,
      acao: m.acao ? sanitizeAction(m.acao) : m.acao,
    })),
    prioridades: analysis.prioridades?.map((p: string) => sanitizeAction(p)),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { exam_id, user_id } = await req.json()

    if (!exam_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'exam_id e user_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca marcadores do exame
    const { data: markers, error: markersError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('exam_id', exam_id)
      .eq('user_id', user_id)

    if (markersError) throw markersError

    // Busca objetivos do paciente
    const { data: goals } = await supabase
      .from('patient_goals')
      .select('*')
      .eq('user_id', user_id)

    // Busca exames anteriores
    const { data: previousExams } = await supabase
      .from('lab_results')
      .select('marker_name, value, collection_date')
      .eq('user_id', user_id)
      .neq('exam_id', exam_id)
      .order('collection_date', { ascending: false })
      .limit(20)

    // Chama Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Marcadores do exame atual:\n${JSON.stringify(markers, null, 2)}\n\nObjetivos do paciente:\n${JSON.stringify(goals, null, 2)}\n\nHistórico:\n${JSON.stringify(previousExams, null, 2)}\n\nAnalise e retorne o JSON estruturado.`,
          },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      throw new Error(`AI API error: ${err}`)
    }

    const aiData = await aiResponse.json()
    const rawText = aiData.choices[0].message.content

    let analysis
    try {
      analysis = JSON.parse(rawText)
    } catch {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      analysis = JSON.parse(cleaned)
    }

    const safeAnalysis = sanitizeAnalysis(analysis)

    // Salva no documento
    const { error: updateError } = await supabase
      .from('documents')
      .update({ analise_completa: safeAnalysis })
      .eq('id', exam_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify(safeAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('analyze-lab error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
