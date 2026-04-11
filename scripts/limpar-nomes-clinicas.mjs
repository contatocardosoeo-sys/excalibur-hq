import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Antes
const antes = await c.query(`
  SELECT id, nome FROM clinicas
  WHERE nome ~ '\\d{1,3}(\\.\\d{3})*,\\d{2}' OR nome ~* 'paga em' OR nome ~ '\\s{2,}'
  ORDER BY nome
`)
console.log(`📋 ${antes.rowCount} nomes sujos identificados`)
antes.rows.forEach(r => console.log('  -', r.nome))

// 1. Remover valores monetários (ex: "2.300,00")
const r1 = await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*\\d{1,3}(\\.\\d{3})*,\\d{2}.*$', '', 'g'))
  WHERE nome ~ '\\d{1,3}(\\.\\d{3})*,\\d{2}'
`)
console.log(`✅ Valores monetários removidos: ${r1.rowCount}`)

// 2. Remover "paga em X vezes..."
const r2 = await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*paga em.*$', '', 'gi'))
  WHERE nome ~* 'paga em'
`)
console.log(`✅ "paga em..." removido: ${r2.rowCount}`)

// 3. Remover "dia X do mes" residual
const r3 = await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*dia\\s+\\d+.*$', '', 'gi'))
  WHERE nome ~* '\\sdia\\s+\\d+'
`)
console.log(`✅ "dia X do mes" removido: ${r3.rowCount}`)

// 4. Normalizar espaços múltiplos
const r4 = await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s+', ' ', 'g'))
  WHERE nome ~ '\\s{2,}'
`)
console.log(`✅ Espaços normalizados: ${r4.rowCount}`)

// Resultado
const depois = await c.query(`SELECT nome FROM clinicas ORDER BY nome LIMIT 20`)
console.log('\n📋 Top 20 nomes após limpeza:')
depois.rows.forEach(r => console.log('  -', r.nome))

await c.end()
