-- ============================================================
-- MIGRATION 005 — DADOS INICIAIS (SEED)
-- ============================================================
-- Executar APÓS 004_rls_policies.sql
-- ============================================================

-- Produtos padrão
INSERT INTO products (name, size_liters, price) VALUES
  ('Galão 20L', 20, 12.00),
  ('Galão 10L', 10, 8.00)
ON CONFLICT DO NOTHING;

-- Configurações padrão do sistema
INSERT INTO settings (key, value) VALUES
  ('whatsapp_number',           '5541985231501'),
  ('business_name',             'Rei da Água'),
  ('whatsapp_message_template', 'Olá! Gostaria de fazer um pedido. ID: {order_id}'),
  ('delivery_days',             '["Segunda","Quarta","Sexta","Sábado"]'),
  ('business_hours',            '07:00 - 18:00'),
  ('instagram_handle',          'reidaaguaa')
ON CONFLICT (key) DO NOTHING;
