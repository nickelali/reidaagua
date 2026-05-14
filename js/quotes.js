// js/quotes.js
// ============================================================
// Módulo de Orçamentos
// ============================================================

import { supabase } from './supabase-client.js';
import { createOrder } from './orders.js';

// ===== CRIAR ORÇAMENTO =====
/**
 * @param {{ customer_id?, customer_name?, customer_phone?, items[], expires_at? }} data
 * items: [{ product_id, quantity, unit_price, name }]
 */
export async function createQuote(data) {
  if (!data.items || data.items.length === 0) {
    throw new Error('O orçamento deve ter pelo menos um item.');
  }

  const total = data.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);

  const { data: created, error } = await supabase
    .from('quotes')
    .insert({
      customer_id:    data.customer_id    || null,
      customer_name:  data.customer_name  || null,
      customer_phone: data.customer_phone || null,
      items:          data.items,
      total:          parseFloat(total.toFixed(2)),
      status:         'open',
      expires_at:     data.expires_at || null
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

// ===== LISTAR ORÇAMENTOS =====
export async function listQuotes(status = 'open') {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id, customer_name, customer_phone, items, total, status, expires_at, created_at,
      customers ( id, name, phone ),
      orders    ( id, status )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ===== CONVERTER ORÇAMENTO EM PEDIDO =====
export async function convertQuoteToOrder(quoteId) {
  // Buscar orçamento
  const { data: quote, error: fetchErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (fetchErr) throw fetchErr;
  if (quote.status !== 'open') throw new Error('Orçamento já convertido ou expirado.');

  // Montar itens para createOrder
  const items = quote.items.map(i => ({
    product_id: i.product_id,
    quantity:   i.quantity
  }));

  const orderData = {
    customer_id: quote.customer_id || null,
    notes:       `Convertido do orçamento #${quoteId.substring(0, 8)}`
  };

  const { order } = await createOrder(orderData, items);

  // Atualizar orçamento como convertido
  const { error: updateErr } = await supabase
    .from('quotes')
    .update({
      status:     'converted',
      order_id:   order.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', quoteId);

  if (updateErr) throw updateErr;
  return order;
}

// ===== EXPIRAR ORÇAMENTO =====
export async function expireQuote(quoteId) {
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', quoteId)
    .eq('status', 'open'); // só expira se ainda aberto

  if (error) throw error;
  return true;
}
