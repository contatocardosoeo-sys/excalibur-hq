import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// 1. Etapas da jornada_clinica
const r1 = await c.query(`SELECT etapa, COUNT(*) FROM jornada_clinica GROUP BY etapa ORDER BY COUNT(*) DESC`)
console.log('jornada_clinica.etapa:', r1.rows)

// 2. Fases das clinicas
const r2 = await c.query(`SELECT fase, COUNT(*) FROM clinicas WHERE ativo=true GROUP BY fase`)
console.log('clinicas.fase:', r2.rows)

// 3. Constraint da etapa
const r3 = await c.query(`
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conrelid = 'jornada_clinica'::regclass AND contype='c'
`)
console.log('jornada_clinica constraints:', r3.rows)

// 4. Aviso prévio em uso
const r4 = await c.query(`SELECT COUNT(*) FROM clinicas WHERE aviso_previo_inicio IS NOT NULL`)
console.log('clinicas em aviso_previo:', r4.rows[0])

// 5. Cliente embarcado: existe alguma noção de "cliente final"?
const r5 = await c.query(`SELECT fase, status_cliente, status_execucao, COUNT(*) FROM clinicas WHERE ativo=true GROUP BY fase, status_cliente, status_execucao ORDER BY COUNT(*) DESC LIMIT 10`)
console.log('combos fase x status:', r5.rows)

await c.end()
