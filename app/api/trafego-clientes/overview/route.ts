import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const inicioMes = new Date()
  inicioMes.setDate(1)
  const iso = inicioMes.toISOString().split('T')[0]

  const [
    { count: totalClinicas },
    { data: vinculos },
    { data: metricasMes },
    { data: alertasAbertos },
  ] = await Promise.all([
    sb.from('clinicas').select('*', { count: 'exact', head: true }),
    sb.from('trafego_clinica').select('*'),
    sb.from('trafego_metricas').select('clinica_id, leads, investimento, cpl, data').gte('data', iso),
    sb.from('trafego_alertas').select('*').eq('status', 'aberto'),
  ])

  const vinc = vinculos || []
  const ativas = vinc.filter(v => v.status === 'ativo').length
  const pausadas = vinc.filter(v => v.status === 'pausado').length
  const setup = vinc.filter(v => v.status === 'setup').length
  const problema = vinc.filter(v => v.status === 'problema').length
  const semGestor = (totalClinicas || 0) - vinc.length

  const m = metricasMes || []
  const investimentoMes = m.reduce((s, x) => s + Number(x.investimento || 0), 0)
  const leadsMes = m.reduce((s, x) => s + Number(x.leads || 0), 0)
  const cplMedio = leadsMes > 0 ? Math.round((investimentoMes / leadsMes) * 100) / 100 : 0

  // CPL por clínica (média do mês)
  const porClinica: Record<string, { leads: number; investimento: number }> = {}
  m.forEach(x => {
    const id = x.clinica_id as string
    if (!porClinica[id]) porClinica[id] = { leads: 0, investimento: 0 }
    porClinica[id].leads += Number(x.leads || 0)
    porClinica[id].investimento += Number(x.investimento || 0)
  })

  const cplRanking = Object.entries(porClinica)
    .map(([id, d]) => ({ clinica_id: id, cpl: d.leads > 0 ? Math.round((d.investimento / d.leads) * 100) / 100 : 0, leads: d.leads, investimento: d.investimento }))
    .filter(x => x.leads > 0)
    .sort((a, b) => a.cpl - b.cpl)

  // Distribuição por plataforma
  const plataformas: Record<string, number> = {}
  vinc.forEach(v => {
    const p = v.plataforma || 'meta'
    plataformas[p] = (plataformas[p] || 0) + 1
  })

  return NextResponse.json({
    kpis: {
      totalClinicas: totalClinicas || 0,
      ativas, pausadas, setup, problema, semGestor,
      investimentoMes, leadsMes, cplMedio,
      alertasAtivos: alertasAbertos?.length || 0,
    },
    distribuicao: { plataformas, status: { ativas, pausadas, setup, problema, semGestor } },
    ranking: {
      melhores: cplRanking.slice(0, 5),
      piores: cplRanking.slice(-5).reverse(),
    },
    alertas: alertasAbertos || [],
  })
}
