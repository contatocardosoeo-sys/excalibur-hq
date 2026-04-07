import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const META_VENDAS = 15
const TICKET_MEDIO_DEFAULT = 2970
const CICLO_MEDIO_DEFAULT = 18

export async function GET() {
  try {
    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Fetch all comercial data for the month
    const { data: comercialData, error: comercialError } = await supabase
      .from('comercial_excalibur')
      .select('*')
      .gte('created_at', inicioMes)
      .lte('created_at', fimMes)

    if (comercialError) {
      console.error('Erro comercial_excalibur:', comercialError)
      return NextResponse.json({ error: comercialError.message }, { status: 500 })
    }

    // Fetch performance data
    const { data: performanceData, error: perfError } = await supabase
      .from('performance_diaria')
      .select('*')
      .gte('data', inicioMes.split('T')[0])
      .lte('data', fimMes.split('T')[0])

    if (perfError) {
      console.error('Erro performance_diaria:', perfError)
    }

    const deals = comercialData || []

    // ── KPIs ──
    const fechados = deals.filter((d) => d.etapa === 'fechado')
    const vendas_mes = fechados.length
    const gap_meta = META_VENDAS - vendas_mes

    const totalValorFechados = fechados.reduce((sum, d) => sum + (d.valor || 0), 0)
    const ticket_medio = fechados.length > 0
      ? Math.round(totalValorFechados / fechados.length)
      : TICKET_MEDIO_DEFAULT

    // Ciclo medio: diff entre created_at e updated_at dos fechados
    const ciclos = fechados
      .filter((d) => d.created_at && d.updated_at)
      .map((d) => {
        const created = new Date(d.created_at).getTime()
        const updated = new Date(d.updated_at).getTime()
        return Math.max(1, Math.round((updated - created) / (1000 * 60 * 60 * 24)))
      })
    const ciclo_medio = ciclos.length > 0
      ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length)
      : CICLO_MEDIO_DEFAULT

    const totalDeals = deals.filter((d) => d.etapa !== 'perdido').length
    const conversao_geral = totalDeals > 0
      ? Math.round((vendas_mes / totalDeals) * 100)
      : 0

    const kpis = {
      vendas_mes,
      meta_vendas: META_VENDAS,
      gap_meta,
      ticket_medio,
      ciclo_medio,
      conversao_geral,
    }

    // ── Funil ──
    const etapas = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechado', 'perdido']
    const funil = etapas.map((etapa) => {
      const etapaDeals = deals.filter((d) => d.etapa === etapa)
      return {
        etapa,
        count: etapaDeals.length,
        valor: etapaDeals.reduce((sum, d) => sum + (d.valor || 0), 0),
      }
    })

    // ── Performance por vendedor ──
    const vendedorMap: Record<string, typeof deals> = {}
    deals.forEach((d) => {
      const vendedor = d.vendedor || d.responsavel || 'Sem vendedor'
      if (!vendedorMap[vendedor]) vendedorMap[vendedor] = []
      vendedorMap[vendedor].push(d)
    })

    const performance_vendedores = Object.entries(vendedorMap).map(([vendedor, vDeals]) => {
      const prospectos = vDeals.filter((d) => d.etapa === 'prospeccao').length
      const propostas = vDeals.filter((d) => d.etapa === 'proposta' || d.etapa === 'negociacao').length
      const vFechados = vDeals.filter((d) => d.etapa === 'fechado')
      const fechadosCount = vFechados.length
      const totalAtivos = vDeals.filter((d) => d.etapa !== 'perdido').length
      const conversao = totalAtivos > 0 ? Math.round((fechadosCount / totalAtivos) * 100) : 0
      const vTicket = vFechados.length > 0
        ? Math.round(vFechados.reduce((s, d) => s + (d.valor || 0), 0) / vFechados.length)
        : 0

      return {
        vendedor,
        prospectos,
        propostas,
        fechados: fechadosCount,
        conversao,
        ticket_medio: vTicket,
      }
    })

    // ── Pipeline ativo ──
    const pipeline = deals
      .filter((d) => d.etapa !== 'fechado' && d.etapa !== 'perdido')
      .map((d) => ({
        id: d.id,
        nome: d.nome || d.lead_nome || d.paciente_nome || 'Sem nome',
        etapa: d.etapa,
        valor: d.valor || 0,
        vendedor: d.vendedor || d.responsavel || 'Sem vendedor',
        created_at: d.created_at,
        procedimento: d.procedimento || '',
      }))

    return NextResponse.json({
      kpis,
      funil,
      performance_vendedores,
      pipeline,
      performance_diaria: performanceData || [],
    })
  } catch (err) {
    console.error('Erro API comercial:', err)
    return NextResponse.json(
      { error: 'Erro interno ao buscar dados comerciais' },
      { status: 500 }
    )
  }
}
