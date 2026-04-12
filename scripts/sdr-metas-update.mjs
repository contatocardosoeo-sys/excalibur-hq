import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

// Valores definidos pelo Cardoso:
// - Leads a cobrar do marketing: 50/dia → 20 dias úteis = 1000/mês
// - Agendamento mínimo: 10/dia → 200/mês
// - Agendamento meta normal: 15/dia → 300/mês
// - Agendamento máximo: 20/dia → 400/mês

await c.connect()

// 1. Adicionar colunas novas (idempotente)
await c.query(`
  ALTER TABLE metas_sdr
    ADD COLUMN IF NOT EXISTS meta_leads_dia int DEFAULT 50,
    ADD COLUMN IF NOT EXISTS meta_agendamentos_dia_min int DEFAULT 10,
    ADD COLUMN IF NOT EXISTS meta_agendamentos_dia int DEFAULT 15,
    ADD COLUMN IF NOT EXISTS meta_agendamentos_dia_max int DEFAULT 20,
    ADD COLUMN IF NOT EXISTS meta_agendamentos_min int DEFAULT 200,
    ADD COLUMN IF NOT EXISTS meta_agendamentos_max int DEFAULT 400
`)
console.log('✅ Colunas adicionadas')

// 2. Atualizar meta do Trindade abril/2026
const upd = await c.query(`
  UPDATE metas_sdr SET
    meta_leads = 1000,
    meta_leads_dia = 50,
    meta_agendamentos = 300,
    meta_agendamentos_min = 200,
    meta_agendamentos_max = 400,
    meta_agendamentos_dia_min = 10,
    meta_agendamentos_dia = 15,
    meta_agendamentos_dia_max = 20,
    meta_comparecimentos = 180,
    meta_vendas = 20
  WHERE sdr_email = 'trindade.excalibur@gmail.com' AND mes = 4 AND ano = 2026
  RETURNING *
`)
console.log('✅ Metas atualizadas:', upd.rows[0])

// 3. Verificar
const v = await c.query(`SELECT sdr_email, meta_leads_dia, meta_leads, meta_agendamentos_dia, meta_agendamentos, meta_agendamentos_dia_min, meta_agendamentos_dia_max FROM metas_sdr WHERE sdr_email='trindade.excalibur@gmail.com' AND mes=4 AND ano=2026`)
console.log('\n📊 Metas finais Trindade abril 2026:')
console.log(v.rows[0])

await c.end()
