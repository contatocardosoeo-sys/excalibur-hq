import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// 1. Mover etapa de jornada_clinica para clinicas com fase=escala
const upd = await c.query(`
  UPDATE jornada_clinica jc SET etapa = 'D90_EMBARCADO', updated_at = now()
  FROM clinicas c
  WHERE jc.clinica_id = c.id AND c.fase = 'escala' AND c.ativo = true
`)
console.log(`✅ ${upd.rowCount} clinicas movidas para etapa D90_EMBARCADO`)

// 2. Pegar IDs das clínicas em D90_EMBARCADO (incluindo as recém-movidas)
const { rows: clinicasEmbarcadas } = await c.query(`
  SELECT c.id, c.nome FROM clinicas c
  WHERE c.fase = 'escala' AND c.ativo = true
`)
console.log(`📋 ${clinicasEmbarcadas.length} clínicas embarcadas para receber playbook D90+`)

// 3. Definir as 4 tarefas template do playbook D90+ (Customer Marketing)
const PLAYBOOK_D90 = [
  {
    titulo: '🤝 Pedir indicação ao cliente',
    descricao: 'Cliente está satisfeito e em escala — pedir 2-3 indicações de outros donos de clínica que possam virar parceiros.',
    responsavel: 'CS',
    prazo_dia: 95,
    bloqueante: false,
  },
  {
    titulo: '📈 Apresentar upsell de plano',
    descricao: 'Avaliar fit para upgrade — Plano Completo, módulos extras, integração avançada. Reunião comercial agendada via Guilherme.',
    responsavel: 'CS',
    prazo_dia: 100,
    bloqueante: false,
  },
  {
    titulo: '🛠️ Manutenção da conta — health check trimestral',
    descricao: 'Revisar uso do CRM, taxa de resposta, métricas do funil. Identificar regressões antes que virem churn.',
    responsavel: 'CS',
    prazo_dia: 105,
    bloqueante: false,
  },
  {
    titulo: '🆕 Apresentar novos produtos da Excalibur',
    descricao: 'Mostrar lançamentos recentes (Pay, Tráfego, novos módulos). Cliente embarcado é o melhor early adopter.',
    responsavel: 'CS',
    prazo_dia: 110,
    bloqueante: false,
  },
]

// 4. Inserir tarefas para cada clínica embarcada (idempotente — só se não existirem ainda)
let inseridas = 0
for (const clinica of clinicasEmbarcadas) {
  for (const t of PLAYBOOK_D90) {
    // Check se já existe pela combinação clinica_id + titulo
    const { rows: existe } = await c.query(
      `SELECT id FROM tarefas_jornada WHERE clinica_id = $1 AND titulo = $2`,
      [clinica.id, t.titulo]
    )
    if (existe.length > 0) continue

    // data_prazo = data_inicio + prazo_dia (ou hoje + 14 dias se sem data_inicio)
    const dataPrazo = new Date()
    dataPrazo.setDate(dataPrazo.getDate() + 14)

    await c.query(
      `INSERT INTO tarefas_jornada (clinica_id, fase, titulo, descricao, responsavel, prazo_dia, data_prazo, status, bloqueante)
       VALUES ($1, 'D90+', $2, $3, $4, $5, $6, 'pendente', $7)`,
      [clinica.id, t.titulo, t.descricao, t.responsavel, t.prazo_dia, dataPrazo.toISOString().split('T')[0], t.bloqueante]
    )
    inseridas++
  }
}
console.log(`✅ ${inseridas} tarefas D90+ criadas (${PLAYBOOK_D90.length} × ${clinicasEmbarcadas.length} clínicas, descontando existentes)`)

// 5. Verificar
const { rows: verify } = await c.query(`
  SELECT etapa, COUNT(*) FROM jornada_clinica
  WHERE clinica_id IN (SELECT id FROM clinicas WHERE ativo = true)
  GROUP BY etapa ORDER BY etapa
`)
console.log('Distribuição final etapas:', verify)

const { rows: tarefasD90 } = await c.query(`SELECT COUNT(*) FROM tarefas_jornada WHERE fase = 'D90+'`)
console.log(`Total tarefas D90+: ${tarefasD90[0].count}`)

await c.end()
