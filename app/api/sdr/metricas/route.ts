import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const sdr_email = req.nextUrl.searchParams.get('email') || 'trindade.excalibur@gmail.com'
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimMes = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`
  const hoje = now.toISOString().split('T')[0]

  const [metricasRes, metaRes] = await Promise.all([
    supabase.from('sdr_metricas_diarias').select('*').eq('sdr_email', sdr_email).gte('data', inicioMes).lt('data', fimMes).order('data', { ascending: true }),
    supabase.from('metas_sdr').select('*').eq('sdr_email', sdr_email).eq('mes', mes).eq('ano', ano).single(),
  ])

  const metricas = metricasRes.data || []
  const meta = metaRes.data || { meta_leads: 300, meta_agendamentos: 90, meta_comparecimentos: 54, meta_vendas: 3 }

  // Acumulados do mes
  const totalLeads = metricas.reduce((s, m) => s + (m.leads_recebidos || 0), 0)
  const totalContatos = metricas.reduce((s, m) => s + (m.contatos_realizados || 0), 0)
  const totalAgendamentos = metricas.reduce((s, m) => s + (m.agendamentos || 0), 0)
  const totalComparecimentos = metricas.reduce((s, m) => s + (m.comparecimentos || 0), 0)
  const totalVendas = metricas.reduce((s, m) => s + (m.vendas || 0), 0)

  // Metricas de hoje
  const metricaHoje = metricas.find(m => m.data === hoje) || null

  // Taxas
  const taxaContato = totalLeads > 0 ? Math.round((totalContatos / totalLeads) * 100) : 0
  const taxaAgendamento = totalContatos > 0 ? Math.round((totalAgendamentos / totalContatos) * 100) : 0
  const taxaComparecimento = totalAgendamentos > 0 ? Math.round((totalComparecimentos / totalAgendamentos) * 100) : 0
  const taxaConversao = totalComparecimentos > 0 ? Math.round((totalVendas / totalComparecimentos) * 100) : 0

  return NextResponse.json({
    metricas_dia: metricaHoje,
    metricas_mes: metricas,
    acumulado: {
      leads: totalLeads,
      contatos: totalContatos,
      agendamentos: totalAgendamentos,
      comparecimentos: totalComparecimentos,
      vendas: totalVendas,
    },
    taxas: {
      contato: taxaContato,
      agendamento: taxaAgendamento,
      comparecimento: taxaComparecimento,
      conversao: taxaConversao,
    },
    metas: {
      leads: meta.meta_leads || 300,
      agendamentos: meta.meta_agendamentos || 90,
      comparecimentos: meta.meta_comparecimentos || 54,
      vendas: meta.meta_vendas || 3,
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = body.data || new Date().toISOString().split('T')[0]
  const sdr_email = body.sdr_email || 'trindade.excalibur@gmail.com'

  const { data: result, error } = await supabase.from('sdr_metricas_diarias').upsert({
    data,
    sdr_email,
    leads_recebidos: Number(body.leads_recebidos) || 0,
    contatos_realizados: Number(body.contatos_realizados) || 0,
    agendamentos: Number(body.agendamentos) || 0,
    comparecimentos: Number(body.comparecimentos) || 0,
    vendas: Number(body.vendas) || 0,
    observacao: body.observacao || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'data,sdr_email' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: result })
}
