import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tarefas_jornada' ORDER BY ordinal_position`)
console.log('cols:', r.rows.map(x => x.column_name).join(', '))

const r2 = await c.query(`SELECT * FROM tarefas_jornada LIMIT 1`)
console.log('sample:', r2.rows[0])

await c.end()
