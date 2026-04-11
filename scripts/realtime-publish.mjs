import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Verifica se a tabela está na publication supabase_realtime
const r = await c.query(`
  SELECT pubname, schemaname, tablename
  FROM pg_publication_tables
  WHERE tablename = 'escritorio_presenca'
`)
console.log('Já em publications:', r.rows)

if (r.rows.length === 0) {
  try {
    await c.query(`ALTER PUBLICATION supabase_realtime ADD TABLE escritorio_presenca`)
    console.log('✅ Adicionado à supabase_realtime')
  } catch (e) {
    console.log('Erro adicionar:', e.message)
  }
}

// Verifica/cria policy de SELECT pra authenticated
try {
  await c.query(`
    CREATE POLICY "auth_read_presenca" ON escritorio_presenca
    FOR SELECT TO authenticated USING (true)
  `)
  console.log('✅ Policy SELECT criada')
} catch (e) {
  console.log('Policy SELECT já existe ou erro:', e.message)
}

await c.end()
