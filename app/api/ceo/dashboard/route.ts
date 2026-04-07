import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET() {
  const [metricasRes, gargalosRes, alertasRes] = await Promise.all([
    supabase.from('metricas_ceo').select('*').order('data', { ascending: false }).limit(1).single(),
    supabase.from('gargalos_ceo').select('*').eq('ativo', true).order('impacto_financeiro', { ascending: false }),
    supabase.from('alertas_estrategicos').select('*').eq('resolvido', false).order('created_at', { ascending: false }),
  ])

  if (metricasRes.error) {
    return NextResponse.json({ error: metricasRes.error.message }, { status: 500 })
  }

  const m = metricasRes.data
  const hoje = new Date()
  const diaDoMes = hoje.getDate()
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const diasRestantes = diasNoMes - diaDoMes
  const diasUteis = 22

  const metaDia = Number(m.meta_mes) / diasUteis
  const gapDia = Number(m.receita_dia) - metaDia
  const pctDia = metaDia > 0 ? (Number(m.receita_dia) / metaDia) * 100 : 0
  const gapMes = Number(m.meta_mes) - Number(m.receita_mes)
  const pctMes = Number(m.meta_mes) > 0 ? (Number(m.receita_mes) / Number(m.meta_mes)) * 100 : 0
  const mediaDia = diaDoMes > 0 ? Number(m.receita_mes) / diaDoMes : 0
  const projecao = diaDoMes > 0 ? (Number(m.receita_mes) / diaDoMes) * diasNoMes : 0
  const precisaDia = diasRestantes > 0 ? gapMes / diasRestantes : 0

  const receita = {
    dia: Number(m.receita_dia),
    meta_dia: Math.round(metaDia),
    gap_dia: Math.round(gapDia),
    pct_dia: Math.round(pctDia),
    mes: Number(m.receita_mes),
    meta_mes: Number(m.meta_mes),
    gap_mes: Math.round(gapMes),
    pct_mes: Math.round(pctMes * 10) / 10,
    media_dia: Math.round(mediaDia),
    projecao: Math.round(projecao),
    dias_restantes: diasRestantes,
    precisa_dia: Math.round(precisaDia),
  }

  const leads = Number(m.leads)
  const agendamentos = Number(m.agendamentos)
  const comparecimentos = Number(m.comparecimentos)
  const fechamentos = Number(m.fechamentos)
  const ticketMedio = Number(m.ticket_medio)
  const investimentoAds = Number(m.investimento_ads)

  const taxaAgendamento = leads > 0 ? (agendamentos / leads) * 100 : 0
  const taxaComparecimento = agendamentos > 0 ? (comparecimentos / agendamentos) * 100 : 0
  const taxaFechamento = comparecimentos > 0 ? (fechamentos / comparecimentos) * 100 : 0
  const taxaGeral = leads > 0 ? (fechamentos / leads) * 100 : 0
  const cacReal = fechamentos > 0 ? investimentoAds / fechamentos : 0
  const receitaGerada = fechamentos * ticketMedio

  const funil = {
    leads,
    agendamentos,
    comparecimentos,
    fechamentos,
    taxa_agendamento: Math.round(taxaAgendamento * 10) / 10,
    taxa_comparecimento: Math.round(taxaComparecimento * 10) / 10,
    taxa_fechamento: Math.round(taxaFechamento * 10) / 10,
    taxa_geral: Math.round(taxaGeral * 10) / 10,
    cpl: Number(m.cpl),
    cac_real: Math.round(cacReal),
    ticket_medio: ticketMedio,
    receita_gerada: receitaGerada,
    investimento_ads: investimentoAds,
  }

  const novosClientes = Number(m.novos_clientes)
  const churn = Number(m.churn)
  const mrr = Number(m.mrr)
  const crescimentoPct = mrr > 0 ? ((novosClientes - churn) * ticketMedio / mrr) * 100 : 0
  const margem = receitaGerada > 0 ? ((receitaGerada - investimentoAds) / receitaGerada) * 100 : 0

  const crescimento = {
    mrr,
    ltv: Number(m.ltv),
    cac: Number(m.cac),
    payback: Number(m.payback),
    novos_clientes: novosClientes,
    churn,
    crescimento_pct: Math.round(crescimentoPct * 10) / 10,
    margem: Math.round(margem * 10) / 10,
  }

  const times = {
    trafego: {
      status: Number(m.cpl) > 35 ? 'atencao' : 'ok',
      leads,
      cpl: Number(m.cpl),
      investimento: investimentoAds,
    },
    comercial: {
      status: taxaFechamento < 55 ? 'critico' : taxaFechamento < 65 ? 'atencao' : 'ok',
      vendas: fechamentos,
      conversao: Math.round(taxaFechamento * 10) / 10,
      ticket_medio: ticketMedio,
    },
    cs: {
      status: churn > 1 ? 'atencao' : 'ok',
      clientes: novosClientes + 48 - churn,
      em_risco: 3,
      churn_rate: 4.2,
    },
  }

  return NextResponse.json({
    receita,
    crescimento,
    funil,
    gargalos: gargalosRes.data || [],
    times,
    alertas: alertasRes.data || [],
  })
}
