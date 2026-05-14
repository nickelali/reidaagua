# Auditoria de Segurança — Rei da Água

| Campo    | Valor                     |
|----------|---------------------------|
| Data     | A preencher               |
| Auditor  | A preencher               |
| Ambiente | Produção (Supabase)       |

## Testes sem autenticação (anon key)

| # | Endpoint                                | Esperado                  | Resultado | OK? |
|---|----------------------------------------|---------------------------|-----------|-----|
| 1 | GET /rest/v1/orders                    | Array vazio `[]`          |           |     |
| 2 | GET /rest/v1/customers                 | Array vazio `[]`          |           |     |
| 3 | POST /rest/v1/orders                   | 201 Created               |           |     |
| 4 | DELETE /rest/v1/products?id=eq.{id}    | 0 rows affected           |           |     |
| 5 | GET /rest/v1/products                  | Lista de produtos (OK)    |           |     |
| 6 | GET /rest/v1/settings                  | Lista de settings (OK)    |           |     |

## Testes com token de driver

| # | Endpoint                                         | Esperado                          | Resultado | OK? |
|---|--------------------------------------------------|-----------------------------------|-----------|-----|
| 7 | GET /rest/v1/orders                              | Apenas pedidos do próprio driver  |           |     |
| 8 | GET /rest/v1/customers                           | Array vazio `[]`                  |           |     |
| 9 | DELETE /rest/v1/orders?id=eq.{outro-driver-id}   | 0 rows affected                   |           |     |
|10 | GET /rest/v1/profiles                            | Apenas o próprio perfil           |           |     |
|11 | POST /rest/v1/delivery_notes (pedido do próprio) | 201 Created                       |           |     |
|12 | POST /rest/v1/delivery_notes (pedido de outro)   | 0 rows / erro RLS                 |           |     |

## Resultado Final

- [ ] Todos os 12 testes passaram conforme esperado
- [ ] Nenhuma política ausente identificada
- [ ] Sistema aprovado para produção

## Observações

> Registre aqui qualquer desvio encontrado e a correção aplicada.
