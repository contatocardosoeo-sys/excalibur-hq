import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const BASELINE = { cpl: 10.68, agendamento: 35.25, comparecimento: 71.30, qualificacao: 82.56, conversao: 24.09, cac: 188.94 }

function classificar(valor: number, tipo: string): { cor: string; status: string; emoji: string } {
  const r: Record<string, [number, number][]> = {
    agendamento: [[35, 30]], comparecimento: [[70, 65]], qualificacao: [[75, 65]], conversao: [[24, 20]],
    cac_inv: [[200, 300]], cpl_inv: [[12, 15]],
  }
  const lim = r[tipo]
  if (!lim) return { cor: '#6b7280', status: 'neutro', emoji: '⚪' }
  const [l] = lim
  if (tipo.endsWith('_inv')) {
    if (valor <= l[0]) return { cor: '#22c55e', status: 'verde', emoji: '🟢' }
    if (valor <= l[1]) return { cor: '#f59e0b', status: 'amarelo', emoji: '🟡' }
    return { cor: '#ef4444', status: 'vermelho', emoji: '🔴' }
  }
  if (valor >= l[0]) return { cor: '#22c55e', status: 'verde', emoji: '🟢' }
  if (valor >= l[1]) return { cor: '#f59e0b', status: 'amarelo', emoji: '🟡' }
  return { cor: '#ef4444', status: 'vermelho', emoji: '🔴' }
}

const ACOES: Record<string, Record<string, string[]>> = {
  agendamento: {
    vermelho: ['Prioridade total em SDR', 'Revisar tempo de resposta ao lead', 'Auditar conversas das ultimas 24h', 'Ajustar script inicial', 'Implementar follow-ups obrigatorios', 'Suspender escala de trafego'],
    amarelo: ['Roleplay com SDR', 'Ajustar CTA das mensagens', 'Melhorar urgencia na abordagem'],
    verde: ['Manter processo atual', 'Escalar trafego com seguranca'],
  },
  comparecimento: {
    vermelho: ['Confirmacao D-1 e D-0 obrigatoria', 'Audio personalizado pre-reuniao', 'Reforco de escassez', 'Revisar promessa vs entrega'],
    amarelo: ['Melhorar lembretes automaticos', 'Reduzir tempo entre agendamento e reuniao'],
    verde: ['Escalar volume de agendamentos'],
  },
  conversao: {
    vermelho: ['Revisar gravacoes das calls', 'Ajustar oferta e ancoragem', 'Mapear objecoes recorrentes'],
    amarelo: ['Refinar script de fechamento', 'Treinar tecnicas de fechamento'],
    verde: ['Escalar reunioes com confianca'],
  },
  cac: { vermelho: ['NAO aumentar trafego', 'Corrigir gargalo interno primeiro'], amarelo: ['Otimizar campanhas de menor ROI'], verde: ['Escalar investimento'] },
  cpl: { vermelho: ['Trocar criativos', 'Revisar segmentacao'], amarelo: ['Otimizar campanhas', 'A/B test criativos'], verde: ['Escalar investimento'] },
}

function calcularFunil(invest: number, leads: number, agend: number, reun: number, qual: number, fech: number, fat: number, dias: number) {
  const cpl = leads > 0 ? invest / leads : 0
  const txAgend = leads > 0 ? (agend / leads) * 100 : 0
  const txComp = agend > 0 ? (reun / agend) * 100 : 0
  const txQual = reun > 0 ? (qual / reun) * 100 : 0
  const txConv = qual > 0 ? (fech / qual) * 100 : 0
  const cac = fech > 0 ? invest / fech : 0
  const custoAgend = agend > 0 ? invest / agend : 0
  const custoReuniao = reun > 0 ? invest / reun : 0
  const receitaLead = leads > 0 ? fat / leads : 0
  const receitaReuniao = reun > 0 ? fat / reun : 0
  const ticketMedio = fech > 0 ? fat / fech : 0
  const roas = invest > 0 ? fat / invest : 0
  const leadsDia = dias > 0 ? Math.round(leads / dias * 10) / 10 : 0
  const agendDia = dias > 0 ? Math.round(agend / dias * 10) / 10 : 0
  const reunioesDia = dias > 0 ? Math.round(reun / dias * 10) / 10 : 0
  const vendasDia = dias > 0 ? Math.round(fech / dias * 10) / 10 : 0

  const diagAgend = classificar(txAgend, 'agendamento')
  const diagComp = classificar(txComp, 'comparecimento')
  const diagQual = classificar(txQual, 'qualificacao')
  const diagConv = classificar(txConv, 'conversao')
  const diagCac = classificar(cac, 'cac_inv')
  const diagCpl = classificar(cpl, 'cpl_inv')

  const etapas = [
    { nome: 'Leads', valor: leads, custo: cpl, custoLabel: 'CPL', taxa: null, diag: diagCpl, baseline: BASELINE.cpl },
    { nome: 'Agendamentos', valor: agend, custo: custoAgend, custoLabel: 'Custo/agend', taxa: Math.round(txAgend * 100) / 100, diag: diagAgend, baseline: BASELINE.agendamento },
    { nome: 'Reunioes', valor: reun, custo: custoReuniao, custoLabel: 'Custo/reuniao', taxa: Math.round(txComp * 100) / 100, diag: diagComp, baseline: BASELINE.comparecimento },
    { nome: 'Qualificadas', valor: qual, custo: null, custoLabel: null, taxa: Math.round(txQual * 100) / 100, diag: diagQual, baseline: BASELINE.qualificacao },
    { nome: 'Fechamentos', valor: fech, custo: cac, custoLabel: 'CAC', taxa: Math.round(txConv * 100) / 100, diag: diagConv, baseline: BASELINE.conversao },
    { nome: 'Faturamento', valor: fat, custo: null, custoLabel: null, taxa: null, diag: null, baseline: null },
  ]

  const alertas: string[] = []
  if (diagAgend.status === 'vermelho') alertas.push('GARGALO: Agendamento critico (' + txAgend.toFixed(1) + '%)')
  if (diagComp.status === 'vermelho') alertas.push('GARGALO: Comparecimento abaixo (' + txComp.toFixed(1) + '%)')
  if (diagConv.status === 'vermelho') alertas.push('GARGALO: Conversao critica (' + txConv.toFixed(1) + '%)')
  if (diagCac.status === 'vermelho') alertas.push('GARGALO: CAC acima de R$300 (R$' + cac.toFixed(0) + ')')

  let gargalo = null
  if (diagAgend.status === 'vermelho') gargalo = { nome: 'Agendamento', taxa: txAgend, status: 'vermelho', acoes: ACOES.agendamento.vermelho }
  else if (diagComp.status === 'vermelho') gargalo = { nome: 'Comparecimento', taxa: txComp, status: 'vermelho', acoes: ACOES.comparecimento.vermelho }
  else if (diagConv.status === 'vermelho') gargalo = { nome: 'Conversao', taxa: txConv, status: 'vermelho', acoes: ACOES.conversao.vermelho }
  else if (diagAgend.status === 'amarelo') gargalo = { nome: 'Agendamento', taxa: txAgend, status: 'amarelo', acoes: ACOES.agendamento.amarelo }

  const decisoes = [
    { metrica: 'Agendamento', valor: txAgend, ...diagAgend, acoes: ACOES.agendamento[diagAgend.status] || [], baseline: BASELINE.agendamento, unidade: '%' },
    { metrica: 'Comparecimento', valor: txComp, ...diagComp, acoes: ACOES.comparecimento[diagComp.status] || [], baseline: BASELINE.comparecimento, unidade: '%' },
    { metrica: 'Conversao', valor: txConv, ...diagConv, acoes: ACOES.conversao[diagConv.status] || [], baseline: BASELINE.conversao, unidade: '%' },
    { metrica: 'CAC', valor: cac, ...diagCac, acoes: ACOES.cac[diagCac.status] || [], baseline: BASELINE.cac, unidade: 'R$' },
    { metrica: 'CPL', valor: cpl, ...diagCpl, acoes: ACOES.cpl[diagCpl.status] || [], baseline: BASELINE.cpl, unidade: 'R$' },
  ]

  const resumoParts: string[] = []
  if (diagCpl.status === 'verde') resumoParts.push('CPL saudavel (R$' + cpl.toFixed(2) + ').')
  else resumoParts.push('CPL em ' + diagCpl.status + ' (R$' + cpl.toFixed(2) + ').')
  if (diagAgend.status === 'vermelho') resumoParts.push('Gargalo principal: agendamento (' + txAgend.toFixed(1) + '%) abaixo da media 35%.')
  if (diagCac.status === 'vermelho') resumoParts.push('CAC acima do limite (R$' + cac.toFixed(0) + '). Corrigir funil antes de escalar.')
  if (diagConv.status === 'verde') resumoParts.push('Fechamento estavel.')
  resumoParts.push('Prioridade: 1) Agendamento 2) Comparecimento 3) Conversao 4) Trafego.')

  return {
    etapas, alertas, gargalo, decisoes, resumo: resumoParts.join(' '),
    metricas: { cpl, txAgend, txComp, txQual, txConv, cac, custoAgend, custoReuniao, receitaLead, receitaReuniao, ticketMedio, roas },
    diario: { leadsDia, agendDia, reunioesDia, vendasDia, metaReunioesDia: 10 },
  }
}

export async function GET(req: NextRequest) {
  const de = req.nextUrl.searchParams.get('de')
  const ate = req.nextUrl.searchParams.get('ate')
  const periodo = req.nextUrl.searchParams.get('periodo') // hoje, 7d, 14d, 30d, mes, custom

  const { data: metas } = await supabase.from('metas_trafego').select('*').order('nome')

  let dataInicio: string
  let dataFim: string
  const hoje = new Date().toISOString().split('T')[0]

  if (de && ate) {
    dataInicio = de; dataFim = ate
  } else if (periodo === 'hoje') {
    dataInicio = hoje; dataFim = hoje
  } else if (periodo === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 6); dataInicio = d.toISOString().split('T')[0]; dataFim = hoje
  } else if (periodo === '14d') {
    const d = new Date(); d.setDate(d.getDate() - 13); dataInicio = d.toISOString().split('T')[0]; dataFim = hoje
  } else {
    // Default: mês atual
    const now = new Date()
    dataInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    dataFim = hoje
  }

  // Buscar dados de TODAS as fontes em paralelo
  const [{ data: inputDiario }, { data: rows }, { data: leadsSDR }, { data: pipeCloser }] = await Promise.all([
    // Fonte principal: input_diario (cada pessoa preenche seus números)
    supabase.from('input_diario').select('*').gte('data', dataInicio).lte('data', dataFim).order('data'),
    // Fonte legada: funil_trafego_diario (fallback)
    supabase.from('funil_trafego_diario').select('*').gte('data', dataInicio).lte('data', dataFim).order('data'),
    // Fonte SDR (fallback para agendamentos/reuniões)
    supabase.from('leads_sdr').select('id, status, created_at, updated_at'),
    // Fonte Closer (fallback para fechamentos/faturamento)
    supabase.from('pipeline_closer').select('id, status, mrr_proposto, created_at, data_fechamento'),
  ])

  const inputs = inputDiario || []
  const dias = rows || []

  // Se tem input_diario, usar como fonte principal (consolidado de todas as pessoas)
  const temInput = inputs.length > 0
  const numDias = temInput ? [...new Set(inputs.map(i => i.data))].length : (dias.length || 1)

  const inputAgregado = inputs.reduce((acc, d) => ({
    investimento: acc.investimento + Number(d.investimento || 0),
    leads: acc.leads + (d.leads || 0),
    agendamentos: acc.agendamentos + (d.agendamentos || 0),
    reunioes_realizadas: acc.reunioes_realizadas + (d.reunioes_realizadas || 0),
    reunioes_qualificadas: acc.reunioes_qualificadas + (d.reunioes_qualificadas || 0),
    fechamentos: acc.fechamentos + (d.fechamentos || 0),
    faturamento: acc.faturamento + Number(d.faturamento || 0),
  }), { investimento: 0, leads: 0, agendamentos: 0, reunioes_realizadas: 0, reunioes_qualificadas: 0, fechamentos: 0, faturamento: 0 })

  // Fallback legado
  const trafego = dias.reduce((acc, d) => ({
    investimento: acc.investimento + Number(d.investimento || 0),
    leads: acc.leads + (d.leads || 0),
  }), { investimento: 0, leads: 0 })

  // Contar dados reais do SDR (leads que passaram por cada etapa)
  const allLeads = leadsSDR || []
  const agendados = allLeads.filter(l => ['agendado', 'reuniao_feita', 'convertido'].includes(l.status)).length
  const reunioes = allLeads.filter(l => ['reuniao_feita', 'convertido'].includes(l.status)).length
  const qualificadas = reunioes // por enquanto igual

  // Contar dados reais do Closer
  const allPipe = pipeCloser || []
  const fechamentos = allPipe.filter(p => p.status === 'fechado').length
  const faturamento = allPipe.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  // Se tem dados do input diário OU dados dos kanbans, calcular
  const temDados = dias.length > 0 || allLeads.length > 0 || allPipe.length > 0

  if (!temDados) {
    // Fallback: funil mensal legado
    const mes = Number(req.nextUrl.searchParams.get('mes')) || new Date().getMonth() + 1
    const ano = Number(req.nextUrl.searchParams.get('ano')) || new Date().getFullYear()
    const { data: funilMes } = await supabase.from('funil_trafego').select('*').eq('mes', mes).eq('ano', ano).single()
    if (funilMes) {
      const r = calcularFunil(Number(funilMes.investimento_total), funilMes.leads, funilMes.agendamentos, funilMes.reunioes_realizadas, funilMes.reunioes_qualificadas, funilMes.fechamentos, Number(funilMes.faturamento), 22)
      return NextResponse.json({
        ...r, funil: funilMes, metas: metas || [], periodo: { de: dataInicio, ate: dataFim, dias: 22, tipo: 'mensal_fallback' },
        dadosDiarios: [], fontes: { trafego: false, sdr: false, closer: false },
        metasOps: {
          minima: { faturamento: 74000, vendas: 37, reunioes: 153, agendamentos: 215, leads: 610, leadsDia: 28, agendDia: 10, reunioesDia: 7, vendasDia: 2 },
          normal: { faturamento: 90000, vendas: 45, reunioes: 187, agendamentos: 262, leads: 743, leadsDia: 34, agendDia: 12, reunioesDia: 9, vendasDia: 2 },
          super:  { faturamento: 106000, vendas: 53, reunioes: 220, agendamentos: 308, leads: 874, leadsDia: 40, agendDia: 14, reunioesDia: 10, vendasDia: 3 },
        },
      })
    }
    return NextResponse.json({ funil: null, metas: metas || [], periodo: { de: dataInicio, ate: dataFim, dias: 0, tipo: 'vazio' } })
  }

  // Prioridade: input_diario > funil_trafego_diario > kanban SDR/Closer
  const totais = temInput ? {
    investimento: inputAgregado.investimento,
    leads: inputAgregado.leads,
    agendamentos: inputAgregado.agendamentos || agendados,
    reunioes_realizadas: inputAgregado.reunioes_realizadas || reunioes,
    reunioes_qualificadas: inputAgregado.reunioes_qualificadas || qualificadas,
    fechamentos: inputAgregado.fechamentos || fechamentos,
    faturamento: inputAgregado.faturamento || faturamento,
  } : {
    investimento: trafego.investimento,
    leads: trafego.leads > 0 ? trafego.leads : allLeads.length,
    agendamentos: agendados,
    reunioes_realizadas: reunioes,
    reunioes_qualificadas: qualificadas,
    fechamentos,
    faturamento,
  }

  const r = calcularFunil(totais.investimento, totais.leads, totais.agendamentos, totais.reunioes_realizadas, totais.reunioes_qualificadas, totais.fechamentos, totais.faturamento, numDias)

  return NextResponse.json({
    ...r, funil: totais, metas: metas || [],
    periodo: { de: dataInicio, ate: dataFim, dias: numDias, tipo: periodo || 'mes' },
    fontes: { trafego: dias.length > 0, sdr: allLeads.length > 0, closer: allPipe.length > 0, leadsSDR: allLeads.length, pipeCloser: allPipe.length },
    dadosDiarios: dias,
    metasOps: {
      minima: { faturamento: 74000, vendas: 37, reunioes: 153, agendamentos: 215, leads: 610, leadsDia: 28, agendDia: 10, reunioesDia: 7, vendasDia: 2 },
      normal: { faturamento: 90000, vendas: 45, reunioes: 187, agendamentos: 262, leads: 743, leadsDia: 34, agendDia: 12, reunioesDia: 9, vendasDia: 2 },
      super:  { faturamento: 106000, vendas: 53, reunioes: 220, agendamentos: 308, leads: 874, leadsDia: 40, agendDia: 14, reunioesDia: 10, vendasDia: 3 },
    },
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()

  // Se tem campo 'data', é inserção diária
  if (body.data) {
    const { data: d, ...campos } = body
    const { data, error } = await supabase.from('funil_trafego_diario')
      .upsert({ data: d, ...campos }, { onConflict: 'data' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  }

  // Senão, é atualização do funil mensal (legado)
  const { mes, ano, ...dados } = body
  dados.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('funil_trafego')
    .upsert({ mes: mes || new Date().getMonth() + 1, ano: ano || new Date().getFullYear(), ...dados }, { onConflict: 'mes,ano' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
