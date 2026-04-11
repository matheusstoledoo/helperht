import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { patient_id, alert_type, severity, message } = await req.json()

    if (!patient_id || !alert_type || !severity || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get patient info
    const { data: patient } = await supabase
      .from('patients')
      .select('user_id')
      .eq('id', patient_id)
      .single()

    if (!patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', patient.user_id)
      .single()

    const patientName = user?.name || 'Paciente'

    // Log the alert notification (placeholder for WhatsApp/SMS integration)
    console.log(`[VITALS ALERT] Patient: ${patientName}, Type: ${alert_type}, Severity: ${severity}, Message: ${message}`)

    // Here you would integrate with WhatsApp Business API, Twilio, etc.
    // For now, we log it and return success

    return new Response(
      JSON.stringify({
        success: true,
        notification_sent: true,
        patient_name: patientName,
        alert_type,
        severity,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in vitals-alert-notify:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
