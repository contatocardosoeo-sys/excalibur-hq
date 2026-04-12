import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Diagnosticar
const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='alertas_clinica' ORDER BY ordinal_position`)
console.log('alertas_clinica cols:', cols.rows.map(r => r.column_name).join(', '))

const antes = await c.query(`SELECT COUNT(*), tipo FROM alertas_clinica GROUP BY tipo ORDER BY COUNT(*) DESC`)
console.log('Antes:', antes.rows)

// Limpar alertas antigos resolvidos ou orfaos
const del = await c.query(`
  DELETE FROM alertas_clinica
  WHERE resolvido = true
     OR created_at < now() - interval '7 days'
`)
console.log(`✅ Deletados (resolvidos/antigos): ${del.rowCount}`)

const depois = await c.query(`SELECT COUNT(*), tipo FROM alertas_clinica GROUP BY tipo`)
console.log('Depois:', depois.rows)

const total = await c.query(`SELECT COUNT(*) FROM alertas_clinica`)
console.log('Total final:', total.rows[0].count)

await c.end()
