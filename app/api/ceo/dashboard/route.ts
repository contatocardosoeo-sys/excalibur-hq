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

  const [receber, pagar, receberAnt, pagarAnt, clinicas, leads, pipeline, metas_sdr, metas_closer, adocao, alertas] = await Promise.all([
    supabase.from('financeiro_receber').select('valor, status, data_vencimento').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    supabase.from('financeiro_pagar').select('valor, status').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    supabase.from('financeiro_receber').select('valor, status').gte('data_vencimento', inicioMesAnt).lt('data_vencimento', inicioMes),
    supabase.from('financeiro_pagar').select('valor, status').gte('data_vencimento', inicioMesAnt).lt('data_vencimento', inicioMes),
    supabase.from('clinicas').select('id, nome, valor_contrato, ativo').eq('ativo', true),
    supabase.from('leads_sdr').select('id, status, created_at'),
    supabase.from('pipeline_closer').select('id, status, mrr_proposto, updated_at'),
    supabase.from('metas_sdr').select('*').eq('mes', mesAtual).eq('ano', anoAtual).single(),
    supabase.from('metas_closer').select('*').eq('mes', mesAtual).eq('ano', anoAtual).single(),
    supabase.from('adocao_clinica').select('clinica_id, score').order('created_at', { ascending: false }),
    supabase.from('alertas_clinica').select('id, nivel, resolvido').eq('resolvido', false),
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

  // Funil
  const totalLeads = ld.length
  const agendamentos = ld.filter(l => ['agendado', 'reuniao_feita', 'convertido'].includes(l.status)).length
  const reunioes = ld.filter(l => ['reuniao_feita', 'convertido'].includes(l.status)).length + pl.length
  const fechamentos = pl.filter(x => x.status === 'fechado').length

  const funil = {
    leads: totalLeads,
    agendamentos,
    comparecimentos: reunioes,
    fechamentos,
    taxa_agendamento: totalLeads > 0 ? Math.round((agendamentos / totalLeads) * 1000) / 10 : 0,
    taxa_comparecimento: agendamentos > 0 ? Math.round((reunioes / agendamentos) * 1000) / 10 : 0,
    taxa_fechamento: reunioes > 0 ? Math.round((fechamentos / reunioes) * 1000) / 10 : 0,
    taxa_geral: totalLeads > 0 ? Math.round((fechamentos / totalLeads) * 1000) / 10 : 0,
    cpl: 0, cac_real: 0, ticket_medio: 0, receita_gerada: 0, investimento_ads: 0,
  }

  // Crescimento
  const mrr = totalReceber
  const mrrAnt = rAnt.reduce((s, i) => s + Number(i.valor), 0)
  const crescimentoPct = mrrAnt > 0 ? Math.round(((mrr - mrrAnt) / mrrAnt) * 1000) / 10 : 0

  const crescimento = {
    mrr,
    ltv: cl.length > 0 ? Math.round(mrr / cl.length * 12) : 0,
    cac: 0,
    payback: 0,
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
    trafego: { status: 'ok', leads: totalLeads, cpl: 0, investimento: 0 },
    comercial: {
      status: fechamentos === 0 && pl.length > 0 ? 'atencao' : 'ok',
      vendas: fechamentos,
      conversao: funil.taxa_fechamento,
      ticket_medio: 0,
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

  // Metas SDR/Closer
  const metas = {
    sdr: { leads: { atual: totalLeads, meta: metas_sdr.data?.meta_leads || 30 }, reunioes: { atual: reunioes, meta: metas_sdr.data?.meta_reunioes || 10 } },
    closer: { reunioes: { atual: pl.length, meta: metas_closer.data?.meta_reunioes || 20 }, fechamentos: { atual: fechamentos, meta: metas_closer.data?.meta_fechamentos || 5 }, mrr: { atual: mrr, meta: metas_closer.data?.meta_mrr || 10000 } },
  }

  return NextResponse.json({
    receita, crescimento, funil, gargalos: [], times, alertas: al,
    financeiro_ceo, metas,
  })
}
