import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

await c.query(`ALTER TABLE usuarios_internos DROP CONSTRAINT IF EXISTS usuarios_internos_role_check`)
await c.query(`
  ALTER TABLE usuarios_internos ADD CONSTRAINT usuarios_internos_role_check
  CHECK (role = ANY (ARRAY['admin','coo','cs','sdr','closer','cmo','trafego','financeiro','head_traffic']))
`)
console.log('✅ Constraint atualizada com head_traffic')

await c.end()
