# PRD - Melhorias do Projeto Rei da Água 💧

> **Objetivo:** Transformar o site atual em uma plataforma premium de alta performance, com design memorável e otimização total para conversão e SEO.

---

## 🚀 SPRINT 1: Fundação & SEO (Ajustes Críticos)
*Foco em resolver as falhas detectadas na auditoria inicial e preparar a base técnica.*

- [ ] **1.1. Otimização de Metadados (SEO)**
  - Implementar Meta Description estratégica.
  - Configurar tags Open Graph (OG:Image, OG:Title) para compartilhamento no WhatsApp/Instagram.
  - **Critério de Aceite:** Script `seo_checker.py` passar com 100%.
- [ ] **1.2. Correção de Acessibilidade e Hierarquia (UX)**
  - Corrigir a hierarquia de cabeçalhos (H1 -> H2 -> H3) sem pular níveis.
  - Adicionar labels ARIA em botões e links icônicos.
  - **Critério de Aceite:** Script `ux_audit.py` não reportar erros de hierarquia.
- [ ] **1.3. Ajuste da Lei de Hick (Navegação)**
  - Reduzir os itens do menu principal de 20 para no máximo 7 categorias claras.
  - Agrupar subitens em dropdowns ou seções lógicas.
- [ ] **1.4. Configuração de Favicon e PWA Básico**
  - Adicionar favicons em todos os tamanhos.
  - Configurar manifest.json para permitir "Adicionar à tela inicial".

---

## 🎨 SPRINT 2: Excelência Visual (Redesign Radical)
*Foco em "WOW" o usuário com design premium, fugindo do óbvio e do azul padrão.*

- [ ] **2.1. Novo Hero Section (Topological Betrayal)**
  - Implementar layout assimétrico (90/10) ou tipografia massiva.
  - Substituir o fundo estático por um gradiente líquido dinâmico ou vídeo em slow-motion de água pura.
- [ ] **2.2. Substituição de Placeholders por Imagens IA**
  - Gerar e implementar fotos realistas da frota de caminhões com logo personalizada.
  - Gerar renders premium dos galões de 10L e 20L em ambientes modernos.
- [ ] **2.3. Sistema de Animações Fluídas**
  - Implementar Staggered Reveals (revelação gradual) em todas as seções ao rolar a página.
  - Adicionar micro-interações (efeito spring) em botões de pedido e ícones.
- [ ] **2.4. Refatoração de Tipografia e Grid**
  - Implementar tipografia fluída com `clamp()`.
  - Quebrar o grid padrão de 50/50 em seções de destaque para criar tensão visual e interesse.

---

## ⚙️ SPRINT 3: Funcionalidades & Backend (Interatividade)
*Foco em melhorar a experiência de compra e facilitar a gestão.*

- [ ] **3.1. Calculadora de Pedidos em Tempo Real**
  - Atualizar o resumo do pedido instantaneamente conforme o usuário altera as quantidades.
  - Exibir total estimado com base nos preços configurados.
- [ ] **3.2. Formatação Avançada para WhatsApp**
  - Criar um template de mensagem profissional: "*Novo Pedido Rei da Água: [Produtos] - Total: [Valor] - Endereço: [Local]*".
- [ ] **3.3. Melhoria do Painel Administrativo**
  - Adicionar preview em tempo real das alterações de preços e rotas.
  - Implementar persistência local (LocalStorage) mais robusta para as rotas semanais.
- [ ] **3.4. Seção de Depoimentos e Prova Social**
  - Criar slider moderno com feedbacks de clientes reais.

---

## 🏁 SPRINT 4: Performance & Entrega (Finalização)
*Foco em velocidade máxima e validação final.*

- [ ] **4.1. Otimização de Performance (Lighthouse)**
  - Comprimir todas as novas imagens para WebP/AVIF.
  - Implementar Lazy Loading nativo em imagens fora da dobra.
  - **Meta:** Score 90+ em Performance no Lighthouse.
- [ ] **4.2. Auditoria Final com Agentes**
  - Executar `verify_all.py` para garantir que nenhuma regressão ocorreu.
  - Verificação manual do "Purple Ban" (garantir que não há roxo/clichês de IA).
- [ ] **4.3. Documentação e Handover**
  - Atualizar o README.md com instruções de manutenção para o proprietário.

---

## ✅ PHASE X: VERIFICAÇÃO FINAL
- [ ] Segurança: `security_scan.py` ✅
- [ ] UX/Design: `ux_audit.py` ✅
- [ ] SEO: `seo_checker.py` ✅
- [ ] Performance: `lighthouse_audit.py` ✅
- [ ] Build: `npm run build` (se aplicável) ✅
