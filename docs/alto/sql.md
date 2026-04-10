# SQL Avançado — Excalibur HQ

## JOINs

### INNER (só matches)
```sql
SELECT c.nome, j.etapa
FROM clinicas c
INNER JOIN jornada_clinica j ON j.clinica_id = c.id
WHERE c.ativo = true;
```

### LEFT (mantém esquerda)
```sql
SELECT c.nome, COALESCE(a.score, 0) as score
FROM clinicas c
LEFT JOIN adocao_clinica a ON a.clinica_id = c.id;
```

## Agregações

### GROUP BY com CASE
```sql
SELECT
  date_trunc('month', data) as mes,
  COUNT(*) as total,
  SUM(CASE WHEN status='pago' THEN valor ELSE 0 END) as recebido,
  SUM(CASE WHEN status='atrasado' THEN valor ELSE 0 END) as atrasado
FROM financeiro_receber
GROUP BY 1
ORDER BY 1;
```

## CTE (Common Table Expression)
```sql
WITH metricas_mes AS (
  SELECT
    date_trunc('month', data_vencimento) as mes,
    SUM(valor) as total
  FROM financeiro_receber
  GROUP BY 1
)
SELECT mes, total,
  LAG(total) OVER (ORDER BY mes) as mes_anterior,
  total - LAG(total) OVER (ORDER BY mes) as variacao
FROM metricas_mes;
```

## Window functions

### Running total
```sql
SELECT
  data,
  valor,
  SUM(valor) OVER (ORDER BY data) as acumulado
FROM financeiro_receber;
```

### Ranking
```sql
SELECT
  cliente_nome,
  SUM(valor) as total,
  RANK() OVER (ORDER BY SUM(valor) DESC) as posicao
FROM financeiro_receber
WHERE status='pago'
GROUP BY cliente_nome;
```

## Upsert
```sql
INSERT INTO sdr_metricas_diarias (data, sdr_email, leads_recebidos)
VALUES ('2026-04-10', 'trindade@x.com', 50)
ON CONFLICT (data, sdr_email)
DO UPDATE SET
  leads_recebidos = EXCLUDED.leads_recebidos,
  updated_at = NOW();
```

## Performance
- EXPLAIN ANALYZE para queries lentas
- Índice em colunas de WHERE/JOIN/ORDER
- Limit em listagens
- Não usar SELECT * em produção
