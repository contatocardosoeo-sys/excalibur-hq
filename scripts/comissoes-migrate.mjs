import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// ══════════════════════════════════════════════════════════════════
// 1. config_comissoes — regras globais (1 row)
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS config_comissoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    closer_pct_venda numeric DEFAULT 0.05,
    sdr_valor_agendamento numeric DEFAULT 8,
    sdr_bonus_comparecimento numeric DEFAULT 12,
    sdr_bonus_venda numeric DEFAULT 40,
    bonus_equipe_patamar1_fech int DEFAULT 45,
    bonus_equipe_patamar1_closer numeric DEFAULT 500,
    bonus_equipe_patamar1_sdr numeric DEFAULT 300,
    bonus_equipe_patamar2_fech int DEFAULT 63,
    bonus_equipe_patamar2_closer numeric DEFAULT 1000,
    bonus_equipe_patamar2_sdr numeric DEFAULT 600,
    atualizado_em timestamptz DEFAULT now(),
    atualizado_por text
  )
`)
console.log('✅ config_comissoes tabela criada')

const existe = await c.query('SELECT count(*) FROM config_comissoes')
if (Number(existe.rows[0].count) === 0) {
  await c.query('INSERT INTO config_comissoes DEFAULT VALUES')
  console.log('✅ config_comissoes row default inserida')
}

// ══════════════════════════════════════════════════════════════════
// 2. comissoes — cada evento
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS comissoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_email text NOT NULL,
    colaborador_nome text,
    role text NOT NULL,
    tipo text NOT NULL,
    valor numeric NOT NULL,
    mes int NOT NULL,
    ano int NOT NULL,
    data_evento date NOT NULL,
    pipeline_card_id uuid,
    lead_nome text,
    ticket_venda numeric,
    status text DEFAULT 'pendente'
      CHECK (status IN ('pendente','aprovado','pago','cancelado')),
    aprovado_por text,
    aprovado_em timestamptz,
    pago_em timestamptz,
    observacao text,
    created_at timestamptz DEFAULT now()
  )
`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_comissoes_mes_ano ON comissoes(mes, ano)`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_comissoes_email ON comissoes(colaborador_email)`)
await c.query(`CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(status)`)
console.log('✅ comissoes tabela + índices criados')

// ══════════════════════════════════════════════════════════════════
// 3. bonus_equipe — bônus por patamar
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS bonus_equipe (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mes int NOT NULL,
    ano int NOT NULL,
    patamar int NOT NULL,
    fechamentos_mes int,
    total_bonus numeric,
    status text DEFAULT 'pendente'
      CHECK (status IN ('pendente','aprovado','pago','cancelado')),
    distribuicao jsonb,
    created_at timestamptz DEFAULT now(),
    UNIQUE(mes, ano, patamar)
  )
`)
console.log('✅ bonus_equipe tabela criada')

// Verificação
const cfg = await c.query('SELECT * FROM config_comissoes ORDER BY atualizado_em DESC LIMIT 1')
console.log('\n📋 config_comissoes:', cfg.rows[0])

await c.end()
console.log('\n✅ Migration comissões concluída')
