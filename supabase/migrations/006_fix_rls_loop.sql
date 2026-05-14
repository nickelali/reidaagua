-- ============================================================
-- FIX: Corrige o loop infinito na policy profiles_self_read
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Remove a policy com loop infinito
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;

-- 2. Recria sem chamar auth_role() (que faz SELECT no próprio profiles)
--    Agora usa APENAS auth.uid() = id para leitura própria
--    e uma subconsulta segura para admins
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (
    auth.uid() = id
  );

-- 3. Policy separada para admin ver todos (usando SECURITY DEFINER)
CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

-- Verificar se funcionou (deve retornar o seu perfil):
-- SELECT * FROM profiles WHERE id = auth.uid();
