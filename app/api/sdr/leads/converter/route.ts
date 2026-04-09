import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { lead_id } = await req.json()

  const { data: lead, error: lErr } = await supabase.from('leads_sdr').select('*').eq('id', lead_id).single()
  if (lErr || !lead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })

  const { error: pErr } = await supabase.from('pipeline_closer').insert({
    lead_id: lead.id, nome_clinica: lead.nome, plano: 'Pacote Completo', mrr_proposto: 1500,
    status: 'reuniao_agendada', data_reuniao: lead.data_reuniao || new Date().toISOString().split('T')[0],
    observacoes: `Via SDR. ${lead.responsavel_lead || '-'}, ${lead.cidade || '-'}. Tel: ${lead.telefone || '-'}`,
  })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  await supabase.from('leads_sdr').update({ status: 'convertido', updated_at: new Date().toISOString() }).eq('id', lead_id)

  // Notificar Guilherme (closer)
  await supabase.from('notificacoes_hq').insert({
    para_email: 'guilherme.excalibur@gmail.com',
    tipo: 'lead_enviado', titulo: `Novo lead: ${lead.nome}`,
    mensagem: `Trindade enviou um lead qualificado para o seu pipeline`, link: '/comercial',
  })

  return NextResponse.json({ success: true })
}
