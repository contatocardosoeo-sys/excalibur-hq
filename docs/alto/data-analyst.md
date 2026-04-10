# Data Analyst — Excalibur HQ

## Métricas financeiras essenciais

### MRR (Monthly Recurring Revenue)
```sql
SELECT SUM(valor_contrato) as mrr
FROM clinicas
WHERE ativo = true;
```

### Receita realizada
```sql
SELECT SUM(valor) as receita_mes
FROM financeiro_receber
WHERE status = 'pago'
  AND data_pagamento >= '2026-04-01';
```

### Caixa
```sql
SELECT
  (SELECT SUM(valor) FROM financeiro_receber WHERE status='pago' AND data_pagamento >= '2026-04-01') -
  (SELECT SUM(valor) FROM financeiro_pagar WHERE status='pago' AND data_pagamento >= '2026-04-01')
  as caixa;
```

### Margem
```
margem % = (receita - custos) / receita * 100
```

### Inadimplência
```sql
SELECT
  COUNT(*) FILTER (WHERE status='atrasado') * 100.0 / COUNT(*) as taxa_inadimplencia
FROM financeiro_receber
WHERE data_vencimento >= '2026-04-01';
```

## Funis de conversão

### Tráfego → Cliente
```
Leads (campanhas)
  ↓ X% chegam ao SDR
SDR
  ↓ X% agendam
Agendamentos
  ↓ X% comparecem
Comparecimentos
  ↓ X% qualificam
Qualificados
  ↓ X% fecham
Clientes ativos
```

### Conversão entre etapas
```sql
SELECT
  COUNT(*) FILTER (WHERE status IN ('agendado','reuniao_feita')) * 100.0 /
  COUNT(*) as taxa_agendamento
FROM leads_sdr;
```

## Cohort analysis (futuro)
Agrupar clientes por mês de entrada e medir retenção:
```sql
SELECT
  date_trunc('month', data_inicio) as cohort,
  COUNT(*) as clientes,
  AVG(EXTRACT(EPOCH FROM (NOW() - data_inicio))/86400) as dias_medio
FROM clinicas
WHERE ativo = true
GROUP BY 1;
```

## Métricas SaaS importantes
- **MRR** — receita recorrente mensal
- **ARR** — anual (MRR * 12)
- **LTV** — lifetime value (ARR / churn rate)
- **CAC** — custo de aquisição (invest / clientes novos)
- **Payback** — meses para CAC retornar (CAC / MRR)
- **Churn** — % clientes que saem por mês
- **NRR** — net revenue retention (com upsell - downsell)

## Tomada de decisão
- Dado 1 ponto: olhar
- Dado 2 pontos: comparar
- Dado 3+ pontos: tendência
- Sempre normalizar (% > absolutos)
