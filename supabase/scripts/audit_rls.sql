-- ============================================================
-- SCRIPT DE AUDITORIA DE RLS
-- ============================================================
-- Executar no Supabase Dashboard → SQL Editor
-- Resultado esperado: query 1 retorna 0 linhas
-- ============================================================

-- Query 1: Tabelas SEM RLS (deve retornar 0 linhas em produção)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Query 2: Lista de todas as policies por tabela e operação
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Query 3: Tabelas sem nenhuma policy (possível gap de segurança)
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  );
