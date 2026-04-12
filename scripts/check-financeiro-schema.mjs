import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Tabelas financeiras
const t = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE 'financeiro%' OR table_name LIKE '%asaas%' OR table_name='configuracoes_financeiro') ORDER BY table_name`)
console.log('Tabelas:', t.rows)

// Colunas de financeiro_receber
const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='financeiro_receber' ORDER BY ordinal_position`)
console.log('financeiro_receber cols:', cols.rows.map(r => r.column_name))

// Sample
const sample = await c.query(`SELECT * FROM financeiro_receber LIMIT 1`)
console.log('Sample:', sample.rows[0])

// Total
const count = await c.query(`SELECT status, COUNT(*) FROM financeiro_receber GROUP BY status`)
console.log('Status distribution:', count.rows)

await c.end()
