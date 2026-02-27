import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { startDate, endDate, format = 'json' } = await req.json();

    // Call the export function
    const { data: report, error: exportError } = await supabase.rpc(
      'export_evidence_audit_report',
      {
        _professional_id: user.id,
        _start_date: startDate || null,
        _end_date: endDate || null,
      }
    );

    if (exportError) {
      throw new Error(`Export failed: ${exportError.message}`);
    }

    // Log the export action
    if (report?.searches?.length > 0) {
      const firstSearchId = report.searches[0].search_id;
      await supabase.from('evidence_audit_logs').insert({
        search_id: firstSearchId,
        action: 'audit_exported',
        action_details: {
          format,
          period: report.period,
          total_searches: report.searches?.length || 0,
        },
        performed_by: user.id,
      });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows: string[] = [];
      csvRows.push('Search ID,Patient ID,Created At,Status,Total Results,Concepts,Articles');
      
      for (const search of (report.searches || [])) {
        const concepts = (search.concepts_extracted || [])
          .map((c: any) => c.normalized)
          .join('; ');
        const articles = (search.results_returned || [])
          .map((r: any) => r.pubmed_id)
          .join('; ');
        
        csvRows.push([
          search.search_id,
          search.patient_id,
          search.created_at,
          search.status,
          search.total_results,
          `"${concepts}"`,
          `"${articles}"`,
        ].join(','));
      }

      return new Response(csvRows.join('\n'), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in export-audit-report:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
