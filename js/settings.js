// js/settings.js
// ============================================================
// Módulo de Configurações e Produtos
// Busca dados do Supabase com fallback para valores locais.
// ============================================================

import { supabase } from './supabase-client.js';

// Fallback caso o Supabase esteja indisponível
const FALLBACK_SETTINGS = {
  whatsapp_number:           '5541985231501',
  business_name:             'Rei da Água',
  whatsapp_message_template: 'Olá! Gostaria de fazer um pedido. ID: {order_id}',
  delivery_days:             '["Segunda","Quarta","Sexta","Sábado"]',
  business_hours:            '07:00 - 18:00',
  instagram_handle:          'reidaaguaa'
};

const FALLBACK_PRODUCTS = [
  { id: 'local-20l', name: 'Galão 20L', size_liters: 20, price: 12.00, active: true },
  { id: 'local-10l', name: 'Galão 10L', size_liters: 10, price: 8.00,  active: true }
];

// ===== CONFIGURAÇÕES =====

/** Retorna todas as configurações como objeto { key: value } */
export async function getSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) throw error;

    return data.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  } catch (err) {
    console.warn('[settings] Usando fallback:', err.message);
    return { ...FALLBACK_SETTINGS };
  }
}

/** Retorna o valor de uma configuração específica */
export async function getSetting(key) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) throw error;
    return data.value;
  } catch {
    return FALLBACK_SETTINGS[key] ?? null;
  }
}

/** Atualiza uma configuração (apenas admin) */
export async function updateSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw error;
  return true;
}

// ===== PRODUTOS =====

/** Retorna produtos ativos */
export async function getProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('size_liters', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[settings] getProducts fallback:', err.message);
    return FALLBACK_PRODUCTS;
  }
}

/** Atualiza um produto (apenas admin) */
export async function updateProduct(id, data) {
  const { error } = await supabase
    .from('products')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  return true;
}

/** Ativa ou desativa um produto */
export async function toggleProduct(id, active) {
  return updateProduct(id, { active });
}

// ===== REALTIME: Atualização de Preços =====

/**
 * Assina mudanças em products e chama callback com o produto atualizado.
 * Retorna a subscription (chame .unsubscribe() para cancelar).
 */
export function subscribeToProductChanges(callback) {
  return supabase
    .channel('rda-products-changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'products' },
      (payload) => callback(payload.new)
    )
    .subscribe();
}
