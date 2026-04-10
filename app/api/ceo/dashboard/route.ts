import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const now = new Date()
  const mesAtual = now.getMonth() + 1
  const anoAtual = now.getFullYear()
  const diaDoMes = now.getDate()
  const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate()
  const diasRestantes = diasNoMes - diaDoMes

  const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
  const fimMes = mesAtual === 12 ? `${anoAtual + 1}-01-01` : `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`
  const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1
  const anoAnt = mesAtual === 1 ? anoAtual - 1 : anoAtual
  const inicioMesAnt = `${anoAnt}-${String(mesAnt).padStart(2, '0')}-01`

  const [receber, pagar, receberAnt, pagarAnt, clinicas, leads, pipeline, metas_sdr, metas_closer, adocao, alertas, inputDiario, funilTrafego, funilMensal] = await Promise.all([
    supabase.from('financeiro_receber').select('valor, status, data_vencimento').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    supabase.from('financeiro_pagar').select('valor, status').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    supabase.from('financeiro_receber').select('valor, status').gte('data_vencimento', inicioMesAnt).lt('data_vencimento', inicioMes),
    supabase.from('financeiro_pagar').select('valor, status').gte('data_vencimento', inicioMesAnt).lt('data_vencimento', inicioMes),
    supabase.from('clinicas').select('id, nome, valor_contrato, ativo').eq('ativo', true),
    supabase.from('leads_sdr').select('id, status, created_at'),
    supabase.from('pipeline_closer').select('id, status, mrr_proposto, updated_at'),
    supabase.from('metas_sdr').select('*').eq('mes', mesAtual).eq('ano', anoAtual).maybeSingle(),
    supabase.from('metas_closer').select('*').eq('mes', mesAtual).eq('ano', anoAtual).maybeSingle(),
    supabase.from('adocao_clinica').select('clinica_id, score').order('created_at', { ascending: false }),
    supabase.from('alertas_clinica').select('id, nivel, resolvido').eq('resolvido', false),
    // Fonte principal do funil: input_diario (igual /api/trafego/funil)
    supabase.from('input_diario').select('*').gte('data', inicioMes).lt('data', fimMes),
    // Fallback legado (diário)
    supabase.from('funil_trafego_diario').select('*').gte('data', inicioMes).lt('data', fimMes),
    // Fallback mensal agregado (ultima fonte da verdade)
    supabase.from('funil_trafego').select('*').eq('mes', mesAtual).eq('ano', anoAtual).maybeSingle(),
  ])

  const r = receber.data || []
  const p = pagar.data || []
  const rAnt = receberAnt.data || []
  const pAnt = pagarAnt.data || []
  const cl = clinicas.data || []
  const ld = leads.data || []
  const pl = pipeline.data || []
  const ad = adocao.data || []
  const al = alertas.data || []

  // Financeiro
  const totalReceber = r.reduce((s, i) => s + Number(i.valor), 0)
  const recebido = r.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const totalPagar = p.reduce((s, i) => s + Number(i.valor), 0)
  const pago = p.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const caixa = recebido - pago
  const recebidoAnt = rAnt.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const pagoAntVal = pAnt.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)

  const metaMes = totalReceber
  const pctMes = metaMes > 0 ? Math.round((recebido / metaMes) * 100 * 10) / 10 : 0
  const mediaDia = diaDoMes > 0 ? recebido / diaDoMes : 0
  const projecao = diaDoMes > 0 ? (recebido / diaDoMes) * diasNoMes : 0
  const precisaDia = diasRestantes > 0 ? (metaMes - recebido) / diasRestantes : 0

  const receita = {
    dia: Math.round(mediaDia),
    meta_dia: Math.round(metaMes / 22),
    gap_dia: Math.round(mediaDia - metaMes / 22),
    pct_dia: Math.round(metaMes / 22 > 0 ? (mediaDia / (metaMes / 22)) * 100 : 0),
    mes: recebido,
    meta_mes: metaMes,
    gap_mes: Math.round(metaMes - recebido),
    pct_mes: pctMes,
    media_dia: Math.round(mediaDia),
    projecao: Math.round(projecao),
    dias_restantes: diasRestantes,
    precisa_dia: Math.round(precisaDia),
  }

  // Funil — fonte primaria: input_diario (agregado por todas as pessoas no mes)
  //         fallback: funil_trafego_diario → senao kanbans SDR/Closer
  const inputs = inputDiario.data || []
  const legadoDiario = funilTrafego.data || []

  const inputAgregado = inputs.reduce((acc, d) => ({
    investimento: acc.investimento + Number(d.investimento || 0),
    leads: acc.leads + (d.leads || 0),
    agendamentos: acc.agendamentos + (d.agendamentos || 0),
    reunioes_realizadas: acc.reunioes_realizadas + (d.reunioes_realizadas || 0),
    reunioes_qualificadas: acc.reunioes_qualificadas + (d.reunioes_qualificadas || 0),
    fechamentos: acc.fechamentos + (d.fechamentos || 0),
    faturamento: acc.faturamento + Number(d.faturamento || 0),
  }), { investimento: 0, leads: 0, agendamentos: 0, reunioes_realizadas: 0, reunioes_qualificadas: 0, fechamentos: 0, faturamento: 0 })

  const legadoAgregado = legadoDiario.reduce((acc, d) => ({
    investimento: acc.investimento + Number(d.investimento || 0),
    leads: acc.leads + (d.leads || 0),
  }), { investimento: 0, leads: 0 })

  // Contagens dos kanbans (fallback se nao tiver input)
  const agendadosKanban = ld.filter(l => ['agendado', 'reuniao_feita', 'convertido'].includes(l.status)).length
  const reunioesKanban = ld.filter(l => ['reuniao_feita', 'convertido'].includes(l.status)).length + pl.length
  const fechamentosKanban = pl.filter(x => x.status === 'fechado').length
  const faturamentoKanban = pl.filter(x => x.status === 'fechado').reduce((s, x) => s + Number(x.mrr_proposto || 0), 0)

  const temInput = inputs.length > 0
  const temLegadoDiario = legadoDiario.length > 0
  const fm = funilMensal.data // fonte agregada mensal (funil_trafego) — ultimo fallback

  // Prioridade: input_diario > funil_trafego_diario > funil_trafego (mensal) > kanbans
  const totalLeads = temInput ? inputAgregado.leads : (temLegadoDiario ? legadoAgregado.leads : (fm?.leads ?? ld.length))
  const agendamentos = temInput ? (inputAgregado.agendamentos || agendadosKanban) : (fm?.agendamentos ?? agendadosKanban)
  const reunioes = temInput ? (inputAgregado.reunioes_realizadas || reunioesKanban) : (fm?.reunioes_realizadas ?? reunioesKanban)
  const fechamentos = temInput ? (inputAgregado.fechamentos || fechamentosKanban) : (fm?.fechamentos ?? fechamentosKanban)
  const investimentoAds = temInput ? inputAgregado.investimento : (temLegadoDiario ? legadoAgregado.investimento : Number(fm?.investimento_total || 0))
  const receitaGerada = temInput ? (inputAgregado.faturamento || faturamentoKanban) : (Number(fm?.faturamento || 0) || faturamentoKanban)

  const cpl = totalLeads > 0 ? investimentoAds / totalLeads : 0
  const cacReal = fechamentos > 0 ? investimentoAds / fechamentos : 0
  const ticketMedio = fechamentos > 0 ? receitaGerada / fechamentos : 0

  const funil = {
    leads: totalLeads,
    agendamentos,
    comparecimentos: reunioes,
    fechamentos,
    taxa_agendamento: totalLeads > 0 ? Math.round((agendamentos / totalLeads) * 1000) / 10 : 0,
    taxa_comparecimento: agendamentos > 0 ? Math.round((reunioes / agendamentos) * 1000) / 10 : 0,
    taxa_fechamento: reunioes > 0 ? Math.round((fechamentos / reunioes) * 1000) / 10 : 0,
    taxa_geral: totalLeads > 0 ? Math.round((fechamentos / totalLeads) * 1000) / 10 : 0,
    cpl: Math.round(cpl * 100) / 100,
    cac_real: Math.round(cacReal),
    ticket_medio: Math.round(ticketMedio),
    receita_gerada: Math.round(receitaGerada),
    investimento_ads: Math.round(investimentoAds),
  }

  // Crescimento
  const mrr = totalReceber
  const mrrAnt = rAnt.reduce((s, i) => s + Number(i.valor), 0)
  const crescimentoPct = mrrAnt > 0 ? Math.round(((mrr - mrrAnt) / mrrAnt) * 1000) / 10 : 0

  const crescimento = {
    mrr,
    ltv: cl.length > 0 ? Math.round(mrr / cl.length * 12) : 0,
    cac: Math.round(cacReal),
    payback: cacReal > 0 && ticketMedio > 0 ? Math.round((cacReal / ticketMedio) * 10) / 10 : 0,
    novos_clientes: cl.length,
    churn: 0,
    crescimento_pct: crescimentoPct,
    margem: recebido > 0 ? Math.round((caixa / recebido) * 1000) / 10 : 0,
  }

  // Saude CS
  const scores = cl.map(c => ad.find(x => x.clinica_id === c.id)?.score || 0)
  const emRisco = scores.filter(s => s < 60).length
  const scoreMedio = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const times = {
    trafego: { status: cpl > 15 ? 'atencao' : 'ok', leads: totalLeads, cpl: Math.round(cpl * 100) / 100, investimento: Math.round(investimentoAds) },
    comercial: {
      status: fechamentos === 0 && pl.length > 0 ? 'atencao' : 'ok',
      vendas: fechamentos,
      conversao: funil.taxa_fechamento,
      ticket_medio: Math.round(ticketMedio),
    },
    cs: {
      status: emRisco > 0 ? 'atencao' : 'ok',
      clientes: cl.length,
      em_risco: emRisco,
      churn_rate: 0,
      score_medio: scoreMedio,
    },
  }

  // Financeiro para CEO
  const financeiro_ceo = {
    caixa,
    recebido,
    total_receber: totalReceber,
    pago,
    total_pagar: totalPagar,
    tx_pagamento: totalReceber > 0 ? Math.round((recebido / totalReceber) * 100) : 0,
    mes_anterior: { recebido: recebidoAnt, pago: pagoAntVal, caixa: recebidoAnt - pagoAntVal },
  }

  // Metas SDR/Closer (maybeSingle → pode retornar null se nao houver meta cadastrada)
  const ms = metas_sdr.data || null
  const mc = metas_closer.data || null
  const metas = {
    sdr: { leads: { atual: totalLeads, meta: ms?.meta_leads || 30 }, reunioes: { atual: reunioes, meta: ms?.meta_reunioes || 10 } },
    closer: { reunioes: { atual: pl.length, meta: mc?.meta_reunioes || 20 }, fechamentos: { atual: fechamentos, meta: mc?.meta_fechamentos || 5 }, mrr: { atual: mrr, meta: mc?.meta_mrr || 10000 } },
  }

  return NextResponse.json({
    receita, crescimento, funil, gargalos: [], times, alertas: al,
    financeiro_ceo, metas,
  })
}
