import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, name, role, cpf, requesting_professional_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // Verificar se o papel solicitado já existe para esse usuário
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        // Papel já existe — erro real de duplicata
        return new Response(
          JSON.stringify({
            success: false,
            error: 'email_exists',
            message: 'Um usuário com este e-mail já existe.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Email existe mas com papel diferente — adicionar novo papel ao usuário existente
      const userId = existingUser.id;

      await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select();

      let patientId: string | null = null;

      if (role === 'patient') {
        const { data: patientData } = await supabaseAdmin
          .from('patients')
          .upsert({ user_id: userId, birthdate: '1999-01-10' })
          .select('id')
          .single();
        patientId = patientData?.id ?? null;

        if (requesting_professional_id && patientId) {
          await supabaseAdmin
            .from('professional_patient_links')
            .insert({ professional_id: requesting_professional_id, patient_id: patientId, status: 'active' });
        }
      }

      return new Response(
        JSON.stringify({ success: true, userId, patientId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        cpf,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const userId = authData.user.id;

    // Create user profile in users table
    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: userId,
        email,
        name,
        role,
        cpf,
      });

    if (userError) {
      console.error("User table error:", userError);
    }

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role,
      });

    if (roleError) {
      console.error("Role error:", roleError);
    }

    let patientId: string | null = null;

    // If patient, create patient record
    if (role === "patient") {
      const { data: patientData, error: patientError } = await supabaseAdmin
        .from("patients")
        .upsert({
          user_id: userId,
          birthdate: "1999-01-10",
        })
        .select("id")
        .single();

      if (patientError) {
        console.error("Patient error:", patientError);
      } else {
        patientId = patientData?.id;
      }

      // Auto-link professional to patient if requesting_professional_id is provided
      if (requesting_professional_id && patientId) {
        const { error: linkError } = await supabaseAdmin
          .from("professional_patient_links")
          .insert({
            professional_id: requesting_professional_id,
            patient_id: patientId,
            status: "active",
          });

        if (linkError) {
          console.error("Link error:", linkError);
        } else {
          console.log(`Professional ${requesting_professional_id} linked to patient ${patientId}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId, patientId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
