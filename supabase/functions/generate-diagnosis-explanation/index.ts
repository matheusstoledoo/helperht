import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diagnosisName, icdCode, severity } = await req.json();

    console.log('Generating explanation for diagnosis:', { diagnosisName, icdCode, severity });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create a detailed prompt for generating accessible explanations
    const systemPrompt = `Você é um especialista em comunicação médica que explica diagnósticos aos pacientes em linguagem clara e acessível.
Suas explicações devem:
- Usar linguagem simples e cotidiana (evitar jargão médico)
- Ser empáticas e tranquilizadoras
- Explicar o que a condição significa em termos práticos
- Manter a explicação em no máximo 2-3 frases
- Focar em ajudar o paciente a entender sua saúde
- SEMPRE responder em português do Brasil`;

    const userPrompt = `Gere uma explicação clara e amigável para o seguinte diagnóstico:
Diagnóstico: ${diagnosisName}
${icdCode ? `Código CID: ${icdCode}` : ''}
${severity ? `Gravidade: ${severity}` : ''}

Forneça uma explicação concisa que um paciente sem formação médica possa entender facilmente.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Por favor, tente novamente em instantes.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Por favor, adicione créditos ao seu workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || '';

    console.log('Generated explanation:', explanation);

    return new Response(
      JSON.stringify({ explanation }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-diagnosis-explanation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
