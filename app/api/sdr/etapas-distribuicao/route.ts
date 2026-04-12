import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SDR_ETAPAS } from '@/app/lib/config'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await sb
    .from('sdr_leads_crm')
    .select('etapa_hq, updated_at, nome, telefone, clinica')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const leads = data || []

  // Contagem por etapa
  const distribuicao: Record<string, number> = {}
  const amostraPorEtapa: Record<string, Array<{ nome: string; telefone: string; updated_at: string }>> = {}

  for (const etapa of SDR_ETAPAS) {
    distribuicao[etapa.id] = 0
    amostraPorEtapa[etapa.id] = []
  }

  for (const l of leads) {
    const e = l.etapa_hq as string | null
    if (e && distribuicao[e] !== undefined) {
      distribuicao[e] += 1
      if (amostraPorEtapa[e].length < 5) {
        amostraPorEtapa[e].push({
          nome: l.nome || l.clinica || l.telefone || 'sem nome',
          telefone: l.telefone || '',
          updated_at: l.updated_at,
        })
      }
    }
  }

  const total = leads.length

  return NextResponse.json({
    etapas: SDR_ETAPAS,
    distribuicao,
    amostra: amostraPorEtapa,
    total,
  })
}
