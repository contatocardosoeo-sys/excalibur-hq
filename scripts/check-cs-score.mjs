import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const colsQ = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='adocao_clinica' ORDER BY ordinal_position`
const cols = await c.query(colsQ)
console.log('adocao_clinica columns:', cols.rows.map(r => r.column_name))

const ag = await c.query(`SELECT COUNT(*) as total, COALESCE(AVG(score)::int, 0) as avg_score, MIN(score) as min, MAX(score) as max FROM adocao_clinica`)
console.log('aggregate:', ag.rows[0])

const dist = await c.query(`SELECT score, COUNT(*) FROM adocao_clinica GROUP BY score ORDER BY score`)
console.log('distribuicao score:', dist.rows)

const sem = await c.query(`SELECT semana, COUNT(*) FROM adocao_clinica GROUP BY semana ORDER BY semana DESC LIMIT 5`)
console.log('semanas:', sem.rows)

await c.end()
