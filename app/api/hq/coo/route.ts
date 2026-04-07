import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface ClienteHQ {
  id: string
  nome: string
  fase: string
  etapa: string
  dias_na_etapa: number
  sla_dias: number
  health_score: number
  status: string
  responsavel_cs: string
  responsavel_comercial: string
  created_at: string
  updated_at: string
}

interface PerformanceDiaria {
  id: string
  data: string
  time: string
  tipo: string
  meta_leads: number
  leads_gerados: number
  meta_agendamentos: number
  agendamentos: number
  meta_vendas: number
  vendas: number
  faturamento: number
  meta_faturamento: number
  taxa_conversao: number
}

interface AlertaSistema {
  id: string
  tipo: string
  titulo: string
  descricao: string
  prioridade: string
  status: string
  cliente_id: string
  created_at: string
}

interface PipelineGroup {
  fase: string
  count: number
  avg_dias_na_etapa: number
  travados: number
}

interface Gargalo {
  tipo: string
  descricao: string
  severidade: 'critica' | 'alta' | 'media'
  valor: number
  contexto: string
}

interface TimePerformance {
  time: string
  leads_gerados: number
  meta_leads: number
  agendamentos: number
  meta_agendamentos: number
  vendas: number
  meta_vendas: number
  faturamento: number
  meta_faturamento: number
  taxa_conversao: number
  atingimento: number
}

export async function GET() {
  try {
    // Fetch all data in parallel
    const [clientesRes, performanceRes, alertasRes] = await Promise.all([
      supabase.from('clientes_hq').select('*'),
      supabase.from('performance_diaria').select('*').order('data', { ascending: false }).limit(100),
      supabase.from('alertas_sistema').select('*').order('created_at', { ascending: false })
    ])

    const clientes: ClienteHQ[] = clientesRes.data || []
    const performance: PerformanceDiaria[] = performanceRes.data || []
    const alertas: AlertaSistema[] = alertasRes.data || []

    // === KPIs ===
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total_clientes = clientes.filter(c => { const x = c as any; return x.status_cliente === 'ativo' || x.status_execucao === 'ativo'; }).length
    const em_onboarding = clientes.filter(c => c.fase === 'onboarding').length
    const em_adocao = clientes.filter(c => c.fase === 'adocao').length
    const em_escala = clientes.filter(c => c.fase === 'escala').length
    const sla_estourados = clientes.filter(c => c.dias_na_etapa > (c.sla_dias || 7)).length
    const em_risco = clientes.filter(c => (c.health_score || 100) < 60).length

    const kpis = {
      total_clientes,
      em_onboarding,
      em_adocao,
      em_escala,
      sla_estourados,
      em_risco
    }

    // === Pipeline por Fase ===
    const fases = ['onboarding', 'adocao', 'escala']
    const pipeline: PipelineGroup[] = fases.map(fase => {
      const clientesFase = clientes.filter(c => c.fase === fase)
      const count = clientesFase.length
      const avg_dias = count > 0
        ? Math.round(clientesFase.reduce((sum, c) => sum + (c.dias_na_etapa || 0), 0) / count)
        : 0
      const travados = clientesFase.filter(c => c.dias_na_etapa > (c.sla_dias || 7)).length

      return {
        fase,
        count,
        avg_dias_na_etapa: avg_dias,
        travados
      }
    })

    // === Gargalos Auto-Detected ===
    const gargalos: Gargalo[] = []

    // Gargalo 1: Fase com maior media de dias na etapa
    const faseComMaisDias = pipeline.reduce((max, p) =>
      p.avg_dias_na_etapa > max.avg_dias_na_etapa ? p : max, pipeline[0])
    if (faseComMaisDias && faseComMaisDias.avg_dias_na_etapa > 5) {
      gargalos.push({
        tipo: 'tempo_etapa',
        descricao: `Fase "${faseComMaisDias.fase}" com media de ${faseComMaisDias.avg_dias_na_etapa} dias na etapa`,
        severidade: faseComMaisDias.avg_dias_na_etapa > 14 ? 'critica' : 'alta',
        valor: faseComMaisDias.avg_dias_na_etapa,
        contexto: `${faseComMaisDias.count} clientes nesta fase`
      })
    }

    // Gargalo 2: Fase com mais travados
    const faseComMaisTravados = pipeline.reduce((max, p) =>
      p.travados > max.travados ? p : max, pipeline[0])
    if (faseComMaisTravados && faseComMaisTravados.travados > 0) {
      gargalos.push({
        tipo: 'sla_estourado',
        descricao: `${faseComMaisTravados.travados} clientes travados em "${faseComMaisTravados.fase}"`,
        severidade: faseComMaisTravados.travados > 5 ? 'critica' : 'alta',
        valor: faseComMaisTravados.travados,
        contexto: `SLA estourado nesta fase`
      })
    }

    // Gargalo 3: Clientes em risco
    if (em_risco > 0) {
      const clientesRisco = clientes.filter(c => (c.health_score || 100) < 60)
      const pioresClientes = clientesRisco
        .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
        .slice(0, 3)
        .map(c => c.nome)
        .join(', ')
      gargalos.push({
        tipo: 'health_score',
        descricao: `${em_risco} clientes com health score abaixo de 60`,
        severidade: em_risco > 3 ? 'critica' : 'alta',
        valor: em_risco,
        contexto: `Piores: ${pioresClientes}`
      })
    }

    // Gargalo 4: Alertas criticos abertos
    const alertasCriticos = alertas.filter(a => a.status === 'aberto' && a.prioridade === 'critica')
    if (alertasCriticos.length > 0) {
      gargalos.push({
        tipo: 'alertas_criticos',
        descricao: `${alertasCriticos.length} alertas criticos sem resolucao`,
        severidade: 'critica',
        valor: alertasCriticos.length,
        contexto: alertasCriticos.slice(0, 3).map(a => a.titulo).join(', ')
      })
    }

    // Gargalo 5: Performance abaixo da meta
    const hoje = new Date().toISOString().split('T')[0]
    const perfHoje = performance.filter(p => p.data === hoje)
    if (perfHoje.length > 0) {
      const timesAbaixoMeta = perfHoje.filter(p => {
        const atingimento = p.meta_vendas > 0 ? (p.vendas / p.meta_vendas) * 100 : 100
        return atingimento < 70
      })
      if (timesAbaixoMeta.length > 0) {
        gargalos.push({
          tipo: 'performance_baixa',
          descricao: `${timesAbaixoMeta.length} times abaixo de 70% da meta hoje`,
          severidade: 'alta',
          valor: timesAbaixoMeta.length,
          contexto: timesAbaixoMeta.map(t => t.time).join(', ')
        })
      }
    }

    // === Performance por Time ===
    const timesMap = new Map<string, TimePerformance>()
    const perfRecente = performance.slice(0, 30)

    for (const p of perfRecente) {
      const key = p.time || p.tipo || 'geral'
      const existing = timesMap.get(key)
      if (existing) {
        existing.leads_gerados += p.leads_gerados || 0
        existing.meta_leads += p.meta_leads || 0
        existing.agendamentos += p.agendamentos || 0
        existing.meta_agendamentos += p.meta_agendamentos || 0
        existing.vendas += p.vendas || 0
        existing.meta_vendas += p.meta_vendas || 0
        existing.faturamento += p.faturamento || 0
        existing.meta_faturamento += p.meta_faturamento || 0
      } else {
        timesMap.set(key, {
          time: key,
          leads_gerados: p.leads_gerados || 0,
          meta_leads: p.meta_leads || 0,
          agendamentos: p.agendamentos || 0,
          meta_agendamentos: p.meta_agendamentos || 0,
          vendas: p.vendas || 0,
          meta_vendas: p.meta_vendas || 0,
          faturamento: p.faturamento || 0,
          meta_faturamento: p.meta_faturamento || 0,
          taxa_conversao: 0,
          atingimento: 0
        })
      }
    }

    const performance_times: TimePerformance[] = Array.from(timesMap.values()).map(t => ({
      ...t,
      taxa_conversao: t.leads_gerados > 0 ? Math.round((t.vendas / t.leads_gerados) * 100) : 0,
      atingimento: t.meta_vendas > 0 ? Math.round((t.vendas / t.meta_vendas) * 100) : 0
    }))

    // === Alertas Abertos (critica + alta) ===
    const alertas_abertos = alertas
      .filter(a => a.status === 'aberto' && ['critica', 'alta'].includes(a.prioridade))
      .slice(0, 20)

    return NextResponse.json({
      kpis,
      pipeline,
      gargalos,
      performance_times,
      alertas: alertas_abertos,
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[COO API] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do COO Dashboard' },
      { status: 500 }
    )
  }
}
