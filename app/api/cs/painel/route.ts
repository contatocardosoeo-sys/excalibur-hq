import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWeekString } from '../../../lib/utils'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const now = new Date()
  const semana = getWeekString(now)
  const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const hoje = now.toISOString().split('T')[0]

  // Semana atual para calendario
  const day = now.getDay()
  const diffSeg = now.getDate() - day + (day === 0 ? -6 : 1)
  const seg = new Date(now); seg.setDate(diffSeg); seg.setHours(12, 0, 0, 0)
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6)
  const startSemana = seg.toISOString().split('T')[0]
  const endSemana = dom.toISOString().split('T')[0]

  const [clinicasR, jornadaR, adocaoR, alertasR, funilR, tarefasR, logR, receberR] = await Promise.all([
    supabase.from('clinicas').select('id, nome, plano, valor_contrato, data_inicio, cs_responsavel, ativo, cidade, estado, responsavel, whatsapp, email, foco, fase, score_total, status_execucao, mrr, dias_na_etapa').eq('ativo', true),
    supabase.from('jornada_clinica').select('clinica_id, etapa, dias_na_plataforma, data_inicio, notas, updated_at, cs_responsavel'),
    supabase.from('adocao_clinica').select('clinica_id, score, classificacao').eq('semana', semana),
    supabase.from('alertas_clinica').select('id, clinica_id, tipo, titulo, nivel, descricao, resolvido, created_at').eq('resolvido', false),
    supabase.from('funil_diario').select('clinica_id, faturamento, data').gte('data', inicioMes),
    supabase.from('tarefas_jornada').select('id, clinica_id, fase, titulo, status, bloqueante, prazo_dia, data_prazo'),
    supabase.from('log_atividades_cs').select('id, clinica_id, clinica_nome, tipo, descricao, responsavel, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('financeiro_receber').select('cliente_nome, valor, status, data_vencimento').gte('data_vencimento', inicioMes).lt('data_vencimento', `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`),
  ])

  const cl = clinicasR.data || []
  const jo = jornadaR.data || []
  const ad = adocaoR.data || []
  const al = alertasR.data || []
  const fu = funilR.data || []
  const tf = tarefasR.data || []
  const logs = logR.data || []
  const receber = receberR.data || []

  // ── Montar perfil completo de cada clinica ──
  const clientes = cl.map(c => {
    const j = jo.find(x => x.clinica_id === c.id)
    const a = ad.find(x => x.clinica_id === c.id)
    const alertas = al.filter(x => x.clinica_id === c.id)
    const fat = fu.filter(x => x.clinica_id === c.id).reduce((s, d) => s + Number(d.faturamento || 0), 0)
    const tarefas = tf.filter(x => x.clinica_id === c.id)
    const tarefasPendentes = tarefas.filter(t => t.status === 'pendente')
    const tarefasBloqueantes = tarefasPendentes.filter(t => t.bloqueante)
    const ultimaAcao = j?.updated_at || null
    const diasSemAcao = ultimaAcao ? Math.floor((now.getTime() - new Date(ultimaAcao).getTime()) / 86400000) : 999
    // Score: usar primeiro de adocao_clinica (semanal), fallback para clinicas.score_total
    const score = a?.score || (c as { score_total?: number }).score_total || 0

    return {
      id: c.id,
      nome: c.nome,
      plano: c.plano,
      valor_contrato: Number(c.valor_contrato || 0),
      cidade: c.cidade,
      estado: c.estado,
      responsavel: c.responsavel,
      whatsapp: c.whatsapp,
      email: c.email,
      foco: c.foco,
      cs_responsavel: j?.cs_responsavel || c.cs_responsavel || 'Bruno Medina',
      etapa: j?.etapa || (c as { fase?: string }).fase || 'N/A',
      dias_na_plataforma: j?.dias_na_plataforma || (c as { dias_na_etapa?: number }).dias_na_etapa || 0,
      data_inicio: j?.data_inicio || c.data_inicio,
      score,
      classificacao: a?.classificacao || (score >= 80 ? 'SAUDAVEL' : score >= 60 ? 'ATENCAO' : 'RISCO'),
      alertas_count: alertas.length,
      alertas_criticos: alertas.filter(x => x.nivel === 3).length,
      faturamento_mes: fat,
      tarefas_total: tarefas.length,
      tarefas_pendentes: tarefasPendentes.length,
      tarefas_bloqueantes: tarefasBloqueantes.length,
      ultima_acao: ultimaAcao,
      dias_sem_acao: diasSemAcao,
      notas: j?.notas || null,
    }
  }).sort((a, b) => a.score - b.score) // risco primeiro

  // ── KPIs ──
  const totalAtivos = clientes.length
  const emRisco = clientes.filter(c => c.score < 60).length
  const emAtencao = clientes.filter(c => c.score >= 60 && c.score < 80).length
  const saudaveis = clientes.filter(c => c.score >= 80).length
  const semInteracao = clientes.filter(c => c.dias_sem_acao >= 5).length
  const alertasCriticos = al.filter(a => a.nivel === 3).length
  const alertasTotal = al.length
  const scoreMedio = totalAtivos > 0 ? Math.round(clientes.reduce((s, c) => s + c.score, 0) / totalAtivos) : 0
  const faturamentoTotal = clientes.reduce((s, c) => s + c.faturamento_mes, 0)
  const mrrTotal = clientes.reduce((s, c) => s + c.valor_contrato, 0)

  // Tarefas da semana
  const tarefasSemana = []
  for (const c of cl) {
    const tarefasC = tf.filter(t => t.clinica_id === c.id)
    for (const t of tarefasC) {
      let dp = t.data_prazo
      if (!dp && t.prazo_dia && c.data_inicio) {
        const d = new Date(c.data_inicio + 'T12:00:00')
        d.setDate(d.getDate() + t.prazo_dia)
        dp = d.toISOString().split('T')[0]
      }
      if (dp && dp >= startSemana && dp <= endSemana) {
        tarefasSemana.push({ ...t, clinica_nome: c.nome, data_prazo: dp })
      }
    }
  }
  tarefasSemana.sort((a, b) => (a.data_prazo || '').localeCompare(b.data_prazo || ''))

  // Proximas acoes obrigatorias
  const acoes: Array<{ clinica_id: string; clinica_nome: string; motivo: string; tipo: string; urgencia: number }> = []
  for (const c of clientes) {
    if (c.score < 60 && c.dias_sem_acao >= 3) {
      acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: `Score ${c.score} — sem acao ha ${c.dias_sem_acao} dias`, tipo: 'risco', urgencia: 1 })
    }
    if (c.tarefas_bloqueantes > 0) {
      acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: `${c.tarefas_bloqueantes} tarefa(s) bloqueante(s) pendente(s)`, tipo: 'bloqueante', urgencia: 2 })
    }
    if (c.dias_na_plataforma <= 7 && c.data_inicio) {
      const diasDesdeInicio = Math.floor((now.getTime() - new Date(c.data_inicio + 'T12:00:00').getTime()) / 86400000)
      if (diasDesdeInicio > 7) {
        acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: 'Travada no onboarding ha mais de 7 dias', tipo: 'onboarding', urgencia: 3 })
      }
    }
    const dias = c.dias_na_plataforma
    if (Math.abs(dias - 15) <= 3 && dias < 15) acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: 'Proximo do marco D15 — preparar reuniao', tipo: 'marco', urgencia: 4 })
    if (Math.abs(dias - 30) <= 3 && dias < 30) acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: 'Proximo do marco D30 — avaliar resultados', tipo: 'marco', urgencia: 4 })
    if (c.alertas_criticos > 0) {
      acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: `${c.alertas_criticos} alerta(s) critico(s)`, tipo: 'critico', urgencia: 0 })
    }
  }
  acoes.sort((a, b) => a.urgencia - b.urgencia)

  // Financeiro — inadimplentes
  const atrasados = receber.filter(r => r.status === 'atrasado' || (r.status === 'pendente' && r.data_vencimento < hoje))

  // Distribuicao por etapa
  const etapas: Record<string, number> = {}
  clientes.forEach(c => { etapas[c.etapa] = (etapas[c.etapa] || 0) + 1 })

  return NextResponse.json({
    kpis: {
      total_ativos: totalAtivos,
      em_risco: emRisco,
      em_atencao: emAtencao,
      saudaveis,
      sem_interacao: semInteracao,
      alertas_criticos: alertasCriticos,
      alertas_total: alertasTotal,
      score_medio: scoreMedio,
      faturamento_mes: faturamentoTotal,
      mrr_total: mrrTotal,
      tarefas_semana: tarefasSemana.length,
      tarefas_bloqueantes: tarefasSemana.filter(t => t.bloqueante).length,
    },
    clientes,
    tarefas_semana: tarefasSemana,
    acoes,
    alertas: al,
    log_recente: logs,
    atrasados_financeiro: atrasados,
    distribuicao_etapas: etapas,
  })
}
