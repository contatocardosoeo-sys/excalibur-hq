import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SDR_METAS_DIARIAS,
  SDR_METAS_MENSAIS,
  SDR_METAS_SEMANAIS,
  SDR_MINIMO_DIARIO,
  calcularMetaAjustada,
  metaPorPeriodo,
  diasUteisPassados,
  diasUteisDoMesAtual,
  TAXAS_REAIS,
  type Periodo,
} from '../../../lib/config'

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
  // ═══ FONTE ÚNICA DE VERDADE: lib/config.ts ═══
  // Meta principal: 15 agendamentos/dia → funil calculado: 1302/903/315/210/63 → R$126k
  const metaLeadsM = SDR_METAS_MENSAIS.leads
  const metaQualificadosM = SDR_METAS_MENSAIS.qualificados
  const metaAgendM = SDR_METAS_MENSAIS.agendamentos
  const metaCompM = SDR_METAS_MENSAIS.reunioes_esperadas
  const metaVendasM = SDR_METAS_MENSAIS.vendas_esperadas
  void metaRes // banco mantido apenas como log

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
    // Metas dinâmicas por período (meta principal: 15 agend/dia)
    metas: {
      leads: metaPorFiltro(metaLeadsM),
      contatos: metaPorFiltro(metaLeadsM),
      qualificados: metaPorFiltro(metaQualificadosM),
      agendamentos: metaPorFiltro(metaAgendM),
      comparecimentos: metaPorFiltro(metaCompM),
      reunioes: metaPorFiltro(metaCompM),
      vendas: metaPorFiltro(metaVendasM),
    },
    metas_mensais: {
      leads: metaLeadsM,
      contatos: metaLeadsM,
      qualificados: metaQualificadosM,
      agendamentos: metaAgendM,
      comparecimentos: metaCompM,
      reunioes_esperadas: metaCompM,
      vendas: metaVendasM,
      vendas_esperadas: metaVendasM,
      receita_esperada: SDR_METAS_MENSAIS.receita_esperada,
    },
    metas_diarias: {
      leads: SDR_METAS_DIARIAS.leads,
      contatos: SDR_METAS_DIARIAS.leads,
      qualificados: SDR_METAS_DIARIAS.qualificados,
      agendamentos: SDR_METAS_DIARIAS.agendamentos,
      comparecimentos: SDR_METAS_DIARIAS.reunioes_esperadas,
      reunioes_esperadas: SDR_METAS_DIARIAS.reunioes_esperadas,
      noshow_esperado: SDR_METAS_DIARIAS.noshow_esperado,
      vendas: SDR_METAS_DIARIAS.vendas_esperadas,
    },
    metas_semanais: SDR_METAS_SEMANAIS,
    minimo_diario: SDR_MINIMO_DIARIO,
    // Meta ajustada do dia (compensação de déficit acumulado)
    meta_ajustada: (() => {
      const agora = new Date()
      const diaUtil = diasUteisPassados(agora.getFullYear(), agora.getMonth() + 1, agora)
      const totalMes = metricasMes.reduce((s, m) => s + (m.agendamentos || 0), 0)
      return calcularMetaAjustada(
        SDR_METAS_DIARIAS.agendamentos,
        totalMes,
        Math.max(1, diaUtil),
        diasUteisDoMesAtual(),
      )
    })(),
    taxas_reais: TAXAS_REAIS,
    funil_contexto: {
      receita_meta: SDR_METAS_MENSAIS.receita_esperada,
      ticket_medio: 2000,
      investimento_mensal: Math.round(SDR_METAS_MENSAIS.leads * 10.70),
      dias_uteis_mes: diasUteisDoMesAtual(),
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

  // Estado anterior pra saber quanto cresceu (e gerar comissão só no delta)
  const { data: anterior } = await supabase
    .from('sdr_metricas_diarias')
    .select('agendamentos, comparecimentos, vendas')
    .eq('data', data)
    .eq('sdr_email', sdr_email)
    .maybeSingle()

  const novoAgend = Number(body.agendamentos) || 0
  const novoComp = Number(body.comparecimentos) || 0
  const novoVendas = Number(body.vendas) || 0

  const { data: result, error } = await supabase.from('sdr_metricas_diarias').upsert({
    data,
    sdr_email,
    leads_recebidos: Number(body.leads_recebidos) || 0,
    contatos_realizados: Number(body.contatos_realizados) || 0,
    agendamentos: novoAgend,
    comparecimentos: novoComp,
    vendas: novoVendas,
    valor_vendas: Number(body.valor_vendas) || 0,
    observacao: body.observacao || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'data,sdr_email' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gerar comissões pelo delta (não re-conta o que já tinha)
  const deltaAgend = Math.max(0, novoAgend - Number(anterior?.agendamentos || 0))
  const deltaComp = Math.max(0, novoComp - Number(anterior?.comparecimentos || 0))
  const deltaVendas = Math.max(0, novoVendas - Number(anterior?.vendas || 0))

  if (deltaAgend + deltaComp + deltaVendas > 0) {
    try {
      const { data: cfg } = await supabase
        .from('config_comissoes')
        .select('sdr_valor_agendamento, sdr_bonus_comparecimento, sdr_bonus_venda, closer_pct_venda')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .single()

      const cfgSafe = cfg || {
        sdr_valor_agendamento: 8,
        sdr_bonus_comparecimento: 12,
        sdr_bonus_venda: 40,
        closer_pct_venda: 0.05,
      }

      const d = new Date(data + 'T12:00:00')
      const mes = d.getMonth() + 1
      const ano = d.getFullYear()
      const base = {
        colaborador_email: sdr_email,
        colaborador_nome: 'Trindade',
        role: 'sdr' as const,
        mes,
        ano,
        data_evento: data,
        observacao: 'gerado via lançamento SDR',
      }

      const rows: Record<string, unknown>[] = []
      for (let i = 0; i < deltaAgend; i++) {
        rows.push({ ...base, tipo: 'agendamento', valor: Number(cfgSafe.sdr_valor_agendamento) })
      }
      for (let i = 0; i < deltaComp; i++) {
        rows.push({ ...base, tipo: 'comparecimento', valor: Number(cfgSafe.sdr_bonus_comparecimento) })
      }
      for (let i = 0; i < deltaVendas; i++) {
        rows.push({ ...base, tipo: 'venda', valor: Number(cfgSafe.sdr_bonus_venda) })
        // Closer também recebe quando venda é lançada pelo SDR
        rows.push({
          colaborador_email: 'guilherme.excalibur@gmail.com',
          colaborador_nome: 'Guilherme',
          role: 'closer',
          tipo: 'venda',
          valor: Math.round(2400 * Number(cfgSafe.closer_pct_venda)),
          mes,
          ano,
          data_evento: data,
          ticket_venda: 2400,
          observacao: 'gerado via lançamento SDR (ticket médio default)',
        })
      }

      if (rows.length > 0) {
        await supabase.from('comissoes').insert(rows)
      }
    } catch {
      /* não bloqueia lançamento */
    }
  }

  return NextResponse.json({
    success: true,
    data: result,
    delta: { agendamentos: deltaAgend, comparecimentos: deltaComp, vendas: deltaVendas },
  })
}
