import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const hoje = new Date().toISOString().split('T')[0]
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const [{ data: leads }, { data: metas }] = await Promise.all([
    supabase.from('leads_sdr').select('*'),
    supabase.from('metas_sdr').select('*').eq('mes', mesAtual).eq('ano', anoAtual).single(),
  ])

  const all = leads || []
  const agendamentos = all.filter(l => l.status === 'agendado').length
  const conversoes = all.filter(l => l.status === 'reuniao_feita' || l.status === 'convertido').length
  const leadsHoje = all.filter(l => (l.created_at || '').startsWith(hoje)).length

  return NextResponse.json({
    total_leads: all.length,
    leads_hoje: leadsHoje,
    agendamentos,
    conversoes,
    meta_leads: metas?.meta_leads || 30,
    meta_reunioes: metas?.meta_reunioes || 10,
    meta_conversoes: metas?.meta_conversoes || 3,
  })
}
