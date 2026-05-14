// js/routes.js
// ============================================================
// Módulo de Rotas — CRUD completo (apenas admin)
// ============================================================

import { supabase } from './supabase-client.js';

// ===== VALIDAÇÃO =====
function validateRoute(data) {
  const errors = [];
  if (!data.name?.trim())                        errors.push('Nome da rota é obrigatório.');
  if (!Array.isArray(data.districts) || data.districts.length === 0)
                                                  errors.push('Informe pelo menos um bairro.');
  if (!Array.isArray(data.days_of_week) || data.days_of_week.length === 0)
                                                  errors.push('Selecione pelo menos um dia da semana.');
  const invalidDays = data.days_of_week.filter(d => d < 0 || d > 6);
  if (invalidDays.length)                        errors.push('Dias da semana devem ser 0 (Dom) a 6 (Sáb).');
  if (errors.length) throw new Error(errors.join(' '));
}

// ===== LISTAR ROTAS =====
export async function listRoutes(onlyActive = true) {
  let query = supabase
    .from('routes')
    .select(`
      id, name, districts, days_of_week, active, created_at,
      profiles ( id, full_name, phone )
    `)
    .order('name');

  if (onlyActive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ===== BUSCAR UMA ROTA =====
export async function getRoute(id) {
  const { data, error } = await supabase
    .from('routes')
    .select(`*, profiles ( id, full_name )`)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ===== CRIAR ROTA =====
export async function createRoute(data) {
  validateRoute(data);

  const { data: created, error } = await supabase
    .from('routes')
    .insert({
      name:         data.name.trim(),
      districts:    data.districts.map(d => d.trim()).filter(Boolean),
      days_of_week: data.days_of_week,
      driver_id:    data.driver_id || null
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

// ===== ATUALIZAR ROTA =====
export async function updateRoute(id, data) {
  validateRoute(data);

  const { data: updated, error } = await supabase
    .from('routes')
    .update({
      name:         data.name.trim(),
      districts:    data.districts.map(d => d.trim()).filter(Boolean),
      days_of_week: data.days_of_week,
      driver_id:    data.driver_id || null,
      updated_at:   new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

// ===== DESATIVAR ROTA =====
export async function deactivateRoute(id) {
  const { error } = await supabase
    .from('routes')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ===== ROTAS DE HOJE =====
export async function getTodayRoutes() {
  const dayOfWeek = new Date().getDay(); // 0=Dom, 1=Seg ... 6=Sáb

  const { data, error } = await supabase
    .from('routes')
    .select(`
      id, name, districts, days_of_week,
      profiles ( id, full_name, phone )
    `)
    .eq('active', true)
    .contains('days_of_week', [dayOfWeek]);

  if (error) throw error;
  return data;
}
