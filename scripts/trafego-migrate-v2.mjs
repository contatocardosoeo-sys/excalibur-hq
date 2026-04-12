import pg from 'pg'
const { Client } = pg

const SQL = `
-- trafego_metricas: funil completo + velocidade resposta
ALTER TABLE trafego_metricas ADD COLUMN IF NOT EXISTS agendamentos int DEFAULT 0;
ALTER TABLE trafego_metricas ADD COLUMN IF NOT EXISTS comparecimentos int DEFAULT 0;
ALTER TABLE trafego_metricas ADD COLUMN IF NOT EXISTS fechamentos int DEFAULT 0;
ALTER TABLE trafego_metricas ADD COLUMN IF NOT EXISTS receita_gerada numeric DEFAULT 0;
ALTER TABLE trafego_metricas ADD COLUMN IF NOT EXISTS tempo_resposta_min int;
ALTER TABLE trafego_metricas ADD COLUMN IF NOT EXISTS oferta_rodando text;

-- trafego_clinica: especialidade + metas + ciclos
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS especialidade text;
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS ticket_medio numeric DEFAULT 0;
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS meta_agendamentos int DEFAULT 0;
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS meta_comparecimentos int DEFAULT 0;
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS ultima_otimizacao date;
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS ciclo_criativo_dias int DEFAULT 14;
ALTER TABLE trafego_clinica ADD COLUMN IF NOT EXISTS frequencia_alvo numeric DEFAULT 2.5;

-- Nova tabela de otimizações
CREATE TABLE IF NOT EXISTS trafego_otimizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES gestores_trafego(id) ON DELETE SET NULL,
  data date DEFAULT CURRENT_DATE,
  acoes jsonb,
  observacao text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trafego_otim_clinica_data ON trafego_otimizacoes(clinica_id, data DESC);

-- Seed de especialidades + metas + ultima_otimizacao aleatórias nas 10 clínicas já vinculadas
UPDATE trafego_clinica SET
  especialidade = (ARRAY['geral','implante','clareamento','ortodontia','emergencia'])[1 + floor(random()*5)::int],
  ticket_medio = FLOOR(random()*5000 + 800),
  meta_agendamentos = meta_leads * 6 / 10,
  meta_comparecimentos = meta_leads * 4 / 10,
  ultima_otimizacao = CURRENT_DATE - (floor(random()*20)::int)
WHERE especialidade IS NULL;
`

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(SQL)
  console.log('✅ Migração v2 concluída')

  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='trafego_metricas' AND column_name IN ('agendamentos','comparecimentos','fechamentos','receita_gerada','tempo_resposta_min','oferta_rodando')
    ORDER BY column_name
  `)
  console.log('trafego_metricas novos campos:', rows.map(r => r.column_name))

  const { rows: r2 } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='trafego_clinica' AND column_name IN ('especialidade','ticket_medio','meta_agendamentos','ultima_otimizacao','ciclo_criativo_dias','frequencia_alvo')
    ORDER BY column_name
  `)
  console.log('trafego_clinica novos campos:', r2.map(r => r.column_name))
} catch (e) {
  console.error('❌ ERRO:', e.message)
  process.exit(1)
} finally {
  await client.end()
}
