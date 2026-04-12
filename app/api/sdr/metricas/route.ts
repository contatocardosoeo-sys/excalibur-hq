import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FUNIL_METAS, metaPorPeriodo, type Periodo } from '../../../lib/metas-funil'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const sdr_email = req.nextUrl.searchParams.get('email') || 'trindade.excalibur@gmail.com'
  const periodo = req.nextUrl.searchParams.get('periodo') || 'mes' // hoje | semana | mes | personalizado
  const startParam = req.nextUrl.searchParams.get('start')
  const endParam = req.nextUrl.searchParams.get('end')

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()
  const hoje = now.toISOString().split('T')[0]

  // Calcular range conforme periodo
  let dataInicio: string
  let dataFim: string

  if (periodo === 'personalizado' && startParam && endParam) {
    dataInicio = startParam
    dataFim = endParam
  } else if (periodo === 'hoje') {
    dataInicio = hoje
    dataFim = hoje
  } else if (periodo === 'semana') {
    const seg = new Date(now)
    const day = seg.getDay()
    const diff = seg.getDate() - day + (day === 0 ? -6 : 1)
    seg.setDate(diff)
    dataInicio = seg.toISOString().split('T')[0]
    dataFim = hoje
  } else {
    // mes
    dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    dataFim = hoje
  }

  // Para query: lt fim+1
  const fimQuery = new Date(dataFim + 'T12:00:00')
  fimQuery.setDate(fimQuery.getDate() + 1)
  const ltFim = fimQuery.toISOString().split('T')[0]

  const [metricasRes, metaRes, mesRes] = await Promise.all([
    supabase.from('sdr_metricas_diarias').select('*').eq('sdr_email', sdr_email).gte('data', dataInicio).lt('data', ltFim).order('data', { ascending: true }),
    supabase.from('metas_sdr').select('*').eq('sdr_email', sdr_email).eq('mes', mes).eq('ano', ano).single(),
    supabase.from('sdr_metricas_diarias').select('*').eq('sdr_email', sdr_email).gte('data', `${ano}-${String(mes).padStart(2, '0')}-01`).order('data', { ascending: true }),
  ])

  const metricas = metricasRes.data || []
  const metricasMes = mesRes.data || []
  // ═══ FONTE ÚNICA DE VERDADE: lib/metas-funil.ts (nível ALVO = R$90k) ═══
  // Valores calculados a partir da meta de receita, não mais hardcoded:
  // leads=879, qualificados=615, agendamentos=215, comparec=150, vendas=45
  const FUNIL = FUNIL_METAS.alvo
  const metaLeadsM = FUNIL.mensal.leads
  const metaContatosM = FUNIL.mensal.leads  // contatos = leads (100%)
  const metaAgendM = FUNIL.mensal.agendamentos
  const metaCompM = FUNIL.mensal.comparecimentos
  const metaVendasM = FUNIL.mensal.vendas
  // _meta (da tabela banco) mantido apenas como referência para futuras overrides
  void metaRes // ignorar linting

  const diasRangeMs = new Date(dataFim + 'T12:00:00').getTime() - new Date(dataInicio + 'T12:00:00').getTime()
  const diasRange = Math.max(1, Math.round(diasRangeMs / 86400000) + 1)

  function metaPorFiltro(metaMensal: number): number {
    return metaPorPeriodo(metaMensal, periodo as Periodo, diasRange)
  }

  // Acumulados do periodo selecionado
  const totalLeads = metricas.reduce((s, m) => s + (m.leads_recebidos || 0), 0)
  const totalContatos = metricas.reduce((s, m) => s + (m.contatos_realizados || 0), 0)
  const totalAgendamentos = metricas.reduce((s, m) => s + (m.agendamentos || 0), 0)
  const totalComparecimentos = metricas.reduce((s, m) => s + (m.comparecimentos || 0), 0)
  const totalVendas = metricas.reduce((s, m) => s + (m.vendas || 0), 0)
  const totalValorVendas = metricas.reduce((s, m) => s + Number(m.valor_vendas || 0), 0)

  const metricaHoje = metricasMes.find(m => m.data === hoje) || null

  const taxaContato = totalLeads > 0 ? Math.round((totalContatos / totalLeads) * 100) : 0
  const taxaAgendamento = totalContatos > 0 ? Math.round((totalAgendamentos / totalContatos) * 100) : 0
  const taxaComparecimento = totalAgendamentos > 0 ? Math.round((totalComparecimentos / totalAgendamentos) * 100) : 0
  const taxaConversao = totalComparecimentos > 0 ? Math.round((totalVendas / totalComparecimentos) * 100) : 0

  return NextResponse.json({
    periodo,
    range: { start: dataInicio, end: dataFim },
    metricas_dia: metricaHoje,
    metricas_mes: metricasMes,
    metricas_periodo: metricas,
    acumulado: {
      leads: totalLeads,
      contatos: totalContatos,
      agendamentos: totalAgendamentos,
      comparecimentos: totalComparecimentos,
      vendas: totalVendas,
      valor_vendas: totalValorVendas,
    },
    taxas: {
      contato: taxaContato,
      agendamento: taxaAgendamento,
      comparecimento: taxaComparecimento,
      conversao: taxaConversao,
    },
    // Metas dinâmicas por período (vêm de FUNIL_METAS.alvo)
    metas: {
      leads: metaPorFiltro(metaLeadsM),
      contatos: metaPorFiltro(metaContatosM),
      qualificados: metaPorFiltro(FUNIL.mensal.qualificados),
      agendamentos: metaPorFiltro(metaAgendM),
      comparecimentos: metaPorFiltro(metaCompM),
      vendas: metaPorFiltro(metaVendasM),
    },
    // Metas mensais (referência total)
    metas_mensais: {
      leads: metaLeadsM,
      contatos: metaContatosM,
      qualificados: FUNIL.mensal.qualificados,
      agendamentos: metaAgendM,
      comparecimentos: metaCompM,
      vendas: metaVendasM,
    },
    // Metas diárias (direto do FUNIL — pra botão "Hoje / meta X")
    metas_diarias: {
      leads: FUNIL.diario.leads,
      contatos: FUNIL.diario.leads,
      agendamentos: FUNIL.diario.agendamentos,
      comparecimentos: FUNIL.diario.comparecimentos,
      vendas: FUNIL.diario.vendas,
    },
    // Metas semanais (direto do FUNIL)
    metas_semanais: {
      leads: FUNIL.semanal.leads,
      contatos: FUNIL.semanal.leads,
      agendamentos: FUNIL.semanal.agendamentos,
      comparecimentos: FUNIL.semanal.comparecimentos,
      vendas: FUNIL.semanal.vendas,
    },
    // Contexto do funil (receita/cac/invest) pra card visual
    funil_contexto: {
      receita_meta: FUNIL.receita,
      ticket_medio: 2000,
      investimento_mensal: FUNIL.custos.investimento_mensal,
      cac: FUNIL.custos.cac,
      custo_reuniao: FUNIL.custos.custo_reuniao,
    },
    // Acumulado TOTAL do mês (pra mostrar nas referências mesmo filtrando "hoje")
    acumulado_mes: {
      leads: metricasMes.reduce((s, m) => s + (m.leads_recebidos || 0), 0),
      contatos: metricasMes.reduce((s, m) => s + (m.contatos_realizados || 0), 0),
      agendamentos: metricasMes.reduce((s, m) => s + (m.agendamentos || 0), 0),
      comparecimentos: metricasMes.reduce((s, m) => s + (m.comparecimentos || 0), 0),
      vendas: metricasMes.reduce((s, m) => s + (m.vendas || 0), 0),
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = body.data || new Date().toISOString().split('T')[0]
  const sdr_email = body.sdr_email || 'trindade.excalibur@gmail.com'

  const { data: result, error } = await supabase.from('sdr_metricas_diarias').upsert({
    data,
    sdr_email,
    leads_recebidos: Number(body.leads_recebidos) || 0,
    contatos_realizados: Number(body.contatos_realizados) || 0,
    agendamentos: Number(body.agendamentos) || 0,
    comparecimentos: Number(body.comparecimentos) || 0,
    vendas: Number(body.vendas) || 0,
    valor_vendas: Number(body.valor_vendas) || 0,
    observacao: body.observacao || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'data,sdr_email' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: result })
}
