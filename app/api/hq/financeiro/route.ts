import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET() {
  try {
    const { data: clientes } = await supabase.from('clinicas').select('*')
    const { data: historicoRaw } = await supabase
      .from('financeiro_mensal').select('*')
      .order('mes', { ascending: true })

    const clientesList = clientes || []
    const historicoList = historicoRaw || []

    const activeClients = clientesList.filter((c) => c.status_cliente === 'ativo')
    const mrr = activeClients.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)

    const sortedHistorico = [...historicoList].sort(
      (a, b) => new Date(b.mes).getTime() - new Date(a.mes).getTime()
    )
    const currentMonth = sortedHistorico[0]
    const previousMonth = sortedHistorico[1]
    const mrrAnterior = previousMonth ? Number(previousMonth.mrr) || 0 : 0
    const mrrVariacao = mrrAnterior > 0 ? ((mrr - mrrAnterior) / mrrAnterior) * 100 : 0

    const receitaMes = currentMonth ? Number(currentMonth.receita_total) || 0 : 0

    const churnedClients = clientesList.filter((c) => c.status_cliente === 'churn')
    const totalClientsEver = clientesList.length || 1
    const churnRate = totalClientsEver > 0 ? (churnedClients.length / totalClientsEver) * 100 : 0

    const atRiskClients = activeClients.filter((c) => (Number(c.health_score) || 100) < 60)
    const mrrRisco = atRiskClients.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)

    const inadimplentes = activeClients.filter((c) => c.inadimplente === true || c.status_pagamento === 'atrasado')
    const inadimplencia = activeClients.length > 0 ? (inadimplentes.length / activeClients.length) * 100 : 0

    const custos = currentMonth ? Number(currentMonth.custo_total) || 0 : 0
    const margem = receitaMes > 0 ? ((receitaMes - custos) / receitaMes) * 100 : 0

    const growthRate = mrrVariacao / 100
    const previsao30d = mrr * (1 + growthRate)

    const kpis = {
      mrr,
      mrr_variacao: Number(mrrVariacao.toFixed(1)),
      receita_mes: receitaMes,
      churn_rate: Number(churnRate.toFixed(1)),
      mrr_risco: mrrRisco,
      inadimplencia: Number(inadimplencia.toFixed(1)),
      margem: Number(margem.toFixed(1)),
      previsao_30d: Number(previsao30d.toFixed(0)),
      total_clientes: activeClients.length,
    }

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const historico_mrr = historicoList.map((h) => {
      const d = new Date(h.mes)
      return {
        mes: meses[d.getMonth()] || d.toISOString().slice(0, 7),
        mrr: Number(h.mrr) || 0,
        receita: Number(h.receita_total) || 0,
        clientes: Number(h.novos_clientes) || 0,
      }
    })

    // Breakdown por plano — pacotes reais Excalibur
    const planDistribution: Record<string, { count: number; mrr: number }> = {
      completo: { count: 0, mrr: 0 },
      financeira: { count: 0, mrr: 0 },
      marketing: { count: 0, mrr: 0 },
    }

    activeClients.forEach((c) => {
      const plan = (c.plano || c.plan || 'completo').toLowerCase()
      if (plan.includes('financeira')) {
        planDistribution.financeira.count++
        planDistribution.financeira.mrr += Number(c.mrr) || 0
      } else if (plan.includes('marketing')) {
        planDistribution.marketing.count++
        planDistribution.marketing.mrr += Number(c.mrr) || 0
      } else {
        planDistribution.completo.count++
        planDistribution.completo.mrr += Number(c.mrr) || 0
      }
    })

    const totalMrrBreakdown = planDistribution.completo.mrr + planDistribution.financeira.mrr + planDistribution.marketing.mrr || 1

    const breakdown = [
      { plano: 'Completo', clientes: planDistribution.completo.count, mrr: planDistribution.completo.mrr, percentual: Number(((planDistribution.completo.mrr / totalMrrBreakdown) * 100).toFixed(1)), cor: '#22c55e' },
      { plano: 'Apenas Marketing', clientes: planDistribution.marketing.count, mrr: planDistribution.marketing.mrr, percentual: Number(((planDistribution.marketing.mrr / totalMrrBreakdown) * 100).toFixed(1)), cor: '#f59e0b' },
      { plano: 'Apenas Financeira', clientes: planDistribution.financeira.count, mrr: planDistribution.financeira.mrr, percentual: Number(((planDistribution.financeira.mrr / totalMrrBreakdown) * 100).toFixed(1)), cor: '#94a3b8' },
    ]

    // Churn — só dados reais
    const churnedRecent = churnedClients.slice(0, 5).map((c) => ({
      nome: c.nome_clinica || c.nome || 'Clinica',
      plano: c.plano || c.plan || 'Pro',
      mrr_perdido: Number(c.mrr) || 0,
      data_churn: c.data_cancelamento || c.updated_at || '',
    }))

    const mrrPerdidoTotal = churnedClients.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)

    const churn_analysis = {
      total_churned: churnedClients.length,
      mrr_perdido: mrrPerdidoTotal,
      risco_proximo_30d: atRiskClients.length,
      mrr_risco: mrrRisco,
      clientes_churned: churnedRecent,
    }

    // Projeção baseada em dados reais
    const projecao = {
      conservador: {
        mes_1: Number((mrr * 1.02).toFixed(0)),
        mes_2: Number((mrr * 1.04).toFixed(0)),
        mes_3: Number((mrr * 1.06).toFixed(0)),
        crescimento_mensal: 2,
      },
      otimista: {
        mes_1: Number((mrr * 1.06).toFixed(0)),
        mes_2: Number((mrr * 1.13).toFixed(0)),
        mes_3: Number((mrr * 1.20).toFixed(0)),
        crescimento_mensal: 6,
      },
    }

    return NextResponse.json({ kpis, historico_mrr, breakdown, churn_analysis, projecao })
  } catch (error) {
    console.error('Financeiro API error:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados financeiros' }, { status: 500 })
  }
}
