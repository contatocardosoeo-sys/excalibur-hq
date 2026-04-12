import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDiasUteis } from '@/app/lib/dias-uteis'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ETAPAS_JORNADA = [
  { id: 'D0', label: 'D0 — Novo', dias: 0 },
  { id: 'D7', label: 'D7 — Ativado', dias: 7 },
  { id: 'D15', label: 'D15 — Engajado', dias: 15 },
  { id: 'D30', label: 'D30 — Ativo', dias: 30 },
  { id: 'D60', label: 'D60 — Maduro', dias: 60 },
  { id: 'D90', label: 'D90 — Sênior', dias: 90 },
]

function calcularEtapa(dataInicio: string | null): { etapa: string; dias: number } {
  if (!dataInicio) return { etapa: 'D0', dias: 0 }
  const inicio = new Date(dataInicio)
  const diasUteis = (() => {
    let count = 0
    const cur = new Date(inicio)
    const hoje = new Date()
    while (cur <= hoje) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  })()

  let etapa = 'D0'
  for (const e of ETAPAS_JORNADA) {
    if (diasUteis >= e.dias) etapa = e.id
  }
  return { etapa, dias: diasUteis }
}

export async function GET() {
  const { data: clinicas, error } = await sb
    .from('clinicas')
    .select('id, nome, data_inicio, status_cliente, fase, cs_responsavel, score_total, mrr, ultimo_contato')
    .eq('ativo', true)
    .order('data_inicio', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (clinicas || []).map(c => {
    const { etapa, dias } = calcularEtapa(c.data_inicio)
    const proximaEtapa = ETAPAS_JORNADA.find(e => e.dias > dias) || null
    const diasParaProxima = proximaEtapa ? proximaEtapa.dias - dias : 0

    return {
      id: c.id,
      nome: c.nome,
      data_inicio: c.data_inicio,
      status: c.status_cliente || c.fase || 'ativo',
      cs: c.cs_responsavel,
      score: c.score_total,
      mrr: Number(c.mrr || 0),
      ultimo_contato: c.ultimo_contato,
      etapa_atual: etapa,
      dias_uteis: dias,
      proxima_etapa: proximaEtapa?.id || null,
      dias_para_proxima: diasParaProxima,
    }
  })

  // Distribuição por etapa
  const distribuicao: Record<string, number> = {}
  for (const e of ETAPAS_JORNADA) distribuicao[e.id] = 0
  for (const c of items) distribuicao[c.etapa_atual] = (distribuicao[c.etapa_atual] || 0) + 1

  return NextResponse.json({
    clientes: items,
    total: items.length,
    etapas: ETAPAS_JORNADA,
    distribuicao,
  })
}
