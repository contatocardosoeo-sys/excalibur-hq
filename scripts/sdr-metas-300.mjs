import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// Garantir que existe meta_contatos + meta_contatos_dia
await c.query(`
  ALTER TABLE metas_sdr
    ADD COLUMN IF NOT EXISTS meta_contatos int DEFAULT 90,
    ADD COLUMN IF NOT EXISTS meta_contatos_dia int DEFAULT 5
`)
console.log('✅ Colunas meta_contatos adicionadas')

// Metas reais do Trindade (definidas pelo Cardoso — abril 2026)
// Funciona em dias úteis: 300/22 ≈ 14, 300/4.33 ≈ 70
const upd = await c.query(`
  UPDATE metas_sdr SET
    meta_leads = 300,
    meta_leads_dia = 14,
    meta_contatos = 90,
    meta_contatos_dia = 5,
    meta_agendamentos = 30,
    meta_agendamentos_min = 20,
    meta_agendamentos_max = 40,
    meta_agendamentos_dia = 2,
    meta_agendamentos_dia_min = 1,
    meta_agendamentos_dia_max = 3,
    meta_comparecimentos = 20,
    meta_vendas = 3
  WHERE sdr_email = 'trindade.excalibur@gmail.com' AND mes = 4 AND ano = 2026
  RETURNING *
`)

console.log('✅ metas_sdr atualizada:', upd.rows[0])

// Verificar
const v = await c.query(`SELECT meta_leads, meta_contatos, meta_agendamentos, meta_comparecimentos, meta_vendas FROM metas_sdr WHERE sdr_email='trindade.excalibur@gmail.com' AND mes=4 AND ano=2026`)
console.log('\n📊 Metas mensais do Trindade:', v.rows[0])

await c.end()
