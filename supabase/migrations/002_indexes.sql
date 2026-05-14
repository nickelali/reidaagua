-- ============================================================
-- MIGRATION 002 — ÍNDICES DE PERFORMANCE
-- ============================================================
-- Executar APÓS 001_initial_schema.sql
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for ON orders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id     ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_route_id      ON orders(route_id);
CREATE INDEX IF NOT EXISTS idx_customers_district   ON customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_active     ON customers(active);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_order ON delivery_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_quotes_status        ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_routes_active        ON routes(active);
