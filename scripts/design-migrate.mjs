import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const SQL = `
-- Expandir constraint de role para incluir editor_video e designer
ALTER TABLE usuarios_internos DROP CONSTRAINT IF EXISTS usuarios_internos_role_check;
ALTER TABLE usuarios_internos ADD CONSTRAINT usuarios_internos_role_check
  CHECK (role = ANY (ARRAY['admin','coo','cs','sdr','closer','cmo','trafego','financeiro','head_traffic','editor_video','designer']));

-- Tabela de demandas criativas (vídeos + design)
CREATE TABLE IF NOT EXISTS demandas_design (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL,                    -- video_curto | video_longo | reel | arte_ads | post_feed | story | banner | logo | apresentacao | outro
  solicitante_email text NOT NULL,       -- quem pediu (qualquer colaborador)
  solicitante_nome text,
  responsavel_email text,                -- juan ou vinicius
  responsavel_nome text,
  prioridade text DEFAULT 'media',       -- baixa | media | alta | urgente
  status text DEFAULT 'recebida',        -- recebida | em_andamento | revisao | ajustes | concluida | cancelada
  prazo_desejado date,
  data_entrega date,                     -- quando foi entregue
  arquivos_entrega text[],               -- URLs/caminhos
  referencias text[],                    -- URLs de referência
  briefing jsonb,                        -- dados estruturados do briefing
  feedback text,                         -- feedback do solicitante
  nota_qualidade int,                    -- 1-5 estrelas
  tempo_estimado_horas numeric,
  tempo_real_horas numeric,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demandas_responsavel ON demandas_design(responsavel_email, status);
CREATE INDEX IF NOT EXISTS idx_demandas_solicitante ON demandas_design(solicitante_email);
CREATE INDEX IF NOT EXISTS idx_demandas_prazo ON demandas_design(prazo_desejado) WHERE status NOT IN ('concluida','cancelada');
CREATE INDEX IF NOT EXISTS idx_demandas_status ON demandas_design(status);

-- Rotina diária dos criativos (horários/tarefas recorrentes)
CREATE TABLE IF NOT EXISTS design_rotina (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  ordem int DEFAULT 0,
  hora text,                             -- ex: "09:00"
  titulo text NOT NULL,
  descricao text,
  duracao_min int,
  categoria text,                        -- deep_work | meeting | admin | break
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rotina_user ON design_rotina(user_email, ordem);
`

try {
  await c.connect()
  await c.query(SQL)
  console.log('✅ Migração setor Design concluída')

  // Rotinas iniciais
  const rotinaJuan = [
    { ordem: 1, hora: '08:30', titulo: 'Revisar demandas novas', descricao: 'Ver /design de manhã — o que chegou na noite', duracao_min: 20, categoria: 'admin' },
    { ordem: 2, hora: '09:00', titulo: 'Corte bruto — deep work', descricao: 'Edição pesada no Premiere, foco total', duracao_min: 120, categoria: 'deep_work' },
    { ordem: 3, hora: '11:00', titulo: 'Review + feedback ao briefing', descricao: 'Responder dúvidas, pedir refs', duracao_min: 30, categoria: 'admin' },
    { ordem: 4, hora: '11:30', titulo: 'Motion / Aftereffects', descricao: 'Animações e efeitos', duracao_min: 90, categoria: 'deep_work' },
    { ordem: 5, hora: '13:30', titulo: 'Almoço', descricao: '', duracao_min: 60, categoria: 'break' },
    { ordem: 6, hora: '14:30', titulo: 'Cortes curtos (reels/shorts)', descricao: 'Assets para Meta Ads e redes sociais', duracao_min: 90, categoria: 'deep_work' },
    { ordem: 7, hora: '16:00', titulo: 'Render + export + entregas', descricao: 'Finalizar vídeos do dia e postar no /design', duracao_min: 60, categoria: 'admin' },
    { ordem: 8, hora: '17:00', titulo: 'Planning do dia seguinte', descricao: 'Ver próximas demandas e priorizar', duracao_min: 20, categoria: 'admin' },
  ]

  const rotinaVini = [
    { ordem: 1, hora: '09:00', titulo: 'Revisar demandas novas', descricao: 'Ver /design — demandas e prazos', duracao_min: 20, categoria: 'admin' },
    { ordem: 2, hora: '09:30', titulo: 'Arte para Meta/Google Ads', descricao: 'Criar variações de criativos para campanhas', duracao_min: 120, categoria: 'deep_work' },
    { ordem: 3, hora: '11:30', titulo: 'Review + alinhamento briefing', descricao: 'Revisar arte + feedback do solicitante', duracao_min: 30, categoria: 'admin' },
    { ordem: 4, hora: '12:00', titulo: 'Almoço', descricao: '', duracao_min: 60, categoria: 'break' },
    { ordem: 5, hora: '13:00', titulo: 'Design institucional', descricao: 'Landing pages, banners, materiais da Excalibur', duracao_min: 120, categoria: 'deep_work' },
    { ordem: 6, hora: '15:00', titulo: 'Posts feed / stories', descricao: 'Conteúdo para redes sociais das clínicas clientes', duracao_min: 90, categoria: 'deep_work' },
    { ordem: 7, hora: '16:30', titulo: 'Ajustes + revisões', descricao: 'Atender retornos de clientes/equipe', duracao_min: 60, categoria: 'admin' },
    { ordem: 8, hora: '17:30', titulo: 'Entregas + update /design', descricao: 'Postar finais e atualizar status das demandas', duracao_min: 30, categoria: 'admin' },
  ]

  // Inserir rotinas (só se não existirem)
  const existe = await c.query(`SELECT COUNT(*) FROM design_rotina WHERE user_email IN ('juan.excalibur@gmail.com', 'vinicius.excalibur@gmail.com')`)
  if (Number(existe.rows[0].count) === 0) {
    for (const r of rotinaJuan) {
      await c.query(`INSERT INTO design_rotina (user_email, ordem, hora, titulo, descricao, duracao_min, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ['juan.excalibur@gmail.com', r.ordem, r.hora, r.titulo, r.descricao, r.duracao_min, r.categoria])
    }
    for (const r of rotinaVini) {
      await c.query(`INSERT INTO design_rotina (user_email, ordem, hora, titulo, descricao, duracao_min, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ['vinicius.excalibur@gmail.com', r.ordem, r.hora, r.titulo, r.descricao, r.duracao_min, r.categoria])
    }
    console.log(`✅ Rotinas seed: Juan (${rotinaJuan.length}) + Vinicius (${rotinaVini.length})`)
  } else {
    console.log('ℹ Rotinas já existem, pulando seed')
  }

  // Verificar
  const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='demandas_design' ORDER BY ordinal_position`)
  console.log('demandas_design cols:', cols.rows.length)
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
} finally {
  await c.end()
}
