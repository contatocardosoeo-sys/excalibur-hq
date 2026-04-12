import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Kanban state
const pipe = await c.query(`SELECT status, COUNT(*) FROM pipeline_closer GROUP BY status`)
console.log('pipeline_closer:', pipe.rows)

// CS score state
const ag = await c.query(`SELECT MIN(score), MAX(score), AVG(score)::int FROM adocao_clinica WHERE semana='2026-W15'`)
console.log('adocao_clinica score:', ag.rows[0])

// Alertas — qual tabela existe
const t = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name='alertas_hq' OR table_name='alertas_clinica')`)
console.log('alertas tables:', t.rows)

// Endpoint hq/alertas live
const r = await fetch('https://excalibur-hq.vercel.app/api/hq/alertas').catch(() => null)
if (r) {
  const d = await r.json()
  console.log('alertas live:', d.alertas?.length || 0)
}

await c.end()
