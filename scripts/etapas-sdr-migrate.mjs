import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// ══════════════════════════════════════════════════════════════
// 1. Colunas ts_* pra cada uma das 10 etapas em sdr_leads_crm
// ══════════════════════════════════════════════════════════════
await c.query(`
  ALTER TABLE sdr_leads_crm
    ADD COLUMN IF NOT EXISTS ts_recepcao    timestamptz,
    ADD COLUMN IF NOT EXISTS ts_explicacao  timestamptz,
    ADD COLUMN IF NOT EXISTS ts_qualificacao timestamptz,
    ADD COLUMN IF NOT EXISTS ts_agendamento timestamptz,
    ADD COLUMN IF NOT EXISTS ts_confirmacao timestamptz,
    ADD COLUMN IF NOT EXISTS ts_reagendar   timestamptz,
    ADD COLUMN IF NOT EXISTS ts_sem_cnpj    timestamptz,
    ADD COLUMN IF NOT EXISTS ts_futuro      timestamptz,
    ADD COLUMN IF NOT EXISTS ts_lista_fria  timestamptz,
    ADD COLUMN IF NOT EXISTS ts_fora_do_icp timestamptz
`)
console.log('✅ sdr_leads_crm: colunas ts_* das 10 etapas')

// ══════════════════════════════════════════════════════════════
// 2. Migrar dados antigos (etapas genéricas → reais)
// ══════════════════════════════════════════════════════════════
await c.query(`UPDATE sdr_leads_crm SET etapa_hq='recepcao'    WHERE etapa_hq IN ('lead','novo','crm')`)
await c.query(`UPDATE sdr_leads_crm SET etapa_hq='qualificacao' WHERE etapa_hq = 'qualificado'`)
await c.query(`UPDATE sdr_leads_crm SET etapa_hq='confirmacao' WHERE etapa_hq = 'comparecimento'`)
await c.query(`UPDATE sdr_leads_crm SET etapa_hq='fora_do_icp' WHERE etapa_hq IN ('perdido','sem_interesse','venda')`)
await c.query(`UPDATE sdr_leads_crm SET etapa_hq='reagendar'   WHERE etapa_hq = 'no_show'`)
console.log('✅ sdr_leads_crm: dados antigos migrados')

// ══════════════════════════════════════════════════════════════
// 3. CHECK constraint das 10 etapas válidas
// ══════════════════════════════════════════════════════════════
await c.query(`ALTER TABLE sdr_leads_crm DROP CONSTRAINT IF EXISTS sdr_leads_crm_etapa_check`)
await c.query(`
  ALTER TABLE sdr_leads_crm
  ADD CONSTRAINT sdr_leads_crm_etapa_check
  CHECK (etapa_hq IN (
    'recepcao','explicacao','qualificacao','agendamento','confirmacao',
    'reagendar','sem_cnpj','futuro','lista_fria','fora_do_icp'
  ) OR etapa_hq IS NULL)
`)
console.log('✅ sdr_leads_crm: CHECK constraint das 10 etapas')

// ══════════════════════════════════════════════════════════════
// 4. Adicionar campo "perdidos" em sdr_metricas_diarias
// ══════════════════════════════════════════════════════════════
await c.query(`
  ALTER TABLE sdr_metricas_diarias
    ADD COLUMN IF NOT EXISTS perdidos int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_show int DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qualificados int DEFAULT 0
`)
console.log('✅ sdr_metricas_diarias: colunas perdidos, no_show, qualificados')

// ══════════════════════════════════════════════════════════════
// 5. Verificação
// ══════════════════════════════════════════════════════════════
const dist = await c.query(`
  SELECT etapa_hq, count(*) FROM sdr_leads_crm GROUP BY etapa_hq ORDER BY count(*) DESC
`)
console.log('\n📋 Distribuição atual por etapa:')
dist.rows.forEach(r => console.log(` ${r.etapa_hq || '(null)'}: ${r.count}`))

await c.end()
console.log('\n✅ Migration etapas SDR concluída')
