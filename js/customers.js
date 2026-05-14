// js/customers.js
// ============================================================
// Módulo de Clientes — CRUD completo (apenas admin)
// ============================================================

import { supabase } from './supabase-client.js';

// ===== VALIDAÇÃO =====
function validateCustomer(data) {
  const errors = [];
  if (!data.name?.trim())     errors.push('Nome é obrigatório.');
  if (!data.address?.trim())  errors.push('Endereço é obrigatório.');
  if (!data.district?.trim()) errors.push('Bairro é obrigatório.');

  const phone = (data.phone || '').replace(/\D/g, '');
  if (phone.length < 10)      errors.push('Telefone deve ter pelo menos 10 dígitos.');

  if (errors.length) throw new Error(errors.join(' '));
}

// ===== LISTAR =====
/**
 * Lista clientes ativos com busca opcional.
 * @param {string} search - Busca por nome, bairro ou telefone
 * @param {number} page   - Página (começa em 0)
 * @param {number} limit  - Registros por página
 */
export async function listCustomers(search = '', page = 0, limit = 20) {
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('active', true)
    .order('name');

  if (search.trim()) {
    const s = search.trim();
    query = query.or(`name.ilike.%${s}%,district.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data, error, count } = await query
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return { data, count, page, limit };
}

// ===== BUSCAR UM =====
export async function getCustomer(id) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ===== CRIAR =====
export async function createCustomer(data) {
  validateCustomer(data);

  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      name:     data.name.trim(),
      phone:    data.phone.trim(),
      address:  data.address.trim(),
      district: data.district.trim(),
      city:     data.city?.trim() || 'Curitiba',
      notes:    data.notes?.trim() || null
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

// ===== ATUALIZAR =====
export async function updateCustomer(id, data) {
  validateCustomer(data);

  const { data: updated, error } = await supabase
    .from('customers')
    .update({
      name:       data.name.trim(),
      phone:      data.phone.trim(),
      address:    data.address.trim(),
      district:   data.district.trim(),
      city:       data.city?.trim() || 'Curitiba',
      notes:      data.notes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

// ===== SOFT DELETE =====
export async function deactivateCustomer(id) {
  const { error } = await supabase
    .from('customers')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ===== HISTÓRICO DE PEDIDOS DO CLIENTE =====
export async function getCustomerOrders(customerId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, total, notes, scheduled_for, created_at,
      order_items (
        quantity, unit_price, subtotal,
        products ( name, size_liters )
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
