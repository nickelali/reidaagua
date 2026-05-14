-- ============================================================
-- MIGRATION 004 — RLS POLICIES COMPLETAS
-- ============================================================
-- Executar APÓS 003_enable_rls.sql
-- ============================================================

-- ===== HELPER: função para checar role do usuário logado =====
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PRODUCTS — leitura pública, escrita apenas admin
-- ============================================================
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_admin_insert" ON products
  FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY "products_admin_update" ON products
  FOR UPDATE USING (auth_role() = 'admin');

CREATE POLICY "products_admin_delete" ON products
  FOR DELETE USING (auth_role() = 'admin');

-- ============================================================
-- SETTINGS — leitura pública, escrita apenas admin
-- ============================================================
CREATE POLICY "settings_public_read" ON settings
  FOR SELECT USING (true);

CREATE POLICY "settings_admin_insert" ON settings
  FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY "settings_admin_update" ON settings
  FOR UPDATE USING (auth_role() = 'admin');

-- ============================================================
-- PROFILES — usuário vê o próprio; admin vê todos
-- ============================================================
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR auth_role() = 'admin'
  );

CREATE POLICY "profiles_admin_insert" ON profiles
  FOR INSERT WITH CHECK (auth_role() = 'admin');

CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (auth_role() = 'admin');

CREATE POLICY "profiles_admin_delete" ON profiles
  FOR DELETE USING (auth_role() = 'admin');

-- ============================================================
-- CUSTOMERS — apenas admin
-- ============================================================
CREATE POLICY "customers_admin_all" ON customers
  FOR ALL USING (auth_role() = 'admin');

-- ============================================================
-- ROUTES — apenas admin (leitura: admin + driver da rota)
-- ============================================================
CREATE POLICY "routes_admin_all" ON routes
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "routes_driver_read" ON routes
  FOR SELECT USING (
    auth_role() = 'driver' AND driver_id = auth.uid()
  );

-- ============================================================
-- ORDERS — admin tudo; driver vê/atualiza apenas os seus;
--           cliente sem login pode criar (INSERT público)
-- ============================================================
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "orders_driver_read" ON orders
  FOR SELECT USING (
    auth_role() = 'driver' AND driver_id = auth.uid()
  );

CREATE POLICY "orders_driver_update_status" ON orders
  FOR UPDATE
  USING (auth_role() = 'driver' AND driver_id = auth.uid())
  WITH CHECK (auth_role() = 'driver' AND driver_id = auth.uid());

-- ============================================================
-- ORDER_ITEMS — admin tudo; driver lê os seus; INSERT público
-- ============================================================
CREATE POLICY "order_items_public_insert" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_admin_all" ON order_items
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "order_items_driver_read" ON order_items
  FOR SELECT USING (
    auth_role() = 'driver' AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.driver_id = auth.uid()
    )
  );

-- ============================================================
-- QUOTES — apenas admin
-- ============================================================
CREATE POLICY "quotes_admin_all" ON quotes
  FOR ALL USING (auth_role() = 'admin');

-- ============================================================
-- DELIVERY_NOTES — admin tudo; driver cria/lê apenas dos seus
-- ============================================================
CREATE POLICY "notes_admin_all" ON delivery_notes
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "notes_driver_insert" ON delivery_notes
  FOR INSERT WITH CHECK (
    auth_role() = 'driver' AND
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_notes.order_id
        AND orders.driver_id = auth.uid()
    )
  );

CREATE POLICY "notes_driver_read" ON delivery_notes
  FOR SELECT USING (
    auth_role() = 'driver' AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_notes.order_id
        AND orders.driver_id = auth.uid()
    )
  );
