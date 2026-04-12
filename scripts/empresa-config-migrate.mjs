import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// ══════════════════════════════════════════════════════════════════
// 1. empresa_config — fonte única de premissas do negócio
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS empresa_config (
    id int PRIMARY KEY DEFAULT 1,
    nivel_meta text NOT NULL DEFAULT 'alvo',
    receita_minima numeric NOT NULL DEFAULT 74000,
    receita_alvo numeric NOT NULL DEFAULT 90000,
    receita_super numeric NOT NULL DEFAULT 126000,
    ticket_medio numeric NOT NULL DEFAULT 2000,
    cpl_medio numeric NOT NULL DEFAULT 10.70,
    cpl_max numeric NOT NULL DEFAULT 15.00,
    taxa_qualificacao numeric NOT NULL DEFAULT 0.70,
    taxa_agendamento numeric NOT NULL DEFAULT 0.35,
    taxa_comparecimento numeric NOT NULL DEFAULT 0.70,
    taxa_fechamento numeric NOT NULL DEFAULT 0.30,
    sdr_agendamentos_dia int NOT NULL DEFAULT 15,
    sdr_agendamentos_min int NOT NULL DEFAULT 8,
    sdr_agendamentos_max int NOT NULL DEFAULT 20,
    comissao_closer_pct numeric NOT NULL DEFAULT 0.10,
    cac_max numeric NOT NULL DEFAULT 300,
    custo_reuniao_max numeric NOT NULL DEFAULT 55,
    updated_at timestamptz DEFAULT now(),
    updated_by text,
    CONSTRAINT empresa_config_single CHECK (id = 1)
  )
`)
console.log('✅ empresa_config tabela criada')

// Row única (upsert)
await c.query(`
  INSERT INTO empresa_config (id, nivel_meta) VALUES (1, 'alvo')
  ON CONFLICT (id) DO NOTHING
`)

// ══════════════════════════════════════════════════════════════════
// 2. feriados — dias que não contam como úteis
// ══════════════════════════════════════════════════════════════════
await c.query(`
  CREATE TABLE IF NOT EXISTS feriados (
    data date PRIMARY KEY,
    nome text NOT NULL,
    tipo text NOT NULL DEFAULT 'nacional',
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
  )
`)
console.log('✅ feriados tabela criada')

const feriados2026 = [
  ['2026-01-01', 'Ano Novo'],
  ['2026-02-16', 'Carnaval (segunda)'],
  ['2026-02-17', 'Carnaval (terça)'],
  ['2026-04-03', 'Sexta-feira Santa'],
  ['2026-04-21', 'Tiradentes'],
  ['2026-05-01', 'Dia do Trabalho'],
  ['2026-06-04', 'Corpus Christi'],
  ['2026-09-07', 'Independência'],
  ['2026-10-12', 'Nossa Senhora Aparecida'],
  ['2026-11-02', 'Finados'],
  ['2026-11-15', 'Proclamação da República'],
  ['2026-11-20', 'Consciência Negra'],
  ['2026-12-25', 'Natal'],
]

for (const [data, nome] of feriados2026) {
  await c.query(
    `INSERT INTO feriados (data, nome, tipo) VALUES ($1, $2, 'nacional')
     ON CONFLICT (data) DO UPDATE SET nome = EXCLUDED.nome`,
    [data, nome],
  )
}
console.log(`✅ ${feriados2026.length} feriados BR 2026 inseridos`)

// ══════════════════════════════════════════════════════════════════
// 3. Verificação
// ══════════════════════════════════════════════════════════════════
const cfg = await c.query('SELECT * FROM empresa_config WHERE id = 1')
console.log('\n📋 empresa_config:', cfg.rows[0])

const fer = await c.query('SELECT count(*) FROM feriados WHERE ativo = true')
console.log(`📋 feriados ativos: ${fer.rows[0].count}`)

await c.end()
console.log('\n✅ Migration empresa_config + feriados concluída')
