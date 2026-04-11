import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`
  SELECT column_name, is_generated, generation_expression FROM information_schema.columns
  WHERE table_name='adocao_clinica' AND column_name = 'score'
`)
console.log('score gen:', r.rows)

// Check clinicas.score_total
const r2 = await c.query(`
  SELECT column_name, is_generated, generation_expression FROM information_schema.columns
  WHERE table_name='clinicas' AND column_name = 'score_total'
`)
console.log('clinicas.score_total:', r2.rows)

await c.end()
