import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const inicio = '2026-04-01'
const fim = '2026-05-01'

// Total bruto (tudo do mês)
const bruto = await c.query(`
  SELECT COUNT(*), SUM(valor)::numeric(10,2) as total
  FROM financeiro_receber
  WHERE data_vencimento >= $1 AND data_vencimento < $2
`, [inicio, fim])
console.log('TOTAL BRUTO abril:', bruto.rows[0])

// Por origem (Asaas vs outros)
const origem = await c.query(`
  SELECT
    CASE WHEN asaas_payment_id IS NOT NULL THEN 'asaas' ELSE 'manual' END as origem,
    COUNT(*), SUM(valor)::numeric(10,2) as total
  FROM financeiro_receber
  WHERE data_vencimento >= $1 AND data_vencimento < $2
  GROUP BY origem
`, [inicio, fim])
console.log('POR ORIGEM:', origem.rows)

// Por clinica_id (null = não vinculado)
const clinica = await c.query(`
  SELECT
    CASE WHEN clinica_id IS NOT NULL THEN 'vinculada' ELSE 'sem_clinica' END as tipo,
    COUNT(*), SUM(valor)::numeric(10,2) as total
  FROM financeiro_receber
  WHERE data_vencimento >= $1 AND data_vencimento < $2
  GROUP BY tipo
`, [inicio, fim])
console.log('POR CLINICA:', clinica.rows)

// Duplicatas potenciais (mesmo cliente + mesmo valor no mês)
const dup = await c.query(`
  SELECT cliente_nome, valor, COUNT(*)
  FROM financeiro_receber
  WHERE data_vencimento >= $1 AND data_vencimento < $2
  GROUP BY cliente_nome, valor
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
  LIMIT 10
`, [inicio, fim])
console.log('DUPLICATAS:', dup.rows)

// Top 10 valores
const top = await c.query(`
  SELECT cliente_nome, valor, status, asaas_payment_id IS NOT NULL as tem_asaas
  FROM financeiro_receber
  WHERE data_vencimento >= $1 AND data_vencimento < $2
  ORDER BY valor::numeric DESC
  LIMIT 10
`, [inicio, fim])
console.log('TOP 10:', top.rows)

// MRR real = soma apenas das clinicas ativas (sem repetição)
const mrrReal = await c.query(`
  SELECT COUNT(DISTINCT c.id) as clinicas, SUM(c.mrr)::numeric(10,2) as total_mrr
  FROM clinicas c
  WHERE c.ativo = true
`)
console.log('MRR REAL (clinicas.mrr):', mrrReal.rows[0])

await c.end()
