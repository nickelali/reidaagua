// js/profiles.js
// ============================================================
// Módulo de Usuários e Perfis (Admin apenas)
// ============================================================

import { supabase } from './supabase-client.js';

// ===== LISTAR ENTREGADORES =====
export async function listDrivers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, role, phone, active,
      routes ( id, name )
    `)
    .eq('role', 'driver')
    .order('full_name');

  if (error) throw error;
  return data;
}

// ===== CRIAR ENTREGADOR (Via Edge Function) =====
/**
 * @param {{ email, password, full_name, phone, route_id }} data
 */
export async function createDriver(data) {
  // Chamada para a Edge Function que criamos anteriormente
  const { data: response, error } = await supabase.functions.invoke('create-driver', {
    body: data
  });

  if (error) throw error;
  return response;
}

// ===== VINCULAR ROTA A MOTORISTA =====
export async function assignRouteToDriver(driverId, routeId) {
  const { error } = await supabase
    .from('profiles')
    .update({ route_id: routeId, updated_at: new Date().toISOString() })
    .eq('id', driverId);

  if (error) throw error;
  return true;
}

// ===== ALTERAR STATUS (Ativar/Desativar) =====
export async function toggleUserStatus(userId, active) {
  const { error } = await supabase
    .from('profiles')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
  return true;
}
