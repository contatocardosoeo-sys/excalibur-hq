import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`SELECT etapa, COUNT(*) FROM jornada_clinica GROUP BY etapa ORDER BY etapa`)
console.log('etapas:', r.rows)

const r2 = await c.query(`SELECT fase, COUNT(*) FROM clinicas WHERE ativo = true GROUP BY fase ORDER BY fase`)
console.log('clinicas.fase:', r2.rows)
await c.end()
