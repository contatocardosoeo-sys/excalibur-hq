import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const SQL = `
-- financeiro_receber: colunas Asaas
ALTER TABLE financeiro_receber
  ADD COLUMN IF NOT EXISTS asaas_payment_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_pago numeric,
  ADD COLUMN IF NOT EXISTS link_boleto text,
  ADD COLUMN IF NOT EXISTS link_pix text;

CREATE INDEX IF NOT EXISTS idx_financeiro_asaas_id ON financeiro_receber(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_asaas_customer ON financeiro_receber(asaas_customer_id);

-- Tabela de configurações financeiras (cache de saldo, etc)
CREATE TABLE IF NOT EXISTS configuracoes_financeiro (
  chave text PRIMARY KEY,
  valor text,
  updated_at timestamptz DEFAULT now()
);

-- Log de webhooks (auditoria)
CREATE TABLE IF NOT EXISTS asaas_webhooks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text,
  payment_id text,
  payload jsonb,
  processed boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asaas_webhooks_event ON asaas_webhooks_log(event, created_at DESC);

-- Clinicas: coluna de link com customer do Asaas
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

CREATE INDEX IF NOT EXISTS idx_clinicas_asaas_customer ON clinicas(asaas_customer_id);
`

try {
  await c.connect()
  await c.query(SQL)
  console.log('✅ Migração Asaas concluída')

  const cols = await c.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='financeiro_receber' AND column_name LIKE 'asaas%' OR column_name IN ('forma_pagamento','valor_pago','link_boleto','link_pix')
    ORDER BY column_name
  `)
  console.log('financeiro_receber novas cols:', cols.rows.map(r => r.column_name))

  const t = await c.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('configuracoes_financeiro','asaas_webhooks_log')
    ORDER BY table_name
  `)
  console.log('Tabelas novas:', t.rows.map(r => r.table_name))
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
} finally {
  await c.end()
}
