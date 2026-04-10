import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { pipeline_id, email, data_inicio } = await req.json()

  const { data: item, error: pErr } = await supabase.from('pipeline_closer').select('*').eq('id', pipeline_id).single()
  if (pErr || !item) return NextResponse.json({ error: 'Oportunidade nao encontrada' }, { status: 404 })

  const { data: clinica, error: cErr } = await supabase.from('clinicas').insert({
    nome: item.nome_clinica, email: email || null, plano: item.plano,
    valor_contrato: item.mrr_proposto, cs_responsavel: 'Bruno Medina',
    data_inicio: data_inicio || new Date().toISOString().split('T')[0], ativo: true,
  }).select().single()

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  // Notificar Medina (CS)
  await supabase.from('notificacoes_hq').insert({
    para_email: 'brunomedina.contato@gmail.com',
    tipo: 'cliente_ativado', titulo: `Nova clinica ativada: ${item.nome_clinica}`,
    mensagem: `Guilherme fechou ${item.nome_clinica} no plano ${item.plano} — R$${item.mrr_proposto}/mes`,
    link: '/jornada',
  })

  // Notificar admins
  for (const admin of ['contato.cardosoeo@gmail.com', 'luanacaira.excalibur@gmail.com']) {
    await supabase.from('notificacoes_hq').insert({
      para_email: admin, tipo: 'cliente_ativado',
      titulo: `Novo fechamento: ${item.nome_clinica}`,
      mensagem: `Plano ${item.plano}, MRR R$${item.mrr_proposto}`, link: '/ceo',
    })
  }

  return NextResponse.json({ success: true, clinica_id: clinica.id })
}
