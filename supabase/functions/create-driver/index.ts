// supabase/functions/create-driver/index.ts
// ============================================================
// Edge Function — Criação de usuário entregador
// Requer token de admin no header Authorization.
// Deploy: supabase functions deploy create-driver
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Cliente com service_role (server-side, seguro aqui)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Cliente para verificar o caller via JWT do header
    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verificar se o caller é admin
    const { data: { user: caller }, error: authErr } = await supabaseCaller.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas admin.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Dados do novo entregador
    const { email, password, full_name, phone, route_id } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'email, password e full_name são obrigatórios.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Senha deve ter mínimo 8 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Criar usuário no Supabase Auth
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // confirma o email automaticamente
    });

    if (createErr) throw createErr;

    // Criar perfil do driver
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        id:        newUser.user.id,
        full_name: full_name.trim(),
        role:      'driver',
        phone:     phone?.trim() || null,
        route_id:  route_id || null
      });

    if (profileErr) {
      // Rollback: deletar usuário recém-criado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw profileErr;
    }

    return new Response(
      JSON.stringify({ user_id: newUser.user.id, email: newUser.user.email }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
