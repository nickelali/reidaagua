-- ============================================================
-- ROLLBACK COMPLETO — REI DA ÁGUA
-- ============================================================
-- !! ATENÇÃO: ESTA OPERAÇÃO É IRREVERSÍVEL !!
-- !! TODOS OS DADOS SERÃO PERDIDOS            !!
-- !! USE APENAS EM AMBIENTE DE DESENVOLVIMENTO !!
-- ============================================================

-- Remover triggers primeiro
DROP TRIGGER IF EXISTS trg_quotes_updated_at    ON quotes;
DROP TRIGGER IF EXISTS trg_orders_updated_at    ON orders;
DROP TRIGGER IF EXISTS trg_routes_updated_at    ON routes;
DROP TRIGGER IF EXISTS trg_products_updated_at  ON products;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS trg_profiles_updated_at  ON profiles;

-- Remover função de trigger
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS auth_role();

-- Remover tabelas (CASCADE remove foreign keys e policies)
DROP TABLE IF EXISTS delivery_notes CASCADE;
DROP TABLE IF EXISTS order_items    CASCADE;
DROP TABLE IF EXISTS quotes         CASCADE;
DROP TABLE IF EXISTS orders         CASCADE;
DROP TABLE IF EXISTS routes         CASCADE;
DROP TABLE IF EXISTS customers      CASCADE;
DROP TABLE IF EXISTS products       CASCADE;
DROP TABLE IF EXISTS settings       CASCADE;
DROP TABLE IF EXISTS profiles       CASCADE;
