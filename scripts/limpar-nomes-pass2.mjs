import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Pass 2 — patterns mais agressivos

// 1. Valores monetários sem separador de milhar (1250,00)
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*\\d+,\\d{2}.*$', '', 'g'))
  WHERE nome ~ '\\d+,\\d{2}'
`)

// 2. "X mensalidade(s)" / "X mes" / "X mêses"
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*\\d+\\s*(mensalidade|mes|mês|mês)s?.*$', '', 'gi'))
  WHERE nome ~* '\\d+\\s+(mensalidade|mes|mês)'
`)

// 3. Datas DD/MM ou DD/MM/YYYY
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*\\d{1,2}/\\d{1,2}(/\\d{2,4})?.*$', '', 'g'))
  WHERE nome ~ '\\d{1,2}/\\d{1,2}'
`)

// 4. "tem que fazer nota", "vai pra X", "pra sempre"
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*(tem que fazer|vai pra|pra sempre).*$', '', 'gi'))
  WHERE nome ~* '(tem que fazer|vai pra|pra sempre)'
`)

// 5. "2x", "3x" (parcelas)
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s*\\d+x\\b.*$', '', 'gi'))
  WHERE nome ~ '\\d+x\\b'
`)

// 6. Espaços múltiplos novamente
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '\\s+', ' ', 'g'))
  WHERE nome ~ '\\s{2,}'
`)

// 7. Remover "_" e "/" no final
await c.query(`
  UPDATE clinicas
  SET nome = TRIM(REGEXP_REPLACE(nome, '[/_\\s]+$', '', 'g'))
`)

// Verificar
const r = await c.query(`SELECT id, nome FROM clinicas ORDER BY nome`)
console.log(`📋 ${r.rowCount} clínicas no banco:`)
r.rows.forEach(x => console.log('  -', x.nome))

// Verificar quantas ainda têm dados sujos
const sujas = await c.query(`
  SELECT COUNT(*) FROM clinicas
  WHERE nome ~ '\\d+,\\d{2}' OR nome ~* 'paga em' OR nome ~ '\\s{2,}' OR nome ~* '(mensalidade|tem que fazer|vai pra)'
`)
console.log(`\n🔎 Restantes com lixo: ${sujas.rows[0].count}`)

await c.end()
