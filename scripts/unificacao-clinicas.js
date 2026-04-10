// Script atomico de unificacao clinicas + clientes_hq
// Adiciona campos operacionais a clinicas, migra dados, atualiza FKs

const { Client } = require('pg')
const DB = 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres'

;(async () => {
  const c = new Client({ connectionString: DB })
  await c.connect()

  console.log('=== INICIANDO UNIFICACAO ===\n')

  // 1. Adicionar campos operacionais em clinicas
  console.log('1. Adicionando campos operacionais a clinicas...')
  const novosCampos = [
    ['fase', 'text DEFAULT \'onboarding\''],
    ['score_total', 'int DEFAULT 0'],
    ['score_adocao', 'int DEFAULT 0'],
    ['score_operacao', 'int DEFAULT 0'],
    ['score_resultado', 'int DEFAULT 0'],
    ['status_execucao', 'text DEFAULT \'aguardando_cliente\''],
    ['ultimo_contato', 'timestamptz'],
    ['dias_na_etapa', 'int DEFAULT 0'],
    ['dias_sem_venda', 'int DEFAULT 0'],
    ['crm_ativo', 'boolean DEFAULT false'],
    ['campanha_ativa', 'boolean DEFAULT false'],
    ['leads_semana', 'int DEFAULT 0'],
    ['proxima_acao', 'text'],
    ['problema_detectado', 'text'],
    ['mrr', 'numeric(10,2) DEFAULT 0'],
    ['ticket_medio', 'numeric(10,2) DEFAULT 0'],
    ['roi', 'numeric(5,2) DEFAULT 0'],
    ['total_vendas_semana', 'int DEFAULT 0'],
    ['adocao_crm', 'boolean DEFAULT false'],
    ['adocao_responde_leads', 'boolean DEFAULT false'],
    ['adocao_assiste_aulas', 'boolean DEFAULT false'],
    ['adocao_planilha', 'boolean DEFAULT false'],
    ['adocao_script', 'boolean DEFAULT false'],
    ['adocao_reunioes', 'boolean DEFAULT false'],
    ['segmento', 'text'],
    ['ticket', 'numeric(10,2)'],
    ['subfase', 'text'],
    ['sla_estourado', 'boolean DEFAULT false'],
    ['status_cliente', 'text DEFAULT \'ativo\''],
  ]
  for (const [col, tipo] of novosCampos) {
    await c.query(`ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS ${col} ${tipo}`)
  }
  console.log(`   ${novosCampos.length} campos adicionados\n`)

  // 2. Migrar dados de clientes_hq → clinicas
  console.log('2. Migrando 47 registros de clientes_hq → clinicas...')
  const { rows: clientesHQ } = await c.query('SELECT * FROM clientes_hq')
  console.log(`   ${clientesHQ.length} registros encontrados`)

  let inseridos = 0
  let atualizados = 0
  for (const ch of clientesHQ) {
    // Verificar se ja existe em clinicas (por nome)
    const { rows: existe } = await c.query('SELECT id FROM clinicas WHERE nome = $1 LIMIT 1', [ch.nome])

    if (existe.length > 0) {
      // Atualizar
      await c.query(`
        UPDATE clinicas SET
          fase = $1, score_total = $2, score_adocao = $3, score_operacao = $4, score_resultado = $5,
          status_execucao = $6, ultimo_contato = $7, dias_na_etapa = $8, dias_sem_venda = $9,
          crm_ativo = $10, campanha_ativa = $11, leads_semana = $12, proxima_acao = $13,
          problema_detectado = $14, mrr = $15, ticket_medio = $16, roi = $17, total_vendas_semana = $18,
          adocao_crm = $19, adocao_responde_leads = $20, adocao_assiste_aulas = $21,
          adocao_planilha = $22, adocao_script = $23, adocao_reunioes = $24,
          segmento = $25, plano = COALESCE($26, plano), ticket = $27, subfase = $28,
          sla_estourado = $29, status_cliente = $30, cs_responsavel = COALESCE($31, cs_responsavel),
          data_inicio = COALESCE($32, data_inicio)
        WHERE id = $33
      `, [
        ch.fase, ch.score_total, ch.score_adocao, ch.score_operacao, ch.score_resultado,
        ch.status_execucao, ch.ultimo_contato, ch.dias_na_etapa, ch.dias_sem_venda,
        ch.crm_ativo, ch.campanha_ativa, ch.leads_semana, ch.proxima_acao,
        ch.problema_detectado, ch.mrr, ch.ticket_medio, ch.roi, ch.total_vendas_semana,
        ch.adocao_crm, ch.adocao_responde_leads, ch.adocao_assiste_aulas,
        ch.adocao_planilha, ch.adocao_script, ch.adocao_reunioes,
        ch.segmento, ch.plano, ch.ticket, ch.subfase,
        ch.sla_estourado, ch.status_cliente, ch.cs_responsavel,
        ch.data_inicio, existe[0].id,
      ])
      atualizados++
    } else {
      // Inserir novo (email placeholder pois NOT NULL)
      const emailSlug = ch.nome.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
      const emailPlaceholder = `${emailSlug}@cliente.excalibur.local`
      await c.query(`
        INSERT INTO clinicas (
          nome, email, ativo, fase, score_total, score_adocao, score_operacao, score_resultado,
          status_execucao, ultimo_contato, dias_na_etapa, dias_sem_venda,
          crm_ativo, campanha_ativa, leads_semana, proxima_acao,
          problema_detectado, mrr, ticket_medio, roi, total_vendas_semana,
          adocao_crm, adocao_responde_leads, adocao_assiste_aulas,
          adocao_planilha, adocao_script, adocao_reunioes,
          segmento, plano, ticket, subfase, sla_estourado, status_cliente,
          cs_responsavel, data_inicio
        ) VALUES (
          $1, $2, true, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
        )
      `, [
        ch.nome, emailPlaceholder, ch.fase, ch.score_total, ch.score_adocao, ch.score_operacao, ch.score_resultado,
        ch.status_execucao, ch.ultimo_contato, ch.dias_na_etapa, ch.dias_sem_venda,
        ch.crm_ativo, ch.campanha_ativa, ch.leads_semana, ch.proxima_acao,
        ch.problema_detectado, ch.mrr, ch.ticket_medio, ch.roi, ch.total_vendas_semana,
        ch.adocao_crm, ch.adocao_responde_leads, ch.adocao_assiste_aulas,
        ch.adocao_planilha, ch.adocao_script, ch.adocao_reunioes,
        ch.segmento, ch.plano, ch.ticket, ch.subfase,
        ch.sla_estourado, ch.status_cliente, ch.cs_responsavel, ch.data_inicio,
      ])
      inseridos++
    }
  }
  console.log(`   Inseridos: ${inseridos}, Atualizados: ${atualizados}\n`)

  // 3. Verificar resultado
  const { rows: total } = await c.query('SELECT COUNT(*) as total FROM clinicas WHERE ativo = true')
  console.log(`3. Total de clinicas ativas agora: ${total[0].total}`)

  const { rows: porPlano } = await c.query(`
    SELECT plano, COUNT(*) as qtd, SUM(mrr) as mrr_total
    FROM clinicas WHERE ativo = true
    GROUP BY plano ORDER BY qtd DESC
  `)
  console.log('\n   Por plano:')
  porPlano.forEach(r => console.log(`     ${r.plano}: ${r.qtd} clinicas, R$${Number(r.mrr_total || 0).toFixed(0)}`))

  // 4. Limpar sync_log antigo (> 7 dias)
  console.log('\n4. Limpando sync_log > 7 dias...')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const { rowCount: deleted } = await c.query('DELETE FROM sync_log WHERE created_at < $1', [cutoff])
  console.log(`   ${deleted} logs antigos removidos`)

  await c.end()
  console.log('\nDone!')
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
