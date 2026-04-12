import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// Snapshots das etiquetas do WhatsApp do Trindade (via Wascript API)
// Cada linha = um snapshot de um momento no tempo
await c.query(`
  CREATE TABLE IF NOT EXISTS wascript_etiquetas_snapshot (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sdr_email text NOT NULL,
    capturado_em timestamptz DEFAULT now(),
    etiquetas jsonb NOT NULL,      -- array cru vindo da API
    funil jsonb NOT NULL,          -- agregado por etapa HQ
    total_contatos int              -- soma dos counts
  )
`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_wascript_snap_capturado ON wascript_etiquetas_snapshot(capturado_em DESC)`)
console.log('✅ wascript_etiquetas_snapshot criada')

// Log de chamadas à API Wascript (pra debug + rate limit)
await c.query(`
  CREATE TABLE IF NOT EXISTS wascript_api_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint text NOT NULL,
    metodo text NOT NULL,
    status_code int,
    duracao_ms int,
    request_payload jsonb,
    response jsonb,
    sucesso boolean,
    erro text,
    chamado_em timestamptz DEFAULT now()
  )
`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_wascript_log_chamado ON wascript_api_log(chamado_em DESC)`)
console.log('✅ wascript_api_log criada')

await c.end()
console.log('\n✅ Migration Wascript concluída')
