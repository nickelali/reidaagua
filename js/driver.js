// js/driver.js
// ============================================================
// Módulo do Entregador — operações da rota diária
// ============================================================

import { supabase } from './supabase-client.js';

// ===== ENTREGAS DO DIA =====
export async function getTodayDeliveries() {
  const today = new Date().toISOString().split('T')[0];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, notes, scheduled_for, created_at,
      customers ( id, name, phone, address, district ),
      order_items (
        id, quantity, unit_price, subtotal,
        products ( name, size_liters )
      ),
      delivery_notes ( id, content, created_at )
    `)
    .eq('driver_id', user.id)
    .eq('scheduled_for', today)
    .in('status', ['confirmed', 'out_for_delivery', 'delivered'])
    .order('status')          // pending primeiro
    .order('created_at');

  if (error) throw error;
  return data;
}

// ===== CONFIRMAR ENTREGA =====
export async function confirmDelivery(orderId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('driver_id', user.id); // RLS extra: só o próprio driver

  if (error) throw error;
  return true;
}

// ===== ADICIONAR OBSERVAÇÃO =====
export async function addDeliveryNote(orderId, content) {
  if (!content?.trim()) throw new Error('Observação não pode ser vazia.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const { data, error } = await supabase
    .from('delivery_notes')
    .insert({
      order_id:  orderId,
      author_id: user.id,
      content:   content.trim()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ===== HISTÓRICO DE ENTREGAS =====
export async function getMyDeliveryHistory(limit = 20, page = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const { data, error, count } = await supabase
    .from('orders')
    .select(`
      id, status, total, scheduled_for, updated_at,
      customers ( name, address, district ),
      order_items (
        quantity,
        products ( name )
      )
    `, { count: 'exact' })
    .eq('driver_id', user.id)
    .eq('status', 'delivered')
    .order('updated_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return { data, count };
}

// ===== REALTIME: Novos pedidos atribuídos ao driver =====
export function subscribeToMyOrders(userId, callback) {
  return supabase
    .channel(`rda-driver-${userId}-orders`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `driver_id=eq.${userId}` },
      (payload) => callback(payload.new))
    .subscribe();
}
