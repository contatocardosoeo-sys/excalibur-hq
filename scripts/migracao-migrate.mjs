import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const SQL = `
-- ════════════════════════════════════════
-- INICIATIVA: MIGRAÇÃO CULTURAL PARA HQ-ONLY
-- ════════════════════════════════════════

-- 1. Diagnóstico individual (5 perguntas por colaborador, uma vez)
CREATE TABLE IF NOT EXISTS migracao_diagnostico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text UNIQUE NOT NULL,
  user_nome text,
  user_role text,
  q1_onde_guarda text,              -- onde guarda infos de clientes/leads hoje
  q2_ferramenta_principal text,     -- qual ferramenta externa mais usa
  q3_o_que_falta text,              -- o que falta no HQ pra usar só ele
  q4_dado_nao_capturado text,       -- dado seu não capturado hoje
  q5_dor_principal text,            -- maior dor hoje (texto livre)
  respondido_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mig_diag_email ON migracao_diagnostico(user_email);

-- 2. Checkin diário (obrigatório — toda vez que loga no dia)
CREATE TABLE IF NOT EXISTS checkin_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  usou_externo boolean NOT NULL DEFAULT false,
  ferramenta_externa text,          -- WhatsApp / Planilha / Agenda / etc (se usou_externo)
  motivo text,                      -- por que usou (se usou_externo)
  confirmou_em timestamptz DEFAULT now(),
  UNIQUE(user_email, data)
);

CREATE INDEX IF NOT EXISTS idx_checkin_email_data ON checkin_diario(user_email, data DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_usou_externo ON checkin_diario(usou_externo, data DESC);

-- 3. Score semanal de adoção HQ-only por colaborador
CREATE TABLE IF NOT EXISTS adocao_score_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  semana_iso text NOT NULL,         -- formato 2026-W15
  dias_uteis_ate_agora int DEFAULT 0,
  dias_sem_externo int DEFAULT 0,
  dias_com_externo int DEFAULT 0,
  score_adocao int DEFAULT 0,       -- 0-100
  executou_tarefa_prioritaria int DEFAULT 0, -- quantos dias da semana executou
  pontos_bonus int DEFAULT 0,
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(user_email, semana_iso)
);

CREATE INDEX IF NOT EXISTS idx_adocao_semana ON adocao_score_semanal(semana_iso, score_adocao DESC);

-- 4. Passos de migração (checklist por role)
CREATE TABLE IF NOT EXISTS migracao_passos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  passo_key text NOT NULL,          -- ex: 'diagnostico', 'importar_leads', 'checkin_7d'
  concluido boolean DEFAULT false,
  concluido_em timestamptz,
  metadata jsonb,
  UNIQUE(user_email, passo_key)
);

CREATE INDEX IF NOT EXISTS idx_passos_email ON migracao_passos(user_email);

-- 5. Log de importação (auditoria — o que cada um importou)
CREATE TABLE IF NOT EXISTS importacao_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  tipo text NOT NULL,               -- leads | pipeline | clinicas_trafego | contatos_cs
  quantidade int DEFAULT 0,
  payload_resumo jsonb,
  sucesso boolean DEFAULT true,
  erro text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_email ON importacao_log(user_email, criado_em DESC);
`

try {
  await c.connect()
  await c.query(SQL)
  console.log('✅ Migração cultural — tabelas criadas')

  const r = await c.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN (
      'migracao_diagnostico','checkin_diario','adocao_score_semanal','migracao_passos','importacao_log'
    )
    ORDER BY table_name
  `)
  console.log('Tabelas:', r.rows.map(x => x.table_name))
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
} finally {
  await c.end()
}
