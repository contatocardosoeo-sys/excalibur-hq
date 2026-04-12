// ══════════════════════════════════════════════════════════════════
// HEALTH SCORE DOS COLABORADORES — por papel/role
// ══════════════════════════════════════════════════════════════════
// Cada role tem seu próprio cálculo baseado no que importa pra ELE.
// Score vai de 0 a 100, sempre com mesma escala pra comparar.

import { createClient } from '@supabase/supabase-js'
import { FUNIL_ATIVO, RECEITA_METAS, META_ATIVA } from './config'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export type Nivel = 'critico' | 'atencao' | 'bom' | 'excelente'

export type Fator = {
  label: string
  valor: string          // valor legível
  peso: number           // 0-100 (contribuição ao score)
  score: number          // 0-peso (atingido)
  ok: boolean
}

export type HealthScore = {
  email: string
  nome: string
  role: string
  score: number                    // 0-100
  nivel: Nivel
  fatores: Fator[]                 // quebra do cálculo
  recomendacoes: string[]          // ações sugeridas
  executou_hoje: boolean            // sinalização binária
  dias_ativo_7d: number             // dias com atividade na última semana
}

function nivelPorScore(score: number): Nivel {
  if (score >= 85) return 'excelente'
  if (score >= 65) return 'bom'
  if (score >= 40) return 'atencao'
  return 'critico'
}

// ─── HELPER: buscar dados universais (checkin, migração, dias HQ-only) ──
async function buscarUniversais(email: string) {
  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
  const dIni = seteDiasAtras.toISOString().split('T')[0]

  const [{ data: checkins }, { data: passos }] = await Promise.all([
    sb.from('checkin_diario').select('data, usou_externo').eq('user_email', email).gte('data', dIni).order('data', { ascending: false }),
    sb.from('migracao_passos').select('passo_key, concluido').eq('user_email', email).eq('concluido', true),
  ])

  const cks = checkins || []
  const diasSemExterno = cks.filter(c => !c.usou_externo).length
  const diasComExterno = cks.filter(c => c.usou_externo).length
  const checkinHoje = cks.find(c => c.data === new Date().toISOString().split('T')[0])
  const passosConcluidos = (passos || []).length

  return {
    dias_sem_externo_7d: diasSemExterno,
    dias_com_externo_7d: diasComExterno,
    checkin_hoje: !!checkinHoje,
    passos_migracao: passosConcluidos,
  }
}

// ─── SDR (Trindade) — foco: metas do funil ──────────────────────
async function healthSdr(email: string, nome: string): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  // Buscar acumulado do mês
  const mesInicio = new Date()
  mesInicio.setDate(1)
  const iso = mesInicio.toISOString().split('T')[0]

  const { data: metricas } = await sb
    .from('sdr_metricas_diarias')
    .select('data, leads_recebidos, agendamentos, comparecimentos, vendas')
    .eq('sdr_email', email)
    .gte('data', iso)

  const m = metricas || []
  const totalLeads = m.reduce((s, x) => s + (x.leads_recebidos || 0), 0)
  const totalAgend = m.reduce((s, x) => s + (x.agendamentos || 0), 0)
  const totalComp = m.reduce((s, x) => s + (x.comparecimentos || 0), 0)
  const totalVendas = m.reduce((s, x) => s + (x.vendas || 0), 0)

  // Fator 1: Agendamentos vs meta (foco 80/20) — peso 30
  const pctAgend = Math.min(100, (totalAgend / FUNIL_ATIVO.mensal.agendamentos) * 100)
  fatores.push({
    label: 'Agendamentos vs meta',
    valor: `${totalAgend}/${FUNIL_ATIVO.mensal.agendamentos}`,
    peso: 30,
    score: Math.round((pctAgend / 100) * 30),
    ok: pctAgend >= 80,
  })
  if (pctAgend < 50) rec.push('Agendar mais reuniões — está abaixo de 50% da meta mensal')

  // Fator 2: Reuniões realizadas vs meta — peso 25
  const pctComp = Math.min(100, (totalComp / FUNIL_ATIVO.mensal.comparecimentos) * 100)
  fatores.push({
    label: 'Reuniões realizadas vs meta',
    valor: `${totalComp}/${FUNIL_ATIVO.mensal.comparecimentos}`,
    peso: 25,
    score: Math.round((pctComp / 100) * 25),
    ok: pctComp >= 80,
  })

  // Fator 3: Leads vs meta — peso 15
  const pctLeads = Math.min(100, (totalLeads / FUNIL_ATIVO.mensal.leads) * 100)
  fatores.push({
    label: 'Leads recebidos vs meta',
    valor: `${totalLeads}/${FUNIL_ATIVO.mensal.leads}`,
    peso: 15,
    score: Math.round((pctLeads / 100) * 15),
    ok: pctLeads >= 80,
  })
  void totalVendas

  // Fator 4: Consistência (dias ativos 7d) — peso 15
  const diasAtivos = new Set(m.filter(x => x.data >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]).map(x => x.data)).size
  fatores.push({
    label: 'Dias ativos últimos 7',
    valor: `${diasAtivos}/5 úteis`,
    peso: 15,
    score: Math.min(15, Math.round((diasAtivos / 5) * 15)),
    ok: diasAtivos >= 5,
  })
  if (diasAtivos < 3) rec.push('Lançar métricas diariamente — última semana com poucos dias ativos')

  // Fator 5: HQ-only (migração) — peso 15
  const pctHq = (univ.dias_sem_externo_7d / Math.max(1, univ.dias_sem_externo_7d + univ.dias_com_externo_7d)) * 100
  fatores.push({
    label: 'HQ-only nos últimos 7 dias',
    valor: `${univ.dias_sem_externo_7d} dias`,
    peso: 15,
    score: Math.round((pctHq / 100) * 15),
    ok: univ.dias_com_externo_7d === 0,
  })
  if (univ.dias_com_externo_7d > 2) rec.push('Reduzir uso de ferramentas externas (checkin mostra desvios)')

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role: 'sdr',
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: !!m.find(x => x.data === new Date().toISOString().split('T')[0]),
    dias_ativo_7d: diasAtivos,
  }
}

// ─── CLOSER (Guilherme) — foco: fechamentos + MRR ───────────────
async function healthCloser(email: string, nome: string): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  const { data: pipe } = await sb.from('pipeline_closer').select('*')
  const all = pipe || []
  const mesInicio = new Date()
  mesInicio.setDate(1)
  const iso = mesInicio.toISOString().split('T')[0]

  const fechMes = all.filter(p => p.status === 'fechado' && (p.data_fechamento || p.updated_at || '').slice(0, 10) >= iso)
  const totalFech = fechMes.length
  const totalMrr = fechMes.reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)
  const reunioes = all.filter(p => ['reuniao_agendada', 'proposta_enviada', 'fechado'].includes(p.status)).length

  // Fator 1: Fechamentos vs meta (80/20) — peso 35
  const pctFech = Math.min(100, (totalFech / FUNIL_ATIVO.mensal.vendas) * 100)
  fatores.push({
    label: 'Fechamentos vs meta',
    valor: `${totalFech}/${FUNIL_ATIVO.mensal.vendas}`,
    peso: 35,
    score: Math.round((pctFech / 100) * 35),
    ok: pctFech >= 80,
  })
  if (pctFech < 50) rec.push('Pipeline abaixo da meta — priorizar fechamentos esta semana')

  // Fator 2: MRR vs meta — peso 25
  const pctMrr = Math.min(100, (totalMrr / RECEITA_METAS[META_ATIVA]) * 100)
  fatores.push({
    label: 'MRR gerado vs meta',
    valor: `R$${totalMrr.toLocaleString('pt-BR')}/R$${RECEITA_METAS[META_ATIVA].toLocaleString('pt-BR')}`,
    peso: 25,
    score: Math.round((pctMrr / 100) * 25),
    ok: pctMrr >= 80,
  })

  // Fator 3: Reuniões no funil — peso 20
  const pctReunioes = Math.min(100, (reunioes / FUNIL_ATIVO.mensal.comparecimentos) * 100)
  fatores.push({
    label: 'Reuniões ativas',
    valor: `${reunioes}/${FUNIL_ATIVO.mensal.comparecimentos}`,
    peso: 20,
    score: Math.round((pctReunioes / 100) * 20),
    ok: pctReunioes >= 50,
  })

  // Fator 4: HQ-only — peso 20
  const pctHq = (univ.dias_sem_externo_7d / Math.max(1, univ.dias_sem_externo_7d + univ.dias_com_externo_7d)) * 100
  fatores.push({
    label: 'HQ-only 7d',
    valor: `${univ.dias_sem_externo_7d} dias`,
    peso: 20,
    score: Math.round((pctHq / 100) * 20),
    ok: univ.dias_com_externo_7d === 0,
  })

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role: 'closer',
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: all.some(p => (p.updated_at || '').slice(0, 10) === new Date().toISOString().split('T')[0]),
    dias_ativo_7d: univ.dias_sem_externo_7d + univ.dias_com_externo_7d,
  }
}

// ─── CS (Medina) — foco: saúde da carteira + atividade ──────────
async function healthCs(email: string, nome: string): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  // Score médio das clínicas (via clinicas.score_total)
  const { data: clins } = await sb.from('clinicas').select('score_total').eq('ativo', true)
  const scores = (clins || []).map(c => Number(c.score_total || 0)).filter(s => s > 0)
  const scoreMedio = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  // Contatos registrados (7d)
  const seteAtras = new Date(); seteAtras.setDate(seteAtras.getDate() - 7)
  const { data: logs } = await sb.from('log_atividades_cs').select('created_at').eq('responsavel', email).gte('created_at', seteAtras.toISOString())
  const contatos7d = (logs || []).length

  // Fator 1: Score médio da carteira — peso 35
  fatores.push({
    label: 'Health médio da carteira',
    valor: `${scoreMedio}/100`,
    peso: 35,
    score: Math.round((scoreMedio / 100) * 35),
    ok: scoreMedio >= 70,
  })
  if (scoreMedio < 60) rec.push('Carteira em risco — focar em ações D0-D30 esta semana')

  // Fator 2: Contatos/semana (meta 20) — peso 30
  const metaCs = 20
  const pctCs = Math.min(100, (contatos7d / metaCs) * 100)
  fatores.push({
    label: 'Contatos registrados últimos 7d',
    valor: `${contatos7d}/${metaCs}`,
    peso: 30,
    score: Math.round((pctCs / 100) * 30),
    ok: contatos7d >= metaCs,
  })
  if (contatos7d < 10) rec.push('Registrar mais contatos com clínicas — mínimo 3/dia')

  // Fator 3: Tarefas concluídas — peso 15
  const { data: tarefas } = await sb.from('tarefas_jornada').select('status').eq('responsavel', 'CS').eq('status', 'concluida')
  const tarefasCon = (tarefas || []).length
  fatores.push({
    label: 'Tarefas da jornada concluídas',
    valor: String(tarefasCon),
    peso: 15,
    score: Math.min(15, Math.round(tarefasCon * 0.5)),
    ok: tarefasCon >= 30,
  })

  // Fator 4: HQ-only — peso 20
  const pctHq = (univ.dias_sem_externo_7d / Math.max(1, univ.dias_sem_externo_7d + univ.dias_com_externo_7d)) * 100
  fatores.push({
    label: 'HQ-only 7d',
    valor: `${univ.dias_sem_externo_7d} dias`,
    peso: 20,
    score: Math.round((pctHq / 100) * 20),
    ok: univ.dias_com_externo_7d === 0,
  })

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role: 'cs',
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: contatos7d > 0,
    dias_ativo_7d: univ.dias_sem_externo_7d + univ.dias_com_externo_7d,
  }
}

// ─── HEAD_TRAFFIC (Jéssica) — foco: clínicas configuradas + CPL ──
async function healthHeadTraffic(email: string, nome: string): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  const [{ data: vincs }, { data: mets }] = await Promise.all([
    sb.from('trafego_clinica').select('*'),
    sb.from('trafego_metricas').select('clinica_id, leads, investimento, cpl').gte('data', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
  ])

  const totalClins = 48
  const configuradas = (vincs || []).length
  const pctCobertura = (configuradas / totalClins) * 100
  const totalLeads = (mets || []).reduce((s, x) => s + Number(x.leads || 0), 0)
  const totalInvest = (mets || []).reduce((s, x) => s + Number(x.investimento || 0), 0)
  const cplMedio = totalLeads > 0 ? totalInvest / totalLeads : 0

  // Fator 1: Cobertura das 48 clínicas — peso 30
  fatores.push({
    label: 'Cobertura clínicas',
    valor: `${configuradas}/${totalClins}`,
    peso: 30,
    score: Math.round((pctCobertura / 100) * 30),
    ok: pctCobertura >= 80,
  })
  if (pctCobertura < 50) rec.push(`Configurar mais clínicas — ${totalClins - configuradas} ainda faltam`)

  // Fator 2: CPL médio < 15 — peso 25
  const cplOk = cplMedio > 0 && cplMedio <= 15
  fatores.push({
    label: 'CPL médio últimos 7d',
    valor: cplMedio > 0 ? `R$${cplMedio.toFixed(2)}` : '—',
    peso: 25,
    score: cplOk ? 25 : cplMedio === 0 ? 0 : Math.max(0, 25 - Math.round((cplMedio - 15) * 2)),
    ok: cplOk,
  })

  // Fator 3: Lançamentos 7d — peso 25
  const lancamentos = new Set((mets || []).map(m => (m as { data?: string }).data)).size
  fatores.push({
    label: 'Dias com lançamento 7d',
    valor: `${lancamentos}/5`,
    peso: 25,
    score: Math.round((lancamentos / 5) * 25),
    ok: lancamentos >= 5,
  })
  if (lancamentos < 3) rec.push('Lançar métricas de tráfego todo dia útil')

  // Fator 4: HQ-only — peso 20
  const pctHq = (univ.dias_sem_externo_7d / Math.max(1, univ.dias_sem_externo_7d + univ.dias_com_externo_7d)) * 100
  fatores.push({
    label: 'HQ-only 7d',
    valor: `${univ.dias_sem_externo_7d} dias`,
    peso: 20,
    score: Math.round((pctHq / 100) * 20),
    ok: univ.dias_com_externo_7d === 0,
  })

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role: 'head_traffic',
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: lancamentos > 0,
    dias_ativo_7d: lancamentos,
  }
}

// ─── COO (Luana) — foco: gestão da equipe + alertas ─────────────
async function healthCoo(email: string, nome: string): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  // Score médio da equipe (exceto Luana e Cardoso)
  const { data: users } = await sb.from('usuarios_internos').select('email').eq('ativo', true).not('role', 'in', '(admin,coo)')
  const outrosEmails = (users || []).map(u => u.email)

  // Buscar checkins de todos os outros nos últimos 7 dias
  const { data: chks } = await sb.from('checkin_diario').select('user_email, usou_externo').gte('data', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]).in('user_email', outrosEmails)
  const adocaoEquipe = outrosEmails.length > 0
    ? ((chks || []).filter(c => !c.usou_externo).length / outrosEmails.length / 5) * 100
    : 0

  // Fator 1: Adoção da equipe — peso 40
  fatores.push({
    label: 'Adoção média da equipe',
    valor: `${Math.round(adocaoEquipe)}%`,
    peso: 40,
    score: Math.round((adocaoEquipe / 100) * 40),
    ok: adocaoEquipe >= 70,
  })
  if (adocaoEquipe < 50) rec.push('Puxar conversa com colaboradores em risco — adoção baixa')

  // Fator 2: Checkin pessoal próprio — peso 20
  fatores.push({
    label: 'Seu checkin pessoal',
    valor: `${univ.dias_sem_externo_7d} dias HQ-only`,
    peso: 20,
    score: Math.round((univ.dias_sem_externo_7d / 5) * 20),
    ok: univ.dias_sem_externo_7d >= 4,
  })

  // Fator 3: Revisão do painel (proxy: checkin_hoje) — peso 20
  fatores.push({
    label: 'Revisão diária do painel',
    valor: univ.checkin_hoje ? 'sim' : 'não',
    peso: 20,
    score: univ.checkin_hoje ? 20 : 0,
    ok: univ.checkin_hoje,
  })

  // Fator 4: Alertas críticos tratados (proxy: count de alertas_clinica resolvidos últimos 7d) — peso 20
  const { data: alertasRes } = await sb.from('alertas_clinica').select('id').eq('resolvido', true).gte('resolvido_em', new Date(Date.now() - 7 * 86400000).toISOString())
  const alertasFeitos = (alertasRes || []).length
  fatores.push({
    label: 'Alertas resolvidos 7d',
    valor: String(alertasFeitos),
    peso: 20,
    score: Math.min(20, alertasFeitos * 4),
    ok: alertasFeitos >= 5,
  })

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role: 'coo',
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: univ.checkin_hoje,
    dias_ativo_7d: univ.dias_sem_externo_7d + univ.dias_com_externo_7d,
  }
}

// ─── EDITOR VÍDEO (Juan) / DESIGNER (Vinicius) — foco: entregas ──
async function healthCriativo(email: string, nome: string, role: 'editor_video' | 'designer'): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  const { data: demandas } = await sb.from('demandas_design').select('*').eq('responsavel_email', email)
  const all = demandas || []
  const mesInicio = new Date(); mesInicio.setDate(1)
  const iso = mesInicio.toISOString().split('T')[0]
  const doMes = all.filter(d => (d.criado_em || '').slice(0, 10) >= iso)

  const concluidas = doMes.filter(d => d.status === 'concluida')
  const atrasadas = all.filter(d => d.prazo_desejado && d.prazo_desejado < new Date().toISOString().split('T')[0] && !['concluida', 'cancelada'].includes(d.status))
  const abertas = all.filter(d => !['concluida', 'cancelada'].includes(d.status))

  // Fator 1: Taxa de entrega no prazo — peso 35
  const totalMes = doMes.length
  const entreguesNoPrazo = concluidas.filter(d => !d.prazo_desejado || (d.data_entrega && d.data_entrega <= d.prazo_desejado))
  const taxaPrazo = totalMes > 0 ? (entreguesNoPrazo.length / totalMes) * 100 : 100
  fatores.push({
    label: 'Taxa de entrega no prazo',
    valor: `${Math.round(taxaPrazo)}%`,
    peso: 35,
    score: Math.round((taxaPrazo / 100) * 35),
    ok: taxaPrazo >= 80,
  })
  if (taxaPrazo < 60) rec.push('Entregas atrasando — revisar prazos ou negociar prioridades')

  // Fator 2: Demandas atrasadas agora — peso 25
  const bonusAtraso = atrasadas.length === 0 ? 25 : Math.max(0, 25 - atrasadas.length * 5)
  fatores.push({
    label: 'Demandas atrasadas agora',
    valor: String(atrasadas.length),
    peso: 25,
    score: bonusAtraso,
    ok: atrasadas.length === 0,
  })
  if (atrasadas.length > 0) rec.push(`${atrasadas.length} demanda${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''} — priorizar hoje`)

  // Fator 3: Throughput (concluídas no mês) — peso 20
  const metaMes = role === 'editor_video' ? 15 : 20  // estimativa por perfil
  const pctThru = Math.min(100, (concluidas.length / metaMes) * 100)
  fatores.push({
    label: 'Entregas concluídas no mês',
    valor: `${concluidas.length}/${metaMes}`,
    peso: 20,
    score: Math.round((pctThru / 100) * 20),
    ok: concluidas.length >= metaMes * 0.8,
  })

  // Fator 4: HQ-only — peso 20
  const pctHq = (univ.dias_sem_externo_7d / Math.max(1, univ.dias_sem_externo_7d + univ.dias_com_externo_7d)) * 100
  fatores.push({
    label: 'HQ-only 7d',
    valor: `${univ.dias_sem_externo_7d} dias`,
    peso: 20,
    score: Math.round((pctHq / 100) * 20),
    ok: univ.dias_com_externo_7d === 0,
  })

  void abertas

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role,
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: doMes.some(d => (d.atualizado_em || d.criado_em || '').slice(0, 10) === new Date().toISOString().split('T')[0]),
    dias_ativo_7d: univ.dias_sem_externo_7d + univ.dias_com_externo_7d,
  }
}

// ─── ADMIN (Cardoso) — foco: visão geral do negócio ─────────────
async function healthAdmin(email: string, nome: string): Promise<HealthScore> {
  const univ = await buscarUniversais(email)
  const fatores: Fator[] = []
  const rec: string[] = []

  // Fator 1: dar exemplo — HQ only — peso 40
  fatores.push({
    label: 'Dar exemplo — HQ-only',
    valor: `${univ.dias_sem_externo_7d}/5`,
    peso: 40,
    score: Math.round((univ.dias_sem_externo_7d / 5) * 40),
    ok: univ.dias_sem_externo_7d >= 4,
  })

  // Fator 2: Passos migração próprios — peso 30
  fatores.push({
    label: 'Passos da migração concluídos',
    valor: `${univ.passos_migracao}/6`,
    peso: 30,
    score: Math.round((univ.passos_migracao / 6) * 30),
    ok: univ.passos_migracao >= 4,
  })

  // Fator 3: Checkin diário — peso 30
  fatores.push({
    label: 'Checkin do dia',
    valor: univ.checkin_hoje ? 'feito' : 'pendente',
    peso: 30,
    score: univ.checkin_hoje ? 30 : 0,
    ok: univ.checkin_hoje,
  })

  const score = fatores.reduce((s, f) => s + f.score, 0)
  return {
    email, nome, role: 'admin',
    score,
    nivel: nivelPorScore(score),
    fatores,
    recomendacoes: rec,
    executou_hoje: univ.checkin_hoje,
    dias_ativo_7d: univ.dias_sem_externo_7d + univ.dias_com_externo_7d,
  }
}

// ─── DISPATCHER ─────────────────────────────────────────────────
export async function calcularHealthScore(email: string, nome: string, role: string): Promise<HealthScore> {
  switch (role) {
    case 'sdr':          return healthSdr(email, nome)
    case 'closer':       return healthCloser(email, nome)
    case 'cs':           return healthCs(email, nome)
    case 'head_traffic': return healthHeadTraffic(email, nome)
    case 'coo':          return healthCoo(email, nome)
    case 'editor_video': return healthCriativo(email, nome, 'editor_video')
    case 'designer':     return healthCriativo(email, nome, 'designer')
    case 'admin':        return healthAdmin(email, nome)
    default:
      return {
        email, nome, role,
        score: 0,
        nivel: 'critico',
        fatores: [{ label: 'Role desconhecido', valor: role, peso: 100, score: 0, ok: false }],
        recomendacoes: ['Role não tem calculadora de health score'],
        executou_hoje: false,
        dias_ativo_7d: 0,
      }
  }
}

// ─── CÁLCULO EM LOTE ────────────────────────────────────────────
export async function calcularHealthTodos(): Promise<HealthScore[]> {
  const { data: users } = await sb.from('usuarios_internos').select('email, nome, role').eq('ativo', true).order('role')
  const lista = users || []
  const results = await Promise.all(lista.map(u => calcularHealthScore(u.email, u.nome || u.email.split('@')[0], u.role)))
  return results.sort((a, b) => b.score - a.score)
}
