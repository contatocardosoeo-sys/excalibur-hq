import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  FUNIL_METAS,
  RECEITA_METAS,
  TAXAS,
  TAXAS_REAIS,
  LIMITES,
  TICKET_MEDIO,
  CPL_MEDIO,
  DIAS_UTEIS_MES,
  SEMANAS_MES,
  detectarGargalo,
  metaPorPeriodo,
  type NivelMeta,
  type Periodo,
} from '../../../lib/metas-funil'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const nivelParam = (url.searchParams.get('nivel') || 'alvo') as NivelMeta
  const periodo = (url.searchParams.get('periodo') || 'mes') as Periodo
  const diasRange = Number(url.searchParams.get('dias') || 1)

  const nivelValido: NivelMeta = ['minima', 'alvo', 'super'].includes(nivelParam) ? nivelParam : 'alvo'
  const funil = FUNIL_METAS[nivelValido]

  // Buscar nível ativo do banco (em caso de override futuro)
  let banco = null
  try {
    const { data } = await supabase.from('funil_metas').select('*').eq('ativo', true).maybeSingle()
    banco = data
  } catch { /* */ }

  // Metas por período (usando a fonte ativa)
  const metasPeriodo = {
    vendas: metaPorPeriodo(funil.mensal.vendas, periodo, diasRange),
    comparecimentos: metaPorPeriodo(funil.mensal.comparecimentos, periodo, diasRange),
    agendamentos: metaPorPeriodo(funil.mensal.agendamentos, periodo, diasRange),
    qualificados: metaPorPeriodo(funil.mensal.qualificados, periodo, diasRange),
    leads: metaPorPeriodo(funil.mensal.leads, periodo, diasRange),
  }

  const gargalo = detectarGargalo()

  return NextResponse.json({
    nivel: nivelValido,
    periodo,
    receita_meta: RECEITA_METAS[nivelValido],
    ticket_medio: TICKET_MEDIO,
    cpl_medio: CPL_MEDIO,
    dias_uteis_mes: DIAS_UTEIS_MES,
    semanas_mes: SEMANAS_MES,
    funil,           // mensal + diario + semanal + custos
    metas_periodo: metasPeriodo,
    taxas: { meta: TAXAS, reais: TAXAS_REAIS },
    limites: LIMITES,
    gargalo,
    banco,
  })
}
