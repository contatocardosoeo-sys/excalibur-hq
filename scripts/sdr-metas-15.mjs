import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// Colunas novas (idempotente)
await c.query(`
  ALTER TABLE metas_sdr
    ADD COLUMN IF NOT EXISTS agendamentos_semana int DEFAULT 75,
    ADD COLUMN IF NOT EXISTS qualificados_dia int DEFAULT 43,
    ADD COLUMN IF NOT EXISTS noshow_esperado_dia int DEFAULT 5,
    ADD COLUMN IF NOT EXISTS taxa_comparecimento numeric DEFAULT 0.696,
    ADD COLUMN IF NOT EXISTS taxa_agendamento numeric DEFAULT 0.35,
    ADD COLUMN IF NOT EXISTS taxa_fechamento numeric DEFAULT 0.30,
    ADD COLUMN IF NOT EXISTS dias_uteis_mes int DEFAULT 21
`)

// Atualizar Trindade — meta nova: 15 agend/dia, funil completo calculado
const upd = await c.query(`
  UPDATE metas_sdr SET
    meta_leads = 1302,
    meta_leads_dia = 62,
    meta_contatos = 1302,
    meta_contatos_dia = 62,
    qualificados_mes = 903,
    qualificados_dia = 43,
    meta_agendamentos = 315,
    meta_agendamentos_dia = 15,
    meta_agendamentos_dia_min = 8,
    meta_agendamentos_dia_max = 20,
    agendamentos_semana = 75,
    meta_comparecimentos = 210,
    meta_vendas = 63,
    noshow_esperado_dia = 5,
    taxa_comparecimento = 0.696,
    taxa_agendamento = 0.35,
    taxa_fechamento = 0.30,
    dias_uteis_mes = 21,
    receita_meta = 126000,
    ticket_medio = 2000,
    cpl_meta = 10.70,
    investimento_mensal = 13931,
    nivel_meta = 'super'
  WHERE sdr_email = 'trindade.excalibur@gmail.com' AND mes = 4 AND ano = 2026
  RETURNING meta_leads, meta_agendamentos, meta_comparecimentos, meta_vendas, receita_meta
`)

console.log('✅ metas_sdr Trindade atualizado:', upd.rows[0])

// Atualizar Guilherme (closer)
await c.query(`
  UPDATE metas_closer SET
    meta_reunioes = 210,
    meta_fechamentos = 63,
    meta_mrr = 126000
  WHERE closer_email = 'guilherme.excalibur@gmail.com' AND mes = 4 AND ano = 2026
`)
console.log('✅ metas_closer Guilherme: 210 reuniões, 63 fech, R$126k MRR')

await c.end()
