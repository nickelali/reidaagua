-- ============================================================
-- MIGRATION 001 — SCHEMA INICIAL — REI DA ÁGUA
-- ============================================================
-- Executar no Supabase Dashboard → SQL Editor → Run
-- Ordem importa: tabelas referenciadas devem existir antes.
-- ============================================================

-- 1. profiles (depende de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'driver')),
  phone       text,
  route_id    uuid,  -- FK adicionada após criação de routes
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. customers
CREATE TABLE IF NOT EXISTS customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL,
  address     text NOT NULL,
  district    text NOT NULL,
  city        text NOT NULL DEFAULT 'Curitiba',
  notes       text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 3. products
CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  size_liters int NOT NULL,
  price       numeric(10,2) NOT NULL,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 4. routes
CREATE TABLE IF NOT EXISTS routes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  districts     text[] NOT NULL,
  days_of_week  int[] NOT NULL,
  driver_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 4b. Agora que routes existe, adicionar FK em profiles
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_route
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;

-- 5. orders
CREATE TABLE IF NOT EXISTS orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid REFERENCES customers(id) ON DELETE SET NULL,
  driver_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  route_id      uuid REFERENCES routes(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','out_for_delivery','delivered','cancelled')),
  total         numeric(10,2) NOT NULL DEFAULT 0,
  notes         text,
  whatsapp_sent boolean DEFAULT false,
  scheduled_for date,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 6. order_items
CREATE TABLE IF NOT EXISTS order_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    int NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL,
  subtotal    numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at  timestamptz DEFAULT now()
);

-- 7. quotes
CREATE TABLE IF NOT EXISTS quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text,
  customer_phone  text,
  items           jsonb NOT NULL,
  total           numeric(10,2) NOT NULL,
  status          text DEFAULT 'open' CHECK (status IN ('open','converted','expired')),
  order_id        uuid REFERENCES orders(id) ON DELETE SET NULL,
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 8. delivery_notes
CREATE TABLE IF NOT EXISTS delivery_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 9. settings
CREATE TABLE IF NOT EXISTS settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- Triggers: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
