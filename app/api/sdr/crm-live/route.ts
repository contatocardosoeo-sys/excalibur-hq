import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await sb
    .from('sdr_leads_crm')
    .select('waseller_id, nome, clinica, cidade, etapa_atual, etapa_hq, updated_at, valor_contrato')
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ leads: [], error: error.message }, { status: 500 })

  const agora = Date.now()
  const leads = (data || []).map(l => {
    const ts = new Date(l.updated_at).getTime()
    return {
      ...l,
      ao_vivo: agora - ts < 30 * 60 * 1000, // últimos 30 minutos
      ha_minutos: Math.floor((agora - ts) / 60000),
    }
  })

  return NextResponse.json({
    leads,
    total: leads.length,
    ao_vivo: leads.some(l => l.ao_vivo),
  })
}
