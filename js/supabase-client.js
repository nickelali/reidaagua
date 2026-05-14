// js/supabase-client.js
// ============================================================
// Cliente Supabase singleton — incluir em TODAS as páginas
// antes de qualquer outro módulo JS do projeto.
//
// Requer que js/config.js esteja carregado antes:
//   <script src="js/config.js"></script>
//   <script type="module" src="js/supabase-client.js"></script>
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
  console.error(
    '[Rei da Água] ERRO: js/config.js não encontrado ou mal configurado.\n' +
    'Copie js/config.example.js → js/config.js e preencha as credenciais do Supabase.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'rda_auth_session'
  }
});

export default supabase;
