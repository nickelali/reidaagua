// js/orders.js
// ============================================================
// Módulo de Pedidos — criação, listagem e gestão
// ============================================================

import { supabase } from './supabase-client.js';

// ===== CRIAR PEDIDO =====
/**
 * Cria um pedido com seus itens em sequência.
 * Busca unit_price do banco no momento da criação (snapshot).
 *
 * @param {{ customer_id?, notes?, scheduled_for? }} orderData
 * @param {{ product_id, quantity }[]} items
 * @returns {Promise<{ order, items }>}
 */
export async function createOrder(orderData, items) {
  if (!items || items.length === 0) {
    throw new Error('O pedido deve ter pelo menos um item.');
  }

  // Buscar preços atuais do banco (snapshot)
  const productIds = items.map(i => i.product_id);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, price, name')
    .in('id', productIds)
    .eq('active', true);

  if (prodErr) throw prodErr;

  const priceMap = Object.fromEntries(products.map(p => [p.id, p.price]));

  // Calcular total
  let total = 0;
  const enrichedItems = items.map(item => {
    const unit_price = priceMap[item.product_id];
    if (!unit_price) throw new Error(`Produto ${item.product_id} não encontrado ou inativo.`);
    total += item.quantity * unit_price;
    return { product_id: item.product_id, quantity: item.quantity, unit_price };
  });

  // INSERT em orders
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id:    orderData.customer_id   || null,
      notes:          orderData.notes         || null,
      scheduled_for:  orderData.scheduled_for || null,
      total:          parseFloat(total.toFixed(2)),
      status:         'pending',
      whatsapp_sent:  false
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  // INSERT em order_items
  const itemsPayload = enrichedItems.map(item => ({
    order_id:   order.id,
    product_id: item.product_id,
    quantity:   item.quantity,
    unit_price: item.unit_price
  }));

  const { data: savedItems, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemsPayload)
    .select();

  if (itemsErr) {
    // Tentar rollback do pedido (best-effort)
    await supabase.from('orders').delete().eq('id', order.id);
    throw itemsErr;
  }

  return { order, items: savedItems };
}

// ===== MARCAR WHATSAPP ENVIADO =====
export async function markWhatsappSent(orderId) {
  const { error } = await supabase
    .from('orders')
    .update({ whatsapp_sent: true })
    .eq('id', orderId);
  if (error) console.warn('[orders] markWhatsappSent:', error.message);
}

// ===== LISTAR PEDIDOS =====
/**
 * @param {{ status?, date?, driver_id?, route_id? }} filters
 * @param {number} page
 * @param {number} limit
 */
export async function listOrders(filters = {}, page = 0, limit = 50) {
  let query = supabase
    .from('orders')
    .select(`
      id, status, total, notes, scheduled_for, whatsapp_sent, created_at,
      customers ( id, name, phone, address, district ),
      profiles  ( id, full_name, phone ),
      routes    ( id, name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.status)    query = query.eq('status', filters.status);
  if (filters.driver_id) query = query.eq('driver_id', filters.driver_id);
  if (filters.route_id)  query = query.eq('route_id', filters.route_id);
  if (filters.date)      query = query.eq('scheduled_for', filters.date);

  const { data, error, count } = await query
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return { data, count };
}

// ===== BUSCAR PEDIDO COMPLETO =====
export async function getOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers ( * ),
      profiles  ( id, full_name, phone ),
      routes    ( id, name ),
      order_items (
        id, quantity, unit_price, subtotal,
        products ( id, name, size_liters )
      ),
      delivery_notes (
        id, content, created_at,
        profiles ( full_name )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ===== ATUALIZAR STATUS =====
export async function updateOrderStatus(id, status) {
  const valid = ['pending','confirmed','out_for_delivery','delivered','cancelled'];
  if (!valid.includes(status)) throw new Error(`Status inválido: ${status}`);

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ===== ATRIBUIR DRIVER / ROTA =====
export async function assignOrder(id, { driverId, routeId }) {
  const updates = { updated_at: new Date().toISOString() };
  if (driverId !== undefined) updates.driver_id = driverId;
  if (routeId  !== undefined) updates.route_id  = routeId;

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ===== REALTIME: Assinar novos pedidos e mudanças de status =====
export function subscribeToOrders(callback) {
  return supabase
    .channel('rda-orders-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => callback('INSERT', payload.new))
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => callback('UPDATE', payload.new))
    .subscribe();
}
