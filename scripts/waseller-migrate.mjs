import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// ══════════════════════════════════════════════════════════════════
// waseller_webhooks_log — log cru de tudo que chega
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS waseller_webhooks_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento text NOT NULL,
    payload jsonb NOT NULL,
    lead_id text,
    lead_nome text,
    etapa_nova text,
    processado boolean DEFAULT false,
    erro text,
    recebido_em timestamptz DEFAULT now()
  )
`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_waseller_log_recebido ON waseller_webhooks_log(recebido_em DESC)`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_waseller_log_lead_id ON waseller_webhooks_log(lead_id)`)
console.log('✅ waseller_webhooks_log criada')

// ══════════════════════════════════════════════════════════════════
// sdr_leads_crm — snapshot de leads vindos do Waseller/Prospecta
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS sdr_leads_crm (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    waseller_id text UNIQUE,
    nome text,
    telefone text,
    clinica text,
    cidade text,
    etapa_atual text,
    etapa_hq text,
    ts_lead_criado timestamptz,
    ts_qualificado timestamptz,
    ts_agendado timestamptz,
    ts_compareceu timestamptz,
    ts_fechado timestamptz,
    ts_perdido timestamptz,
    motivo_perda text,
    valor_contrato numeric,
    fonte text DEFAULT 'waseller',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )
`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_sdr_leads_crm_updated ON sdr_leads_crm(updated_at DESC)`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_sdr_leads_crm_etapa ON sdr_leads_crm(etapa_hq)`)
console.log('✅ sdr_leads_crm criada')

// ══════════════════════════════════════════════════════════════════
// sdr_metricas_diarias — adicionar fonte + waseller_sync
// ══════════════════════════════════════════════════════════════════
await c.query(`
  ALTER TABLE sdr_metricas_diarias
    ADD COLUMN IF NOT EXISTS fonte text DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS waseller_sync boolean DEFAULT false
`)
console.log('✅ sdr_metricas_diarias: colunas fonte + waseller_sync adicionadas')

// Verificação
const ck = await c.query(`
  SELECT
    (SELECT count(*) FROM waseller_webhooks_log) as logs,
    (SELECT count(*) FROM sdr_leads_crm) as leads
`)
console.log('\n📋', ck.rows[0])

await c.end()
console.log('\n✅ Migration Waseller concluída')
