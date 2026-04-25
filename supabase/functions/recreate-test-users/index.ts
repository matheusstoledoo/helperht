import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_USERS = [
  { email: "fisico.teste@gmail.com", name: "Prep Fisico Teste", cpf: "64789337656", specialty: "educador físico" },
  { email: "nutri.teste@gmail.com", name: "Nutri Teste", cpf: "34576892670", specialty: "nutricionista" },
  { email: "teste.fisio@gmail.com", name: "Fisio Teste", cpf: "39608347890", specialty: "fisioterapeuta" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const password = "teste123";
  const results: any[] = [];

  // List all users (paginated)
  const allUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    allUsers.push(...(data?.users ?? []));
    if (!data?.users || data.users.length < 1000) break;
    page++;
  }

  for (const u of TEST_USERS) {
    try {
      // Delete existing auth user if any
      const existing = allUsers.find((x) => x.email === u.email);
      if (existing) {
        await admin.auth.admin.deleteUser(existing.id);
      }
      // Clean public tables just in case
      await admin.from("user_roles").delete().eq("user_id", existing?.id ?? "00000000-0000-0000-0000-000000000000");
      await admin.from("users").delete().eq("email", u.email);

      // Create fresh
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
        user_metadata: { name: u.name, role: "professional", cpf: u.cpf },
      });
      if (createErr) {
        results.push({ email: u.email, status: "error", error: createErr.message });
        continue;
      }
      const uid = created.user!.id;

      await admin.from("users").upsert({
        id: uid,
        email: u.email,
        name: u.name,
        role: "professional",
        cpf: u.cpf,
        specialty: u.specialty,
        onboarding_completed: true,
      } as any);

      await admin.from("user_roles").upsert({ user_id: uid, role: "professional" } as any);

      results.push({ email: u.email, status: "ok", id: uid });
    } catch (e) {
      results.push({ email: u.email, status: "exception", error: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ password, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
