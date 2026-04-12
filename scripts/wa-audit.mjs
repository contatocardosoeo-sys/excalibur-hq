import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// Tabelas relacionadas
const t = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%wa%' OR table_name LIKE '%prospecta%' OR table_name LIKE '%whatsapp%' OR table_name LIKE '%waseller%')`)
console.log('Tabelas WA:', t.rows.map(r => r.table_name))

// Colunas de prospecta_webhooks_log
const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='prospecta_webhooks_log' ORDER BY ordinal_position`)
console.log('\nprospecta_webhooks_log cols:', cols.rows)

// Sample recentes
const sample = await c.query(`SELECT * FROM prospecta_webhooks_log ORDER BY created_at DESC LIMIT 3`)
console.log('\n3 últimos webhooks:', JSON.stringify(sample.rows, null, 2).slice(0, 1500))

// Quantos eventos tipos existem
const tipos = await c.query(`SELECT evento, COUNT(*) FROM prospecta_webhooks_log GROUP BY evento ORDER BY COUNT(*) DESC`)
console.log('\nEventos distintos:', tipos.rows)

// Etiquetas em leads_sdr
const etiq = await c.query(`SELECT etiqueta_wa, COUNT(*) FROM leads_sdr WHERE etiqueta_wa IS NOT NULL GROUP BY etiqueta_wa ORDER BY COUNT(*) DESC LIMIT 20`)
console.log('\nEtiquetas WA:', etiq.rows)

await c.end()
