# PostgreSQL — Excalibur HQ

Supabase usa Postgres 15+. Acesso via `pg` package + Supabase client.

## Conexão direta (Node)
```js
const { Client } = require('pg')
const c = new Client({ connectionString: process.env.DB_URL })
await c.connect()
const r = await c.query('SELECT * FROM clinicas WHERE ativo = true')
await c.end()
```

## Queries do projeto

### Filtros por data
```sql
SELECT * FROM financeiro_receber
WHERE data_vencimento >= '2026-04-01'
  AND data_vencimento < '2026-05-01'
ORDER BY data_vencimento;
```

### Agregações
```sql
SELECT
  date_trunc('month', data_vencimento) as mes,
  COUNT(*) as qtd,
  SUM(valor) as total,
  SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as recebido
FROM financeiro_receber
GROUP BY 1
ORDER BY 1;
```

### Upsert (insert or update)
```sql
INSERT INTO sdr_metricas_diarias (data, sdr_email, leads_recebidos)
VALUES ('2026-04-10', 'trindade@x.com', 50)
ON CONFLICT (data, sdr_email)
DO UPDATE SET leads_recebidos = EXCLUDED.leads_recebidos;
```

### Window functions
```sql
SELECT
  data, recebido,
  SUM(recebido) OVER (ORDER BY data) as acumulado
FROM financeiro_receber;
```

## Índices
- Sempre criar índice em colunas usadas em WHERE/ORDER BY
- `CREATE INDEX IF NOT EXISTS idx_X ON tabela(col)`
- Evitar índices em colunas de baixa cardinalidade

## RLS (Row Level Security)
- HQ usa service-role nas APIs (bypass RLS)
- Frontend usa anon key (RLS aplicado)
- Para listar tudo no client, criar API server-side

## Tabelas críticas (NÃO dropar)
- clinicas, jornada_clinica, tarefas_jornada
- financeiro_receber, financeiro_pagar
- leads_sdr, pipeline_closer
- sdr_metricas_diarias, sdr_feedbacks
