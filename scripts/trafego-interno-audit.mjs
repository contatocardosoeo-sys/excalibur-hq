import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Tabelas relacionadas a tráfego interno
const t = await c.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND (
    table_name LIKE '%trafego%' OR table_name LIKE '%campanha%' OR table_name LIKE 'funil_%' OR table_name LIKE 'leads_sdr%'
  )
  ORDER BY table_name
`)
console.log('Tabelas:', t.rows.map(r => r.table_name))

// Esquema das 3 principais
for (const tbl of ['funil_trafego', 'campanhas_trafego', 'leads_sdr']) {
  const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [tbl])
  console.log(`\n${tbl}:`)
  cols.rows.forEach(x => console.log(`  ${x.column_name} :: ${x.data_type}`))
}

// Dados atuais de abril
const f = await c.query(`SELECT * FROM funil_trafego WHERE mes=4 AND ano=2026`)
console.log('\nfunil_trafego abril 2026:', f.rows)

const camp = await c.query(`SELECT id, nome, canal, status, investimento, leads FROM campanhas_trafego ORDER BY created_at DESC LIMIT 10`)
console.log('\ncampanhas_trafego:', camp.rows)

await c.end()
