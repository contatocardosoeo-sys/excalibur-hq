import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface ClienteHQ {
  id: string
  nome: string
  cs_responsavel: string
  fase: 'onboarding' | 'adocao' | 'escala'
  score_total: number
  score_adocao: number
  score_operacao: number
  score_resultado: number
  status_execucao: 'ativo' | 'travado' | 'aguardando_cliente' | 'aguardando_interno'
  ultimo_contato: string
  dias_na_etapa: number
  dias_sem_venda: number
  crm_ativo: boolean
  campanha_ativa: boolean
  leads_semana: number
  proxima_acao: string | null
  problema_detectado: string | null
  mrr: number
  ticket_medio: number
  roi: number
  total_vendas_semana: number
  adocao_crm: boolean
  adocao_responde_leads: boolean
  adocao_assiste_aulas: boolean
  adocao_planilha: boolean
  adocao_script: boolean
  adocao_reunioes: boolean
  created_at: string
  updated_at: string
}

function detectarProblema(cliente: ClienteHQ) {
  const horasSemContato = (Date.now() - new Date(cliente.ultimo_contato).getTime()) / 3600000
  if (horasSemContato > 72) return { texto: 'Sem contato +72h', nivel: 'critico' as const }
  if (horasSemContato > 48) return { texto: 'Sem contato +48h', nivel: 'critico' as const }
  if (cliente.status_execucao === 'travado') return { texto: 'Travado na etapa', nivel: 'critico' as const }
  if (!cliente.crm_ativo) return { texto: 'CRM não implementado', nivel: 'critico' as const }
  if (cliente.dias_sem_venda > 7) return { texto: `Sem venda há ${cliente.dias_sem_venda} dias`, nivel: 'alto' as const }
  if (cliente.campanha_ativa && cliente.leads_semana === 0) return { texto: 'Campanha sem lead', nivel: 'alto' as const }
  if (cliente.score_total >= 80) return { texto: 'Saudável — expandir', nivel: 'ok' as const }
  return { texto: 'Monitorar', nivel: 'medio' as const }
}

function proximaAcao(cliente: ClienteHQ) {
  if (!cliente.crm_ativo) return 'Ativar CRM hoje'
  if (cliente.dias_sem_venda > 7) return 'Revisar script comercial'
  if (cliente.campanha_ativa && cliente.leads_semana === 0) return 'Revisar criativos urgente'
  if (cliente.status_execucao === 'travado') return 'Agendar call obrigatória'
  if (cliente.score_total >= 80) return 'Propor upsell / expansão'
  return 'Agendar reunião de alinhamento'
}

export async function GET() {
  const { data: clientes, error } = await supabase
    .from('clientes_hq')
    .select('*')
    .order('score_total', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const lista = (clientes as ClienteHQ[]).map(c => ({
    ...c,
    problema: detectarProblema(c),
    acao_sugerida: c.proxima_acao || proximaAcao(c),
  }))

  // P1: Gerar alertas automaticos para clientes com problemas criticos/altos
  const alertasParaInserir = lista
    .filter(c => c.problema.nivel === 'critico' || c.problema.nivel === 'alto')
    .map(c => ({
      cliente_id: c.id,
      tipo_alerta: c.problema.texto,
      prioridade: c.problema.nivel === 'critico' ? 'critica' as const : 'alta' as const,
      descricao: `${c.nome}: ${c.problema.texto}`,
      acao_sugerida: c.acao_sugerida,
      status: 'aberto' as const,
      responsavel: c.cs_responsavel,
    }))

  if (alertasParaInserir.length > 0) {
    // Limpar alertas antigos abertos e inserir novos
    await supabase.from('alertas_sistema').delete().eq('status', 'aberto')
    await supabase.from('alertas_sistema').insert(alertasParaInserir)
  }

  const criticos = lista.filter(c => c.problema.nivel === 'critico').length
  const totalMRR = lista.reduce((sum, c) => sum + Number(c.mrr), 0)
  const avgScore = lista.length > 0 ? Math.round(lista.reduce((sum, c) => sum + c.score_total, 0) / lista.length) : 0
  const totalLeads = lista.reduce((sum, c) => sum + c.leads_semana, 0)
  const totalVendas = lista.reduce((sum, c) => sum + c.total_vendas_semana, 0)
  const avgROI = lista.length > 0 ? +(lista.reduce((sum, c) => sum + Number(c.roi), 0) / lista.length).toFixed(1) : 0

  const kpis = {
    total_clientes: lista.length,
    criticos,
    mrr_total: totalMRR,
    score_medio: avgScore,
    leads_semana: totalLeads,
    vendas_semana: totalVendas,
    roi_medio: avgROI,
  }

  const pipeline = {
    onboarding: lista.filter(c => c.fase === 'onboarding'),
    adocao: lista.filter(c => c.fase === 'adocao'),
    escala: lista.filter(c => c.fase === 'escala'),
  }

  const adocaoItems = [
    { label: 'CRM Ativo', key: 'adocao_crm' as const },
    { label: 'Responde Leads', key: 'adocao_responde_leads' as const },
    { label: 'Assiste Aulas', key: 'adocao_assiste_aulas' as const },
    { label: 'Planilha', key: 'adocao_planilha' as const },
    { label: 'Script', key: 'adocao_script' as const },
    { label: 'Reuniões', key: 'adocao_reunioes' as const },
  ]

  const adocao = adocaoItems.map(item => ({
    label: item.label,
    total: lista.length,
    aderentes: lista.filter(c => c[item.key]).length,
    percentual: lista.length > 0 ? Math.round((lista.filter(c => c[item.key]).length / lista.length) * 100) : 0,
  }))

  const alertas = lista
    .filter(c => c.problema.nivel === 'critico' || c.problema.nivel === 'alto')
    .map(c => ({
      cliente: c.nome,
      problema: c.problema.texto,
      nivel: c.problema.nivel,
      acao: c.acao_sugerida,
    }))

  return NextResponse.json({
    kpis,
    lista_acionavel: lista,
    pipeline,
    adocao,
    alertas,
  })
}
