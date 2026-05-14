# PRD.md — Rei da Água: Sistema de Gestão de Distribuição

| Campo        | Valor                                      |
|--------------|--------------------------------------------|
| **Versão**   | 1.0.0                                      |
| **Data**     | 2026-05-14                                 |
| **Autor**    | Staff Engineering / Rei da Água            |
| **Status**   | APROVADO — Pronto para Execução            |
| **Repo**     | github.com/nickelali/reidaagua             |

---

## 1. Executive Summary

O sistema atual do Rei da Água é um site estático com lógica de preços e rotas persistida em `localStorage` do navegador. Pedidos são enviados via WhatsApp sem registro histórico. Não há controle de entregas, histórico de clientes, gestão de orçamentos ou visibilidade operacional para o dono.

Este PRD especifica a implementação completa de um backend funcional usando **Supabase** (PostgreSQL + Auth + Realtime + Storage) integrado ao frontend HTML/CSS/JS existente, transformando o site em um sistema operacional real com dois perfis de acesso: **Admin** (dono) e **Driver** (entregador).

O resultado final é um sistema autocontido, sem dependência de servidores próprios, com custo operacional zero dentro do plano gratuito do Supabase para o volume esperado (< 500 MAU, < 500 MB de banco).

---

## 2. Objetivos e Métricas de Sucesso

### 2.1 Objetivos de Negócio

| # | Objetivo | Métrica de Sucesso | Prazo |
|---|----------|--------------------|-------|
| O1 | Eliminar perda de pedidos por falta de registro | 100% dos pedidos salvos no banco antes de envio ao WhatsApp | Sprint 3 |
| O2 | Dar visibilidade ao dono sobre entregas do dia | Dashboard com status em tempo real (Realtime Supabase) | Sprint 4 |
| O3 | Eliminar edição manual de preços por localStorage | Preços editados pelo admin refletem para todos os usuários em < 5s | Sprint 2 |
| O4 | Registrar histórico de clientes | CRUD completo de clientes com histórico de pedidos acessível | Sprint 3 |
| O5 | Operacionalizar entregadores no sistema | Driver confirma entrega via app mobile com timestamp e observação | Sprint 5 |

### 2.2 KPIs Técnicos

- **Disponibilidade:** ≥ 99.5% (garantido pelo SLA do Supabase Free Tier)
- **Tempo de resposta de API:** < 300ms para queries simples (p95)
- **Cobertura de RLS:** 100% das tabelas com Row Level Security habilitado
- **Tempo de carregamento do painel driver:** < 2s em 3G (mobile-first)

---

## 3. Personas e Casos de Uso

### 3.1 Persona: Admin (Dono)

**Nome:** Proprietário do Rei da Água  
**Contexto:** Gerencia a operação do escritório ou celular. Precisa de visibilidade total sobre pedidos, clientes, rotas e faturamento.

| ID | Caso de Uso | Fluxo Principal |
|----|-------------|-----------------|
| UC-A1 | Login no painel admin | Acessa `/admin`, insere email+senha, recebe JWT, redireciona para dashboard |
| UC-A2 | Editar preço dos galões | Admin → Produtos → Edita valor → Salva → Clientes veem novo preço em < 5s |
| UC-A3 | Criar rota de entrega | Admin → Rotas → Nova Rota → Define nome, bairros, dia da semana, entregador |
| UC-A4 | Cadastrar cliente | Admin → Clientes → Novo → Preenche nome, endereço, bairro, telefone |
| UC-A5 | Visualizar pedidos do dia | Admin → Pedidos → Filtra por data → Vê status de cada pedido |
| UC-A6 | Criar orçamento | Admin → Orçamentos → Novo → Seleciona cliente + produtos → Gera link/PDF |
| UC-A7 | Cadastrar entregador | Admin → Usuários → Novo Driver → Cria conta + define rota padrão |

### 3.2 Persona: Driver (Entregador)

**Nome:** Entregador do Rei da Água  
**Contexto:** Usa smartphone Android/iOS durante a rota. Interface deve ser simples, grande, funcionar com dados móveis limitados.

| ID | Caso de Uso | Fluxo Principal |
|----|-------------|-----------------|
| UC-D1 | Login no app | Acessa `/driver`, insere email+senha, vê rota do dia |
| UC-D2 | Ver rota do dia | Lista de entregas ordenada por endereço com mapa link |
| UC-D3 | Confirmar entrega | Toca no pedido → "Confirmar Entrega" → Status muda para `delivered` |
| UC-D4 | Adicionar observação | Toca no pedido → "Obs" → Digita texto → Salva em `delivery_notes` |
| UC-D5 | Ver histórico próprio | Aba "Histórico" → Lista de entregas passadas do próprio driver |

### 3.3 Persona: Cliente (Visitante do Site)

**Nome:** Cliente que acessa o site público  
**Contexto:** Não tem login. Usa a calculadora de pedidos e envia via WhatsApp. Opcionalmente pode ter cadastro no sistema (gerenciado pelo admin).

---

## 4. Arquitetura Técnica

### 4.1 Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend público | HTML5 + CSS3 + JS ES6+ | Existente, sem mudança de framework |
| Frontend admin | HTML5 + JS ES6+ (novos arquivos) | Consistência com stack existente |
| Frontend driver | HTML5 + JS ES6+ (mobile-first) | Leve, sem build step, funciona em 3G |
| Backend/BaaS | Supabase (PostgreSQL 15) | Auth + DB + Realtime + Storage gratuito |
| Autenticação | Supabase Auth (JWT) | Integrado, sem servidor próprio |
| Hospedagem | Netlify (frontend) | CI/CD automático via GitHub, HTTPS, CDN |
| CDN/Assets | Netlify CDN | Imagens e assets estáticos |

### 4.2 Diagrama de Arquitetura (texto)

```
┌─────────────────────────────────────────────────────────────┐
│                        NETLIFY CDN                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  index.html  │  │  admin.html  │  │   driver.html    │  │
│  │  (público)   │  │  (admin)     │  │   (entregador)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          └─────────────────┼───────────────────┘
                            │  HTTPS / REST / Realtime WS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth (JWT)  │  │  PostgREST   │  │  Realtime        │  │
│  │              │  │  (REST API)  │  │  (WebSocket)     │  │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘  │
│                            │                   │            │
│  ┌─────────────────────────▼───────────────────▼─────────┐  │
│  │              PostgreSQL 15 Database                    │  │
│  │  profiles │ customers │ products │ routes │ orders    │  │
│  │  order_items │ quotes │ delivery_notes │ settings     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Fluxo de Autenticação

```
Usuário → POST /auth/v1/token (email+senha)
       ← JWT (access_token + refresh_token)
       → Todas as requests com header: Authorization: Bearer <token>
       → Supabase valida JWT e aplica RLS policies por role
```

### 4.4 Fluxo de Dados — Pedido Novo

```
Cliente preenche calculadora
  → JS chama supabase.from('products').select() [lê preços do banco]
  → Cliente confirma pedido
  → JS chama supabase.from('orders').insert({...})
  → JS chama supabase.from('order_items').insert([...])
  → Retorna order_id
  → Formata mensagem WhatsApp com order_id
  → window.open(whatsappURL)
  → Admin vê pedido novo em tempo real via Realtime subscription
```

---

## 5. Modelo de Dados

### 5.1 Tabela: `profiles`

```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id)
full_name   text NOT NULL
role        text NOT NULL CHECK (role IN ('admin', 'driver'))
phone       text
route_id    uuid REFERENCES routes(id)  -- rota padrão do driver
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 5.2 Tabela: `customers`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
phone       text NOT NULL
address     text NOT NULL
district    text NOT NULL
city        text NOT NULL DEFAULT 'Curitiba'
notes       text
active      boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 5.3 Tabela: `products`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL          -- ex: "Galão 20L", "Galão 10L"
size_liters int NOT NULL           -- 20 ou 10
price       numeric(10,2) NOT NULL
active      boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 5.4 Tabela: `routes`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
name          text NOT NULL          -- ex: "Rota Norte"
districts     text[] NOT NULL        -- ["Boa Vista", "Bacacheri"]
days_of_week  int[] NOT NULL         -- [1,3,5] = seg/qua/sex (0=dom)
driver_id     uuid REFERENCES profiles(id)
active        boolean DEFAULT true
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

### 5.5 Tabela: `orders`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
customer_id   uuid REFERENCES customers(id)
driver_id     uuid REFERENCES profiles(id)
route_id      uuid REFERENCES routes(id)
status        text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','confirmed','out_for_delivery','delivered','cancelled'))
total         numeric(10,2) NOT NULL
notes         text
whatsapp_sent boolean DEFAULT false
scheduled_for date
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

### 5.6 Tabela: `order_items`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
product_id  uuid NOT NULL REFERENCES products(id)
quantity    int NOT NULL CHECK (quantity > 0)
unit_price  numeric(10,2) NOT NULL  -- preço no momento do pedido (snapshot)
subtotal    numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
created_at  timestamptz DEFAULT now()
```

### 5.7 Tabela: `quotes`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
customer_id   uuid REFERENCES customers(id)
customer_name text                   -- para orçamentos sem cadastro
customer_phone text
items         jsonb NOT NULL         -- snapshot dos itens
total         numeric(10,2) NOT NULL
status        text DEFAULT 'open' CHECK (status IN ('open','converted','expired'))
order_id      uuid REFERENCES orders(id)  -- preenchido quando convertido
expires_at    timestamptz
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

### 5.8 Tabela: `delivery_notes`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
author_id   uuid NOT NULL REFERENCES profiles(id)
content     text NOT NULL
created_at  timestamptz DEFAULT now()
```

### 5.9 Tabela: `settings`

```sql
key         text PRIMARY KEY          -- ex: 'whatsapp_number', 'business_name'
value       text NOT NULL
updated_by  uuid REFERENCES profiles(id)
updated_at  timestamptz DEFAULT now()
```

### 5.10 Relacionamentos

```
auth.users ──< profiles
profiles (driver) ──< routes (driver_id)
customers ──< orders
profiles (driver) ──< orders (driver_id)
routes ──< orders
orders ──< order_items
products ──< order_items
orders ──< delivery_notes
profiles ──< delivery_notes (author)
customers ──< quotes
orders ──< quotes (converted)
```

---

## 6. Requisitos Funcionais por Módulo

### 6.1 Módulo: Autenticação

- RF-AUTH-01: Login com email + senha via Supabase Auth
- RF-AUTH-02: Logout com invalidação do token local
- RF-AUTH-03: Redirecionamento automático por role após login (admin → /admin, driver → /driver)
- RF-AUTH-04: Proteção de rotas: páginas admin e driver inacessíveis sem JWT válido
- RF-AUTH-05: Refresh automático de token antes da expiração
- RF-AUTH-06: Admin pode criar contas de driver (sem auto-cadastro público)

### 6.2 Módulo: Produtos/Preços

- RF-PROD-01: Listar produtos ativos com preço atual
- RF-PROD-02: Admin edita preço — reflexo imediato no frontend público via Realtime
- RF-PROD-03: Admin ativa/desativa produto
- RF-PROD-04: Histórico de alteração de preço registrado via `updated_at`

### 6.3 Módulo: Rotas

- RF-ROTA-01: CRUD completo de rotas pelo admin
- RF-ROTA-02: Associar entregador a rota
- RF-ROTA-03: Definir dias da semana e bairros por rota
- RF-ROTA-04: Driver vê apenas sua rota do dia

### 6.4 Módulo: Clientes

- RF-CLI-01: CRUD completo de clientes pelo admin
- RF-CLI-02: Busca de clientes por nome, bairro ou telefone
- RF-CLI-03: Histórico de pedidos por cliente
- RF-CLI-04: Soft delete (campo `active = false`)

### 6.5 Módulo: Pedidos

- RF-PED-01: Cliente cria pedido via calculadora pública → salva no banco
- RF-PED-02: Admin visualiza todos os pedidos com filtros (data, status, rota, driver)
- RF-PED-03: Admin muda status do pedido manualmente
- RF-PED-04: Admin atribui pedido a driver/rota
- RF-PED-05: Pedidos aparecem na rota do driver em tempo real
- RF-PED-06: Cálculo de total usa `unit_price` do banco (snapshot no momento do pedido)

### 6.6 Módulo: Entregas (Driver)

- RF-ENT-01: Driver vê lista de entregas do dia ordenada por endereço
- RF-ENT-02: Driver confirma entrega com um toque → status muda para `delivered`
- RF-ENT-03: Driver adiciona observação de texto por pedido
- RF-ENT-04: Driver vê histórico de suas entregas passadas
- RF-ENT-05: Admin vê confirmações em tempo real no dashboard

### 6.7 Módulo: Orçamentos

- RF-ORC-01: Admin cria orçamento vinculado ou não a cliente cadastrado
- RF-ORC-02: Orçamento pode ser convertido em pedido com um clique
- RF-ORC-03: Orçamento expira após data configurável
- RF-ORC-04: Listagem de orçamentos abertos no painel admin

### 6.8 Módulo: Configurações

- RF-CFG-01: Admin edita número do WhatsApp, nome do negócio, mensagem padrão
- RF-CFG-02: Configurações buscadas do banco (substituem `localStorage` e `CONFIG` do script.js)
- RF-CFG-03: Fallback para valores padrão se banco indisponível

---

## 7. Requisitos Não-Funcionais

### 7.1 Segurança

- RNF-SEC-01: **Row Level Security (RLS) habilitado em TODAS as tabelas** — sem exceção
- RNF-SEC-02: Usuários não autenticados leem apenas `products` e `settings` (preços públicos)
- RNF-SEC-03: Drivers leem apenas pedidos da própria rota; escrevem apenas em `delivery_notes` e status de entrega
- RNF-SEC-04: Apenas admin tem permissão de INSERT/UPDATE/DELETE em `customers`, `routes`, `products`, `quotes`
- RNF-SEC-05: Chave `service_role` do Supabase NUNCA exposta no frontend
- RNF-SEC-06: Apenas a `anon key` (pública) usada no frontend
- RNF-SEC-07: Validação de input no frontend antes de qualquer insert (campos obrigatórios, formatos)
- RNF-SEC-08: Senhas de drivers criadas pelo admin com mínimo de 8 caracteres

### 7.2 Performance

- RNF-PERF-01: Página driver carrega em < 2s em conexão 3G (< 300KB total transferido)
- RNF-PERF-02: Queries de listagem com paginação (máx. 50 registros por página)
- RNF-PERF-03: Índices criados em: `orders.status`, `orders.scheduled_for`, `orders.driver_id`, `customers.district`
- RNF-PERF-04: Imagens otimizadas (WebP, < 100KB cada) via Netlify CDN

### 7.3 Disponibilidade e Resiliência

- RNF-DIS-01: Frontend funciona offline para leitura de cache (PWA existente mantido)
- RNF-DIS-02: Erros de API exibem mensagem amigável ao usuário, nunca stack trace
- RNF-DIS-03: Retry automático (1x) em falha de rede nas operações críticas (confirmar entrega)

### 7.4 Manutenibilidade

- RNF-MAN-01: Cada módulo JS em arquivo separado (auth.js, orders.js, etc.)
- RNF-MAN-02: Sem dependências de build (sem webpack, sem npm para o frontend)
- RNF-MAN-03: Migrations SQL versionadas e numeradas em `/supabase/migrations/`
- RNF-MAN-04: README atualizado com instruções de setup do zero

---

## 8. Sprints e Tasks

> **Convenção de status:** `[ ]` = pendente · `[x]` = concluído  
> **Estimativas:** 1 sprint = 1 semana de trabalho de 1 desenvolvedor  
> **Dependências:** cada sprint depende do anterior estar 100% completo

---

### Sprint 1 — Fundação: Supabase + Schema + Auth

**Objetivo:** Supabase configurado, banco criado com todas as tabelas, RLS ativo, admin logando no sistema.  
**Critério de Aceite do Sprint:** Admin consegue fazer login em `/admin.html` com email/senha e ver dashboard em branco. Nenhuma tabela acessível sem autenticação válida.  
**Estimativa:** 5 dias

---

#### 1.1 Criar projeto no Supabase

- [ ] **1.1** Criar conta e projeto no Supabase
  - **Descrição:** Acesse app.supabase.com → New Project → Nome: "rei-da-agua" → Região: South America (São Paulo) → Defina senha forte do banco → Aguarde provisionamento (~2min).
  - **Arquivos afetados:** Nenhum (ação no painel Supabase)
  - **DoD:** Projeto ativo, URL e chaves `anon` e `service_role` visíveis em Settings → API.

#### 1.2 Salvar credenciais de ambiente

- [ ] **1.2** Criar arquivo `js/config.js` com variáveis de ambiente do Supabase
  - **Descrição:** Crie `/js/config.js` com o seguinte conteúdo:
    ```javascript
    // js/config.js — NÃO versionar a service_role key
    const SUPABASE_URL = 'https://SEU-PROJECT-ID.supabase.co';
    const SUPABASE_ANON_KEY = 'sua-anon-key-aqui';
    ```
    Adicione `js/config.js` ao `.gitignore`. Crie `js/config.example.js` com valores placeholder para documentação.
  - **Arquivos criados:** `js/config.js`, `js/config.example.js`, `.gitignore` (atualizado)
  - **DoD:** `js/config.js` existe localmente, não aparece em `git status` como arquivo rastreado.

#### 1.3 Executar migration inicial — todas as tabelas

- [ ] **1.3** Criar arquivo `supabase/migrations/001_initial_schema.sql` e executar no Supabase
  - **Descrição:** Crie a pasta `/supabase/migrations/`. Crie o arquivo `001_initial_schema.sql` com os CREATEs de todas as 9 tabelas conforme Seção 5 deste PRD (profiles, customers, products, routes, orders, order_items, quotes, delivery_notes, settings). Inclua os tipos corretos, constraints, defaults e a coluna `subtotal` como GENERATED ALWAYS. Execute no Supabase Dashboard → SQL Editor → Cole o conteúdo → Run.
  - **Arquivos criados:** `supabase/migrations/001_initial_schema.sql`
  - **DoD:** Todas as 9 tabelas aparecem em Supabase Dashboard → Table Editor sem erro.

#### 1.4 Criar índices de performance

- [ ] **1.4** Criar arquivo `supabase/migrations/002_indexes.sql` e executar
  - **Descrição:** Crie `002_indexes.sql` com:
    ```sql
    CREATE INDEX idx_orders_status ON orders(status);
    CREATE INDEX idx_orders_scheduled_for ON orders(scheduled_for);
    CREATE INDEX idx_orders_driver_id ON orders(driver_id);
    CREATE INDEX idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX idx_customers_district ON customers(district);
    CREATE INDEX idx_customers_phone ON customers(phone);
    CREATE INDEX idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX idx_delivery_notes_order_id ON delivery_notes(order_id);
    ```
    Execute no SQL Editor do Supabase.
  - **Arquivos criados:** `supabase/migrations/002_indexes.sql`
  - **DoD:** Query `EXPLAIN SELECT * FROM orders WHERE status = 'pending'` mostra Index Scan (não Seq Scan).

#### 1.5 Habilitar RLS em todas as tabelas

- [ ] **1.5** Criar `supabase/migrations/003_enable_rls.sql` e executar
  - **Descrição:** Crie `003_enable_rls.sql` com:
    ```sql
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
    ```
    Execute no SQL Editor. **Atenção:** Após este passo, NENHUMA tabela estará acessível até as policies serem criadas na task 1.6.
  - **Arquivos criados:** `supabase/migrations/003_enable_rls.sql`
  - **DoD:** Tentativa de `SELECT * FROM orders` via API sem token retorna array vazio (não erro 500).

#### 1.6 Criar RLS Policies completas

- [ ] **1.6** Criar `supabase/migrations/004_rls_policies.sql` e executar
  - **Descrição:** Crie `004_rls_policies.sql` com policies para cada tabela. Lógica obrigatória:

    **products e settings (leitura pública):**
    ```sql
    CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
    CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
    ```

    **profiles (usuário vê apenas o próprio perfil; admin vê todos):**
    ```sql
    CREATE POLICY "profiles_self_read" ON profiles FOR SELECT
      USING (auth.uid() = id OR
             EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    ```

    **orders (admin tudo; driver vê/atualiza apenas os próprios):**
    ```sql
    CREATE POLICY "orders_admin_all" ON orders FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "orders_driver_read" ON orders FOR SELECT
      USING (driver_id = auth.uid());
    CREATE POLICY "orders_driver_update_status" ON orders FOR UPDATE
      USING (driver_id = auth.uid())
      WITH CHECK (driver_id = auth.uid());
    ```

    **delivery_notes (admin tudo; driver cria/lê apenas dos próprios pedidos):**
    ```sql
    CREATE POLICY "notes_admin_all" ON delivery_notes FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "notes_driver_insert" ON delivery_notes FOR INSERT
      WITH CHECK (author_id = auth.uid() AND
                  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND driver_id = auth.uid()));
    CREATE POLICY "notes_driver_read" ON delivery_notes FOR SELECT
      USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND driver_id = auth.uid()));
    ```

    **customers, routes, quotes, order_items (apenas admin):**
    ```sql
    CREATE POLICY "customers_admin_all" ON customers FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "routes_admin_all" ON routes FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "quotes_admin_all" ON quotes FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "order_items_admin_all" ON order_items FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    CREATE POLICY "order_items_driver_read" ON order_items FOR SELECT
      USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND driver_id = auth.uid()));
    ```

    **Política extra para orders — INSERT público (cliente sem login):**
    ```sql
    CREATE POLICY "orders_public_insert" ON orders FOR INSERT WITH CHECK (true);
    CREATE POLICY "order_items_public_insert" ON order_items FOR INSERT WITH CHECK (true);
    ```
  - **Arquivos criados:** `supabase/migrations/004_rls_policies.sql`
  - **DoD:** Teste manual — requisição sem token retorna apenas `products` e `settings`. Requisição com token de driver retorna apenas seus pedidos.

#### 1.7 Criar dados iniciais (seed)

- [ ] **1.7** Criar `supabase/migrations/005_seed.sql` com dados iniciais
  - **Descrição:** Crie `005_seed.sql` com:
    ```sql
    -- Produtos padrão
    INSERT INTO products (name, size_liters, price) VALUES
      ('Galão 20L', 20, 12.00),
      ('Galão 10L', 10, 8.00);

    -- Configurações padrão
    INSERT INTO settings (key, value) VALUES
      ('whatsapp_number', '5541999999999'),
      ('business_name', 'Rei da Água'),
      ('whatsapp_message_template', 'Olá! Gostaria de fazer um pedido. ID: {order_id}'),
      ('delivery_days', '["Segunda","Quarta","Sexta"]');
    ```
    Execute no SQL Editor.
  - **Arquivos criados:** `supabase/migrations/005_seed.sql`
  - **DoD:** `SELECT * FROM products` retorna 2 linhas. `SELECT * FROM settings` retorna 4 linhas.

#### 1.8 Criar conta admin inicial no Supabase

- [ ] **1.8** Criar usuário admin via Supabase Dashboard
  - **Descrição:** No Supabase Dashboard → Authentication → Users → Invite User → insira o email do dono. Após criação, execute no SQL Editor:
    ```sql
    INSERT INTO profiles (id, full_name, role, phone)
    VALUES (
      (SELECT id FROM auth.users WHERE email = 'email-do-dono@exemplo.com'),
      'Dono - Rei da Água',
      'admin',
      '41999999999'
    );
    ```
  - **Arquivos afetados:** Nenhum (ação no painel)
  - **DoD:** `SELECT * FROM profiles WHERE role = 'admin'` retorna 1 linha.

#### 1.9 Criar módulo JS de autenticação

- [ ] **1.9** Criar `js/supabase-client.js` — cliente Supabase singleton
  - **Descrição:** Crie o arquivo que inicializa o cliente Supabase usando a CDN do Supabase JS v2. Este arquivo será incluído em TODAS as páginas antes de qualquer outro JS do projeto:
    ```javascript
    // js/supabase-client.js
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

    export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    ```
    Adicione `<script src="js/config.js"></script>` como primeiro script em todos os HTMLs antes de qualquer módulo.
  - **Arquivos criados:** `js/supabase-client.js`
  - **DoD:** Console do browser sem erros ao abrir `index.html` com os scripts carregados.

#### 1.10 Criar `js/auth.js` — funções de login/logout/guard

- [ ] **1.10** Criar módulo de autenticação com login, logout e proteção de rota
  - **Descrição:** Crie `js/auth.js` com as funções:
    ```javascript
    // js/auth.js
    import { supabase } from './supabase-client.js';

    export async function login(email, password) { ... }
    export async function logout() { ... }
    export async function getCurrentUser() { ... }
    export async function getUserProfile() { ... }
    // requireAuth(allowedRoles) — redireciona se não autenticado ou role errada
    export async function requireAuth(allowedRoles = ['admin', 'driver']) { ... }
    ```
    `requireAuth` deve: (1) checar sessão ativa, (2) buscar profile para obter role, (3) redirecionar para `/index.html` se sem sessão, (4) redirecionar para página correta se role não permitida.
  - **Arquivos criados:** `js/auth.js`
  - **DoD:** Acessar `/admin.html` sem estar logado redireciona para `/index.html`. Login com credenciais corretas retorna sessão válida.

#### 1.11 Criar página de login unificada

- [ ] **1.11** Criar `login.html` — página de login para admin e driver
  - **Descrição:** Crie `login.html` com formulário de email + senha. Após login bem-sucedido, redireciona automaticamente: admin → `admin.html`, driver → `driver.html`. Estilo consistente com identidade visual existente do Rei da Água. Exibir mensagem de erro clara em caso de credenciais inválidas. Não há link de "cadastrar-se" (apenas admin cria contas).
  - **Arquivos criados:** `login.html`
  - **DoD:** Login com admin redireciona para `admin.html`. Login com driver redireciona para `driver.html`. Credenciais erradas exibem "Email ou senha inválidos" sem recarregar a página.

---

### Sprint 2 — Produtos, Preços e Configurações

**Objetivo:** Preços e configurações migrados do `localStorage` para o banco. Calculadora pública busca dados reais do Supabase. Admin edita preços via painel.  
**Critério de Aceite do Sprint:** Alterar preço do galão 20L no painel admin reflete na calculadora pública em menos de 5 segundos sem reload.  
**Estimativa:** 3 dias

---

#### 2.1 Criar `js/settings.js` — módulo de configurações

- [ ] **2.1** Criar módulo que busca e atualiza configurações do banco
  - **Descrição:** Crie `js/settings.js` com:
    ```javascript
    export async function getSettings() { ... }        // retorna objeto key→value
    export async function getSetting(key) { ... }      // retorna valor único
    export async function updateSetting(key, value) { ... } // apenas admin
    export async function getProducts() { ... }        // retorna produtos ativos
    export async function updateProduct(id, data) { ... }   // apenas admin
    ```
    `getSettings()` deve ter fallback: se Supabase falhar, retornar os valores hardcoded do `CONFIG` existente no `script.js`.
  - **Arquivos criados:** `js/settings.js`
  - **DoD:** `getProducts()` retorna array com os 2 produtos do seed. `getSettings()` retorna objeto com as 4 configurações.

#### 2.2 Migrar calculadora pública para buscar preços do banco

- [ ] **2.2** Modificar `script.js` para substituir `CONFIG` hardcoded por chamadas ao Supabase
  - **Descrição:** Localize o objeto `CONFIG` no topo de `script.js`. Substitua os valores de preço e configurações de contato por chamadas a `getProducts()` e `getSettings()`. A calculadora deve exibir "Carregando preços..." enquanto busca, e então atualizar os valores. Manter o fallback hardcoded caso a chamada falhe.
  - **Arquivos afetados:** `script.js`
  - **DoD:** Alterar preço no banco → recarregar `index.html` → calculadora mostra novo preço. Console sem erros.

#### 2.3 Criar subscription Realtime para atualização de preços sem reload

- [ ] **2.3** Adicionar listener Realtime em `script.js` para tabela `products`
  - **Descrição:** Após carregar preços iniciais, crie uma subscription:
    ```javascript
    supabase.channel('products-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => { atualizarCalculadoraComNovoPreco(payload.new); })
      .subscribe();
    ```
    Habilite Replication para a tabela `products` no Supabase Dashboard → Database → Replication → Source → adicione `products`.
  - **Arquivos afetados:** `script.js`
  - **DoD:** Admin altera preço no painel → em < 5 segundos, calculadora pública atualiza o valor SEM reload da página.

#### 2.4 Criar seção de Produtos no painel admin

- [ ] **2.4** Criar `admin.html` com seção de edição de produtos e configurações
  - **Descrição:** Crie `admin.html` como ponto de entrada do painel administrativo. Nesta sprint, implemente apenas a seção "Produtos & Preços" e "Configurações". A seção de produtos deve listar os produtos com campo de edição de preço e toggle ativo/inativo. A seção de configurações deve permitir editar `whatsapp_number`, `business_name` e `whatsapp_message_template`. Adicionar chamada a `requireAuth(['admin'])` no início do script da página.
  - **Arquivos criados:** `admin.html`
  - **Arquivos criados:** `js/admin-products.js`
  - **DoD:** Admin logado consegue editar preço do galão, salvar e ver confirmação de sucesso. Usuário não logado é redirecionado ao tentar acessar `admin.html`.

---

### Sprint 3 — Clientes e Pedidos

**Objetivo:** CRUD de clientes implementado. Pedidos criados pela calculadora pública são salvos no banco. Painel admin lista e gerencia pedidos.  
**Critério de Aceite do Sprint:** Cliente preenche calculadora → clica "Enviar pedido" → pedido aparece no painel admin com status `pending` → WhatsApp abre com `order_id` na mensagem.  
**Estimativa:** 5 dias

---

#### 3.1 Criar `js/customers.js` — CRUD de clientes

- [ ] **3.1** Criar módulo de clientes com todas as operações
  - **Descrição:** Crie `js/customers.js` com:
    ```javascript
    export async function listCustomers(search = '') { ... }  // busca por nome/bairro/telefone
    export async function getCustomer(id) { ... }
    export async function createCustomer(data) { ... }
    export async function updateCustomer(id, data) { ... }
    export async function deactivateCustomer(id) { ... }     // soft delete: active=false
    export async function getCustomerOrders(customerId) { ... }
    ```
    Validações obrigatórias antes de insert: `name` não vazio, `phone` com mínimo 10 dígitos, `address` não vazio, `district` não vazio.
  - **Arquivos criados:** `js/customers.js`
  - **DoD:** Unit test manual: criar cliente → listar → atualizar → desativar. Nenhuma operação sem validação passa.

#### 3.2 Criar seção Clientes no painel admin

- [ ] **3.2** Adicionar seção "Clientes" ao `admin.html`
  - **Descrição:** Adicione aba/seção "Clientes" no `admin.html` com: (1) tabela paginada de clientes ativos com colunas: Nome, Telefone, Bairro, Ações; (2) barra de busca em tempo real (filtra localmente após carregar, não nova query); (3) modal de cadastro/edição de cliente com validação de campos; (4) botão "Ver Pedidos" que abre histórico do cliente. Paginação: 20 registros por página.
  - **Arquivos afetados:** `admin.html`
  - **Arquivos criados:** `js/admin-customers.js`
  - **DoD:** Admin consegue criar, editar e desativar clientes. Busca filtra em tempo real. Modal fecha após salvar com sucesso.

#### 3.3 Criar `js/orders.js` — módulo de pedidos

- [ ] **3.3** Criar módulo de pedidos com criação e gestão
  - **Descrição:** Crie `js/orders.js` com:
    ```javascript
    export async function createOrder(orderData, items) { ... }
    // orderData: { customer_id?, notes, scheduled_for? }
    // items: [{ product_id, quantity, unit_price }]
    // Deve usar transação: INSERT em orders + INSERT em order_items

    export async function listOrders(filters = {}) { ... }
    // filters: { status, date, driver_id, route_id }

    export async function getOrder(id) { ... }
    // Retorna order + order_items + customer + delivery_notes

    export async function updateOrderStatus(id, status) { ... }
    export async function assignOrder(id, { driverId, routeId }) { ... }
    ```
    `createOrder` deve buscar `unit_price` atual de `products` no momento da criação (snapshot), não usar valor do frontend.
  - **Arquivos criados:** `js/orders.js`
  - **DoD:** `createOrder` cria 1 registro em `orders` e N em `order_items`. Total calculado corretamente. Rollback automático se `order_items` falhar.

#### 3.4 Integrar calculadora pública com `createOrder`

- [ ] **3.4** Modificar `script.js` para salvar pedido no banco antes de abrir WhatsApp
  - **Descrição:** Localize a função que gera a mensagem do WhatsApp em `script.js`. Modifique o fluxo para: (1) Coletar itens do carrinho atual; (2) Chamar `createOrder(orderData, items)`; (3) Em caso de sucesso: incluir `order_id` na mensagem do WhatsApp, marcar `whatsapp_sent: true`; (4) Em caso de falha: exibir erro "Não foi possível registrar o pedido. Tente novamente." e NÃO abrir WhatsApp; (5) Mostrar spinner/loading durante o processo.
  - **Arquivos afetados:** `script.js`
  - **DoD:** Submeter calculadora → pedido aparece em `orders` no Supabase → WhatsApp abre com `ID do Pedido: <uuid>` na mensagem.

#### 3.5 Criar seção Pedidos no painel admin

- [ ] **3.5** Adicionar seção "Pedidos" ao `admin.html`
  - **Descrição:** Adicione aba/seção "Pedidos" com: (1) tabela de pedidos com filtros por data (hoje/semana/mês), status e entregador; (2) colunas: ID (6 chars), Cliente, Total, Status (badge colorido), Data, Entregador, Ações; (3) modal de detalhes do pedido com itens, cliente e notas; (4) dropdown para mudar status; (5) dropdown para atribuir entregador e rota; (6) subscription Realtime para novos pedidos aparecerem automaticamente com notificação visual.
  - **Arquivos afetados:** `admin.html`
  - **Arquivos criados:** `js/admin-orders.js`
  - **DoD:** Novo pedido via calculadora aparece no painel admin sem reload, com badge de status `pending` em amarelo.

---

### Sprint 4 — Rotas e Orçamentos

**Objetivo:** CRUD de rotas implementado. Orçamentos criáveis e convertíveis em pedido.  
**Critério de Aceite do Sprint:** Admin cria rota, associa entregador, e ao criar pedido pode selecionar a rota. Orçamento gerado pode ser convertido em pedido com 1 clique.  
**Estimativa:** 4 dias

---

#### 4.1 Criar `js/routes.js` — CRUD de rotas

- [ ] **4.1** Criar módulo de rotas
  - **Descrição:** Crie `js/routes.js` com:
    ```javascript
    export async function listRoutes() { ... }
    export async function getRoute(id) { ... }
    export async function createRoute(data) { ... }
    // data: { name, districts: string[], days_of_week: number[], driver_id }
    export async function updateRoute(id, data) { ... }
    export async function deactivateRoute(id) { ... }
    export async function getTodayRoutes() { ... }
    // Retorna rotas cujo days_of_week inclui o dia da semana atual
    ```
    Validação: `days_of_week` deve conter valores entre 0 e 6. `districts` deve ter ao menos 1 item.
  - **Arquivos criados:** `js/routes.js`
  - **DoD:** CRUD completo funcional. `getTodayRoutes()` em uma segunda-feira retorna apenas rotas com `1` em `days_of_week`.

#### 4.2 Criar seção Rotas no painel admin

- [ ] **4.2** Adicionar seção "Rotas" ao `admin.html`
  - **Descrição:** Adicione aba/seção "Rotas" com: (1) listagem de rotas com nome, bairros, dias e entregador vinculado; (2) modal de criação/edição com: campo nome, input multi-tag de bairros (enter para adicionar bairro), checkboxes de dias da semana (Dom a Sáb), select de entregador; (3) botão ativo/inativo.
  - **Arquivos afetados:** `admin.html`
  - **Arquivos criados:** `js/admin-routes.js`
  - **DoD:** Admin cria rota "Rota Norte" com 3 bairros, dias Seg/Qua/Sex, entregador selecionado. Rota aparece na lista.

#### 4.3 Criar `js/quotes.js` — módulo de orçamentos

- [ ] **4.3** Criar módulo de orçamentos
  - **Descrição:** Crie `js/quotes.js` com:
    ```javascript
    export async function createQuote(data) { ... }
    // data: { customer_id?, customer_name?, customer_phone?, items: [{product_id, quantity, unit_price}] }
    export async function listQuotes(status = 'open') { ... }
    export async function convertQuoteToOrder(quoteId) { ... }
    // Cria pedido a partir do orçamento, muda status para 'converted', preenche order_id
    export async function expireQuote(quoteId) { ... }
    ```
  - **Arquivos criados:** `js/quotes.js`
  - **DoD:** `createQuote` salva com status `open`. `convertQuoteToOrder` cria pedido e muda status. Chamada dupla a `convertQuoteToOrder` no mesmo quote retorna erro "Orçamento já convertido".

#### 4.4 Criar seção Orçamentos no painel admin

- [ ] **4.4** Adicionar seção "Orçamentos" ao `admin.html`
  - **Descrição:** Adicione aba/seção "Orçamentos" com: (1) formulário de novo orçamento com busca de cliente (autocomplete) ou campos livres de nome/telefone, seletor de produtos com quantidades e total calculado em tempo real; (2) listagem de orçamentos abertos com: cliente, total, data de criação, data de expiração (badge "expirando" se < 24h), ações: "Converter em Pedido" e "Expirar"; (3) aba "Histórico" com orçamentos convertidos e expirados.
  - **Arquivos afetados:** `admin.html`
  - **Arquivos criados:** `js/admin-quotes.js`
  - **DoD:** Admin cria orçamento → aparece em "Orçamentos Abertos" → clica "Converter" → pedido criado → orçamento some da lista aberta.

---

### Sprint 5 — Painel do Entregador (Driver App)

**Objetivo:** App mobile-first completo para o entregador confirmar entregas, ver rota do dia, adicionar observações e consultar histórico.  
**Critério de Aceite do Sprint:** Driver faz login, vê lista de entregas do dia, confirma uma entrega tocando um botão, a confirmação aparece em tempo real no painel admin.  
**Estimativa:** 5 dias

---

#### 5.1 Criar `driver.html` — estrutura e navegação mobile

- [ ] **5.1** Criar `driver.html` com layout mobile-first e navegação por abas
  - **Descrição:** Crie `driver.html` como SPA (Single Page App) com navegação por tabs na parte inferior (padrão mobile). Abas: "Hoje" (rota do dia), "Histórico", "Perfil". Requisitos de layout: max-width 480px, fonte mínima 16px, botões com altura mínima 48px (touch target), cores de alto contraste para uso em ambiente externo/sol. Adicionar chamada a `requireAuth(['driver'])` no início. Header com nome do entregador e botão de logout.
  - **Arquivos criados:** `driver.html`, `css/driver.css`
  - **DoD:** Página carrega em < 2s em simulação de 3G no DevTools. Navegação entre abas funciona sem reload. Sem erros no console.

#### 5.2 Criar `js/driver.js` — módulo de operações do entregador

- [ ] **5.2** Criar módulo de operações do driver
  - **Descrição:** Crie `js/driver.js` com:
    ```javascript
    export async function getTodayDeliveries() { ... }
    // Busca pedidos com: driver_id = auth.uid(), scheduled_for = today,
    // status IN ('confirmed', 'out_for_delivery')
    // Inclui: customer (name, address, phone), order_items + products

    export async function confirmDelivery(orderId) { ... }
    // UPDATE orders SET status='delivered', updated_at=now() WHERE id=orderId AND driver_id=auth.uid()

    export async function addDeliveryNote(orderId, content) { ... }
    // INSERT em delivery_notes com author_id = auth.uid()

    export async function getMyDeliveryHistory(limit = 50) { ... }
    // Pedidos com status='delivered' do driver, ordenados por updated_at DESC
    ```
  - **Arquivos criados:** `js/driver.js`
  - **DoD:** `getTodayDeliveries()` retorna apenas pedidos do driver logado. `confirmDelivery` falha se o pedido pertencer a outro driver (RLS barra).

#### 5.3 Implementar aba "Hoje" — lista de entregas do dia

- [ ] **5.3** Renderizar lista de entregas do dia com ações
  - **Descrição:** Na aba "Hoje" de `driver.html`: (1) Exibir card por entrega com: nome do cliente, endereço completo, telefone (link `tel:`), itens do pedido, status badge; (2) Botão "✓ Confirmar Entrega" verde e grande (mínimo 56px altura) — desabilitado após confirmação, mostrando "Entregue ✓"; (3) Botão "📝 Observação" que abre campo de texto inline (não modal); (4) Link "📍 Ver no Mapa" que abre Google Maps com o endereço do cliente (`https://maps.google.com/?q=endereço`); (5) Ordenar por: não entregues primeiro, depois alfabético por nome.
  - **Arquivos afetados:** `driver.html`, `js/driver.js`
  - **DoD:** Driver confirma entrega → botão muda para "Entregue ✓" imediatamente (optimistic update) → status no banco muda. Observação salva aparece abaixo do card.

#### 5.4 Implementar Realtime no painel driver

- [ ] **5.4** Adicionar subscription Realtime para atualização automática da lista
  - **Descrição:** Na aba "Hoje", criar subscription no canal `driver-{auth.uid()}-orders`:
    ```javascript
    supabase.channel(`driver-${userId}-orders`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `driver_id=eq.${userId}`
      }, (payload) => { atualizarCardNaLista(payload.new); })
      .subscribe();
    ```
    Se admin atribuir novo pedido ao driver, o pedido aparece na lista sem reload.
  - **Arquivos afetados:** `driver.html`, `js/driver.js`
  - **DoD:** Admin atribui pedido a driver em `admin.html` → pedido aparece em `driver.html` em < 3 segundos sem reload.

#### 5.5 Implementar aba "Histórico" do driver

- [ ] **5.5** Renderizar histórico de entregas do driver
  - **Descrição:** Na aba "Histórico": (1) Lista de entregas passadas com entregues (status=delivered), agrupadas por data; (2) Cada item mostra: cliente, endereço, itens, horário de confirmação; (3) Paginação simples: botão "Carregar mais" (load more, não paginação numérica — melhor para mobile); (4) Total de entregas do dia exibido como badge no header da data.
  - **Arquivos afetados:** `driver.html`, `js/driver.js`
  - **DoD:** Histórico carrega 20 entregas inicialmente. Botão "Carregar mais" carrega próximas 20. Agrupamento por data correto.

#### 5.6 Implementar aba "Perfil" do driver

- [ ] **5.6** Criar aba de perfil com informações e logout
  - **Descrição:** Na aba "Perfil": (1) Exibir nome completo, telefone e rota padrão do driver; (2) Botão de logout grande e claro; (3) Contador do dia: "X entregas feitas hoje de Y total". Sem funcionalidade de edição de perfil (apenas admin altera dados).
  - **Arquivos afetados:** `driver.html`
  - **DoD:** Contador atualiza em tempo real quando entrega é confirmada. Logout redireciona para `login.html`.

---

### Sprint 6 — Dashboard Admin e Gestão de Entregadores

**Objetivo:** Dashboard operacional para o admin com visão do dia. CRUD de entregadores. Subscription Realtime no painel admin.  
**Critério de Aceite do Sprint:** Admin abre dashboard e vê: pedidos do dia, status de cada entrega em tempo real, e resumo de faturamento do dia.  
**Estimativa:** 4 dias

---

#### 6.1 Criar dashboard principal do admin

- [ ] **6.1** Implementar tela inicial do `admin.html` com KPIs do dia
  - **Descrição:** Crie a seção "Dashboard" (tela inicial após login) com cards de KPIs: (1) Total de pedidos hoje; (2) Entregas confirmadas hoje / total; (3) Faturamento do dia (soma de `orders.total` onde `scheduled_for = today` e `status = delivered`); (4) Pedidos pendentes (status=pending sem driver atribuído); (5) Mapa de calor de bairros (tabela simples: bairro → quantidade de pedidos no mês). Todos os KPIs atualizam via Realtime.
  - **Arquivos afetados:** `admin.html`
  - **Arquivos criados:** `js/admin-dashboard.js`
  - **DoD:** KPIs carregam ao abrir o dashboard. Confirmar entrega no driver → contador de "Confirmadas" incrementa no admin em < 3s.

#### 6.2 Criar seção Entregadores no painel admin

- [ ] **6.2** Adicionar seção "Entregadores" ao `admin.html`
  - **Descrição:** Adicione aba/seção "Entregadores" com: (1) Listagem de entregadores com nome, telefone, rota padrão, total de entregas do mês; (2) Botão "Novo Entregador" que abre modal com campos: nome, email (para login), senha inicial, telefone, rota padrão; (3) A criação de entregador deve: criar usuário no Supabase Auth via `supabase.auth.admin.createUser` (usar Edge Function para isso — ver task 6.3), criar registro em `profiles` com `role='driver'`; (4) Botão de desativar entregador (não deleta, apenas `active=false` no profile).
  - **Arquivos afetados:** `admin.html`
  - **Arquivos criados:** `js/admin-drivers.js`
  - **DoD:** Admin cria entregador → entregador recebe email com link de confirmação → consegue logar em `driver.html`.

#### 6.3 Criar Edge Function para criação de usuários

- [ ] **6.3** Criar Supabase Edge Function `create-driver` para criar usuários server-side
  - **Descrição:** A criação de usuários via `auth.admin.createUser` requer a `service_role` key, que NÃO pode ficar no frontend. Crie uma Edge Function no Supabase para isso. No Supabase Dashboard → Edge Functions → New Function → Nome: `create-driver`. Código:
    ```typescript
    // supabase/functions/create-driver/index.ts
    import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

    serve(async (req) => {
      // Verificar se caller é admin via JWT
      // Criar usuário com supabase.auth.admin.createUser
      // Criar profile com role='driver'
      // Retornar { user_id, email }
    });
    ```
    Faça o deploy via Supabase CLI: `supabase functions deploy create-driver`.
  - **Arquivos criados:** `supabase/functions/create-driver/index.ts`
  - **DoD:** POST para `https://SEU-PROJECT.supabase.co/functions/v1/create-driver` com token de admin cria usuário. POST com token de driver retorna 403.

#### 6.4 Criar subscription Realtime global no painel admin

- [ ] **6.4** Adicionar listener Realtime para pedidos e entregas no painel admin
  - **Descrição:** No `admin.html`, criar subscriptions para: (1) Novos pedidos (`INSERT` em `orders`) → notificação toast + atualiza contador do dashboard; (2) Mudanças de status (`UPDATE` em `orders`) → atualiza badge de status na tabela de pedidos e KPIs do dashboard; (3) Novas notas (`INSERT` em `delivery_notes`) → exibe indicador no pedido correspondente. Habilite replication para as tabelas `orders` e `delivery_notes` no Supabase.
  - **Arquivos afetados:** `js/admin-dashboard.js`, `js/admin-orders.js`
  - **DoD:** Abrir admin e driver em abas separadas → confirmar entrega no driver → status muda no admin em < 3s sem reload.

---

### Sprint 7 — Deploy, Segurança Final e Documentação

**Objetivo:** Sistema em produção no Netlify com CI/CD. Auditoria de segurança completa. README e guia de operação atualizados.  
**Critério de Aceite do Sprint:** Push para branch `main` no GitHub dispara deploy automático no Netlify. Sistema acessível em HTTPS com domínio customizado configurado.  
**Estimativa:** 3 dias

---

#### 7.1 Configurar Netlify com CI/CD automático

- [ ] **7.1** Conectar repositório GitHub ao Netlify e configurar variáveis de ambiente
  - **Descrição:** (1) Acesse app.netlify.com → Add new site → Import from Git → Selecione o repositório; (2) Build settings: Build command: vazio (site estático), Publish directory: `/` (ou `/public` se reorganizar); (3) Em Site settings → Environment variables, adicione: `SUPABASE_URL` e `SUPABASE_ANON_KEY`; (4) Crie `netlify.toml` na raiz com redirects para SPA:
    ```toml
    [[redirects]]
      from = "/admin"
      to = "/admin.html"
      status = 200
    [[redirects]]
      from = "/driver"
      to = "/driver.html"
      status = 200
    [[redirects]]
      from = "/login"
      to = "/login.html"
      status = 200
    ```
  - **Arquivos criados:** `netlify.toml`
  - **DoD:** Push para `main` → Netlify build passa em < 2min → site acessível em `https://NOME.netlify.app`.

#### 7.2 Criar script de build para injetar variáveis no `config.js`

- [ ] **7.2** Criar `build.sh` que gera `js/config.js` a partir de variáveis de ambiente do Netlify
  - **Descrição:** Como o frontend é HTML puro, as variáveis de ambiente do Netlify precisam ser injetadas em tempo de build. Crie `build.sh`:
    ```bash
    #!/bin/bash
    cat > js/config.js << EOF
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
    EOF
    echo "config.js gerado com sucesso."
    ```
    Atualize `netlify.toml` para usar `build.sh` como build command: `command = "bash build.sh"`.
  - **Arquivos criados:** `build.sh`
  - **Arquivos afetados:** `netlify.toml`
  - **DoD:** Deploy no Netlify gera `js/config.js` com as variáveis corretas. `js/config.js` não existe no repositório.

#### 7.3 Configurar domínio customizado no Netlify

- [ ] **7.3** Apontar domínio para o Netlify (se aplicável)
  - **Descrição:** Em Netlify → Domain settings → Add custom domain → insira o domínio. Siga as instruções do Netlify para configurar os registros DNS (CNAME ou A record) no provedor do domínio. Ativar HTTPS automático (Let's Encrypt — gratuito, automático no Netlify).
  - **Arquivos afetados:** Nenhum (configuração de DNS externo)
  - **DoD:** Site acessível via HTTPS no domínio customizado. Certificado SSL válido. HTTP redireciona para HTTPS.

#### 7.4 Auditoria de segurança — checklist RLS

- [ ] **7.4** Executar script de validação de RLS em todas as tabelas
  - **Descrição:** Crie `supabase/scripts/audit_rls.sql` e execute no SQL Editor:
    ```sql
    -- Verifica tabelas sem RLS habilitado
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = false;

    -- Lista todas as policies existentes
    SELECT schemaname, tablename, policyname, permissive, roles, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd;
    ```
    A primeira query deve retornar 0 linhas (todas as tabelas com RLS). Revisar a segunda query e confirmar que cada tabela tem policies para SELECT, INSERT, UPDATE e DELETE conforme o esperado.
  - **Arquivos criados:** `supabase/scripts/audit_rls.sql`
  - **DoD:** Zero tabelas sem RLS. Nenhuma policy ausente para operações críticas.

#### 7.5 Teste de penetração manual — acessos não autorizados

- [ ] **7.5** Executar roteiro de testes de segurança manual
  - **Descrição:** Execute os seguintes testes usando o Supabase REST API diretamente (curl ou Postman), sem token (anon):
    1. `GET /rest/v1/orders` → deve retornar array vazio
    2. `GET /rest/v1/customers` → deve retornar array vazio
    3. `POST /rest/v1/orders` → deve funcionar (política public insert)
    4. `DELETE /rest/v1/products?id=eq.{id}` → deve retornar 0 rows affected

    Com token de driver:
    5. `GET /rest/v1/orders` → deve retornar apenas pedidos do próprio driver
    6. `GET /rest/v1/customers` → deve retornar array vazio
    7. `DELETE /rest/v1/orders?id=eq.{id-de-outro-driver}` → deve retornar 0 rows affected

    Registre todos os resultados em `docs/security-audit.md`.
  - **Arquivos criados:** `docs/security-audit.md`
  - **DoD:** Todos os 7 testes passam conforme esperado. Qualquer falha deve corrigir a policy antes de continuar.

#### 7.6 Atualizar README.md com guia completo de setup

- [ ] **7.6** Reescrever `README.md` com instruções de setup do zero
  - **Descrição:** O README deve conter seções: (1) Pré-requisitos; (2) Setup do Supabase (passo a passo com prints de onde clicar); (3) Execução das migrations (ordem exata dos arquivos SQL); (4) Configuração do Netlify; (5) Variáveis de ambiente necessárias; (6) Como criar o primeiro usuário admin; (7) Como criar entregadores; (8) Arquitetura em 5 parágrafos; (9) Troubleshooting de problemas comuns. Um desenvolvedor sem contexto deve conseguir colocar o sistema no ar em < 2 horas seguindo o README.
  - **Arquivos afetados:** `README.md`
  - **DoD:** Seguir o README do zero resulta em sistema funcionando. Nenhum passo está omitido.

#### 7.7 Criar script de rollback de migrations

- [ ] **7.7** Criar `supabase/migrations/000_rollback.sql` para desfazer toda a instalação
  - **Descrição:** Crie o script de rollback completo para uso em emergência:
    ```sql
    -- ATENÇÃO: Executa drop de todas as tabelas e policies. IRREVERSÍVEL.
    DROP TABLE IF EXISTS delivery_notes CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS quotes CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS routes CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS settings CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
    -- Limpar policies órfãs
    -- Limpar Edge Functions (manual via dashboard)
    ```
    Adicionar comentário de aviso no topo do arquivo em letras maiúsculas.
  - **Arquivos criados:** `supabase/migrations/000_rollback.sql`
  - **DoD:** Arquivo existe, tem comentários de aviso, não está no caminho de execução automática.

---

## 9. Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R1 | Limite gratuito do Supabase excedido (500MB banco, 50k auth MAU) | Baixa | Alto | Monitorar usage mensalmente. Plano Pro custa $25/mês se necessário. |
| R2 | Entregador sem internet durante entrega | Média | Médio | Implementar Service Worker para cache da rota do dia. Confirmação enfileirada offline (Sprint 8 futuro). |
| R3 | Cliente sem cadastro tenta rastrear pedido | Alta | Baixo | Exibir `order_id` na mensagem WhatsApp. Futuro: página pública de rastreio por ID. |
| R4 | Admin esquece senha | Média | Alto | Supabase Auth tem reset por email nativo. Documentar fluxo no README. |
| R5 | RLS policy incorreta expõe dados | Baixa | Crítico | Task 7.4 (auditoria) e 7.5 (pentest manual) obrigatórias antes do go-live. |
| R6 | Edge Function `create-driver` fora do ar | Baixa | Médio | Fallback: admin cria usuário manualmente no Supabase Dashboard + INSERT em profiles. |

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| **RLS** | Row Level Security — mecanismo do PostgreSQL que filtra linhas baseado em quem executa a query. |
| **JWT** | JSON Web Token — token de autenticação gerado pelo Supabase Auth, válido por 1 hora com refresh automático. |
| **Realtime** | Funcionalidade do Supabase que usa WebSockets para notificar clientes sobre mudanças no banco em tempo real. |
| **anon key** | Chave pública do Supabase, segura para usar no frontend. Dá acesso apenas ao que as RLS policies permitem. |
| **service_role key** | Chave privada do Supabase com acesso total ao banco, bypassa RLS. NUNCA expor no frontend. |
| **Edge Function** | Função serverless executada no ambiente Supabase (Deno), usada para operações que requerem a service_role key. |
| **Snapshot de preço** | Valor do preço no momento em que o pedido é criado, armazenado em `order_items.unit_price`. Garante que alterações futuras de preço não afetam pedidos já realizados. |
| **Soft delete** | Desativação lógica de registro via campo `active = false`, sem remoção física do banco. Preserva histórico. |
| **DoD** | Definition of Done — critério mensurável que define quando uma task está completa. |
| **MAU** | Monthly Active Users — usuários únicos que fizeram login no mês. Limite do plano gratuito Supabase: 50.000. |
| **PWA** | Progressive Web App — o site existente do Rei da Água já tem suporte a instalação em dispositivos móveis. |

---

*PRD versão 1.0.0 — Rei da Água — 2026-05-14*  
*Próxima revisão programada: após conclusão do Sprint 3*