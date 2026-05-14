#!/bin/bash
# build.sh — Gera js/config.js a partir das variáveis de ambiente do Netlify
# Executado automaticamente pelo Netlify antes do deploy.

set -e

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "ERRO: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não definidas."
  echo "Configure-as em Netlify → Site Settings → Environment Variables."
  exit 1
fi

cat > js/config.js << EOF
// GERADO AUTOMATICAMENTE pelo build.sh — NÃO edite manualmente
const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
EOF

echo "✓ js/config.js gerado com sucesso."
