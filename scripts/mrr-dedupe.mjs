import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Antes
const antes = await c.query(`
  SELECT SUM(valor)::numeric(10,2) FROM financeiro_receber
  WHERE data_vencimento >= '2026-04-01' AND data_vencimento < '2026-05-01'
`)
console.log('Antes:', antes.rows[0])

// DELETE linhas Asaas sem vinculo de clinica (27 duplicatas identificadas)
// Critério: asaas_payment_id NOT NULL + clinica_id NULL + cliente_nome='Cliente Asaas'
// Essas foram criadas pelo sync porque não encontrou o pagamento pelo ID no banco
// e não soube vincular à clínica por nome
const del = await c.query(`
  DELETE FROM financeiro_receber
  WHERE asaas_payment_id IS NOT NULL
    AND (clinica_id IS NULL OR cliente_nome = 'Cliente Asaas')
    AND data_vencimento >= '2026-04-01' AND data_vencimento < '2026-05-01'
`)
console.log(`Deletados: ${del.rowCount}`)

// Depois
const depois = await c.query(`
  SELECT SUM(valor)::numeric(10,2) as total, COUNT(*) FROM financeiro_receber
  WHERE data_vencimento >= '2026-04-01' AND data_vencimento < '2026-05-01'
`)
console.log('Depois:', depois.rows[0])

// Validar que ainda temos os 49 manuais
const verify = await c.query(`
  SELECT COUNT(*), SUM(valor)::numeric(10,2) as total FROM financeiro_receber
  WHERE data_vencimento >= '2026-04-01' AND data_vencimento < '2026-05-01'
`)
console.log('Verificado (deve ser 49 / R$81.800):', verify.rows[0])

await c.end()
