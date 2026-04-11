import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg

const SQL = `
-- 1. Gestores de tráfego (subordinados da Jéssica)
CREATE TABLE IF NOT EXISTS gestores_trafego (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE,
  whatsapp text,
  status text DEFAULT 'ativo',
  clinicas_count int DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

-- 2. Vínculo clínica ↔ gestor de tráfego
CREATE TABLE IF NOT EXISTS trafego_clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES gestores_trafego(id) ON DELETE SET NULL,
  plataforma text DEFAULT 'meta',
  investimento_mensal numeric DEFAULT 0,
  meta_leads int DEFAULT 0,
  meta_cpl numeric DEFAULT 0,
  status text DEFAULT 'ativo',
  data_inicio date DEFAULT CURRENT_DATE,
  observacoes text,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(clinica_id)
);

-- 3. Métricas diárias de tráfego por clínica
CREATE TABLE IF NOT EXISTS trafego_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES gestores_trafego(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  leads int DEFAULT 0,
  investimento numeric DEFAULT 0,
  cpl numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  impressoes int DEFAULT 0,
  cliques int DEFAULT 0,
  alcance int DEFAULT 0,
  frequencia numeric DEFAULT 0,
  criado_em timestamptz DEFAULT now(),
  UNIQUE(clinica_id, data)
);

-- 4. Questionário de setup (primeira vez da Jéssica)
CREATE TABLE IF NOT EXISTS trafego_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondido_em timestamptz,
  respondido_por text,
  q_gestores_count int,
  q_clinicas_por_gestor text,
  q_plataformas jsonb,
  q_rotina_diaria text,
  q_dados_hoje text,
  q_metricas_importantes jsonb,
  q_meta_padrao text,
  q_cpl_alvo numeric,
  q_definicao_bom text,
  q_fluxo_medina text,
  q_saber_jornada text,
  q_trafego_pausado text,
  q_planilha_atual text,
  q_relatorio_manual text,
  q_integracao_api text,
  q_dor_principal text,
  q_mvp text,
  criado_em timestamptz DEFAULT now()
);

-- 5. Alertas automáticos de tráfego
CREATE TABLE IF NOT EXISTS trafego_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES gestores_trafego(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  titulo text,
  descricao text,
  prioridade text DEFAULT 'media',
  status text DEFAULT 'aberto',
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trafego_metricas_clinica_data ON trafego_metricas(clinica_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_trafego_alertas_status ON trafego_alertas(status, prioridade);
CREATE INDEX IF NOT EXISTS idx_trafego_clinica_gestor ON trafego_clinica(gestor_id);
`

const client = new Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(SQL)
  console.log('✅ 5 tabelas criadas com sucesso')

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN
    ('gestores_trafego','trafego_clinica','trafego_metricas','trafego_setup','trafego_alertas')
    ORDER BY table_name
  `)
  console.log('Tabelas confirmadas:', rows.map(r => r.table_name))
} catch (e) {
  console.error('❌ ERRO:', e.message)
  process.exit(1)
} finally {
  await client.end()
}
