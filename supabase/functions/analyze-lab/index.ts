import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
model: 'claude-opus-4-6',
const SYSTEM_PROMPT = `Você é um assistente de saúde educacional do aplicativo HelperHT.
Sua função é ajudar o usuário a ENTENDER seus resultados de exames, não tratá-los.

RESTRIÇÕES ABSOLUTAS — NUNCA VIOLE:
1. NUNCA sugira medicamentos, suplementos, vitaminas, minerais ou qualquer substância
2. NUNCA mencione doses, posologias, concentrações ou marcas
3. NUNCA use verbos de conduta: "tome", "use", "suplementar", "aplicar", "consumir"
4. NUNCA sugira duração de tratamento ou protocolo
5. NUNCA sugira quando repetir exames com prazo específico
6. NUNCA faça diagnósticos
7. NUNCA use linguagem que implique certeza clínica

LINGUAGEM PERMITIDA para o campo "acao":
- "Converse com seu médico sobre este resultado"
- "Este valor merece avaliação médica especializada"
- "Vale mencionar este resultado na sua próxima consulta"
- "Acompanhamento médico é recomendado para este marcador"

Retorne APENAS JSON válido, sem markdown, sem texto antes ou depois.

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
      "interpretacao": "<1 frase explicando o marcador em linguagem simples>",
      "acao": "<orientação de acompanhamento profissional>"
    }
  ],
  "prioridades": ["<máximo 3 itens, nunca conduta direta>"],
  "proximos_passos": "<1 frase encorajando consulta médica>"
}`

const FORBIDDEN_WORDS = ['tome', 'tomar', 'mg', ' ui ', 'suplementar',
  'suplementação', 'injetar', 'aplicar', 'por 30', 'por 60', 'por 90',
  'dose', 'posologia']

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
    const { exam_id, document_id, user_id } = await req.json()
    
    // Aceita tanto exam_id quanto document_id
    const docId = document_id || exam_id

    if (!docId || !user_id) {
      return new Response(
        JSON.stringify({ error: 'document_id e user_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca marcadores pelo document_id
    const { data: markers, error: markersError } = await supabase
      .from('lab_results')
      .select('*')
      .eq('document_id', docId)
      .eq('user_id', user_id)

    if (markersError) throw markersError

    if (!markers || markers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum marcador encontrado para este documento. Verifique se a extração foi concluída.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Busca objetivos do paciente
    const { data: goals } = await supabase
      .from('patient_goals')
      .select('*')
      .eq('user_id', user_id)

    // Busca histórico de exames anteriores
    const { data: previousMarkers } = await supabase
      .from('lab_results')
      .select('marker_name, value, unit, collection_date')
      .eq('user_id', user_id)
      .neq('document_id', docId)
      .order('collection_date', { ascending: false })
      .limit(30)

    // Chama Claude
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `
Marcadores do exame atual:
${JSON.stringify(markers, null, 2)}

Objetivos declarados pelo paciente:
${JSON.stringify(goals || [], null, 2)}

Histórico de marcadores anteriores para comparação:
${JSON.stringify(previousMarkers || [], null, 2)}

Analise e retorne o JSON estruturado.
          `,
        }],
      }),
    })

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text()
      throw new Error(`Claude API error: ${err}`)
    }

    const claudeData = await claudeResponse.json()
    const rawText = claudeData.content[0].text

    let analysis
    try {
      analysis = JSON.parse(rawText)
    } catch {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      analysis = JSON.parse(cleaned)
    }

    const safeAnalysis = sanitizeAnalysis(analysis)

    // Salva no documento usando uploaded_by (coluna real da tabela documents)
    await supabase
      .from('documents')
      .update({ analise_completa: safeAnalysis })
      .eq('id', docId)
      .eq('uploaded_by', user_id)

    return new Response(JSON.stringify(safeAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('analyze-lab error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
