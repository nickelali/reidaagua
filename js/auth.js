// js/auth.js
// ============================================================
// Módulo de autenticação — login, logout, proteção de rotas
// ============================================================

import { supabase } from './supabase-client.js';

// ===== LOGIN =====
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ===== LOGOUT =====
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = '/login.html';
}

// ===== SESSÃO ATUAL =====
export async function getCurrentUser() {
  // getSession() lê do localStorage de forma síncrona (mais rápido)
  // getUser() faz uma requisição de rede para validar o token
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function getUserProfile(userId = null) {
  const uid = userId || (await getCurrentUser())?.id;
  console.log('[auth] Buscando perfil para UID:', uid);
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (error) {
    console.warn('[auth] Erro ao buscar perfil:', error.message);
    return null;
  }
  console.log('[auth] Perfil encontrado:', data);
  return data;
}

// ===== PROTEÇÃO DE ROTA =====
// allowedRoles: ['admin'] | ['driver'] | ['admin', 'driver']
// Redireciona se não autenticado ou role não permitida.
export async function requireAuth(allowedRoles = ['admin', 'driver']) {
  console.log('[auth] requireAuth iniciado...');
  // Aguarda o Supabase restaurar a sessão do localStorage
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[auth] Sessão recuperada:', session ? 'Sim' : 'Não');

  if (!session) {
    console.log('[auth] Sem sessão, redirecionando para login...');
    window.location.href = '/login.html';
    return null;
  }

  const user = session.user;
  const profile = await getUserProfile(user.id);

  if (!profile) {
    console.error('[auth] Perfil não encontrado para o usuário:', user.id);
    await logout();
    return null;
  }
  console.log('[auth] Role do usuário:', profile.role);

  if (!allowedRoles.includes(profile.role)) {
    // Redireciona para a página correta do role
    if (profile.role === 'admin') {
      window.location.href = '/admin.html';
    } else if (profile.role === 'driver') {
      window.location.href = '/driver.html';
    } else {
      window.location.href = '/login.html';
    }
    return null;
  }

  return { user, profile };
}

// ===== ESCUTA DE MUDANÇA DE SESSÃO =====
// Chame uma vez no início da aplicação para reagir a expiração de token
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      callback(event, session);
    }
  });
}
