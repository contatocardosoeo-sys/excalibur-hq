import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()
const r = await c.query(`
  SELECT pg_get_constraintdef(oid) as def FROM pg_constraint
  WHERE conname = 'usuarios_internos_role_check'
`)
console.log(r.rows)
await c.end()
