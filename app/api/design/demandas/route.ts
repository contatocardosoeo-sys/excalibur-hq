import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DESIGN_SLA } from '../../../lib/config'
import { addDiasUteis } from '../../../lib/dias-uteis'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Prioridade = keyof typeof DESIGN_SLA

function prazoPorPrioridade(prioridade: string): string {
  const p = (prioridade || 'media') as Prioridade
  const dias = DESIGN_SLA[p] ?? DESIGN_SLA.media
  const d = addDiasUteis(new Date(), dias)
  return d.toISOString().split('T')[0]
}

// Lista de demandas com filtros + agregações
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const responsavel = url.searchParams.get('responsavel')
  const solicitante = url.searchParams.get('solicitante')
  const status = url.searchParams.get('status')
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 500)

  let q = sb.from('demandas_design').select('*').order('criado_em', { ascending: false }).limit(limit)
  if (responsavel) q = q.eq('responsavel_email', responsavel)
  if (solicitante) q = q.eq('solicitante_email', solicitante)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = data || []

  // Stats
  const hoje = new Date().toISOString().split('T')[0]
  const stats = {
    total: items.length,
    por_status: {
      recebida: items.filter(i => i.status === 'recebida').length,
      em_andamento: items.filter(i => i.status === 'em_andamento').length,
      revisao: items.filter(i => i.status === 'revisao').length,
      ajustes: items.filter(i => i.status === 'ajustes').length,
      concluida: items.filter(i => i.status === 'concluida').length,
      cancelada: items.filter(i => i.status === 'cancelada').length,
    },
    por_prioridade: {
      urgente: items.filter(i => i.prioridade === 'urgente' && !['concluida', 'cancelada'].includes(i.status)).length,
      alta: items.filter(i => i.prioridade === 'alta' && !['concluida', 'cancelada'].includes(i.status)).length,
      media: items.filter(i => i.prioridade === 'media' && !['concluida', 'cancelada'].includes(i.status)).length,
      baixa: items.filter(i => i.prioridade === 'baixa' && !['concluida', 'cancelada'].includes(i.status)).length,
    },
    atrasadas: items.filter(i => i.prazo_desejado && i.prazo_desejado < hoje && !['concluida', 'cancelada'].includes(i.status)).length,
    hoje: items.filter(i => i.prazo_desejado === hoje && !['concluida', 'cancelada'].includes(i.status)).length,
    concluidas_hoje: items.filter(i => i.status === 'concluida' && i.data_entrega === hoje).length,
  }

  return NextResponse.json({ demandas: items, stats })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.titulo || !body.tipo || !body.solicitante_email) {
    return NextResponse.json({ error: 'titulo, tipo, solicitante_email obrigatórios' }, { status: 400 })
  }

  const { data, error } = await sb.from('demandas_design').insert({
    titulo: body.titulo,
    descricao: body.descricao || null,
    tipo: body.tipo,
    solicitante_email: body.solicitante_email,
    solicitante_nome: body.solicitante_nome || null,
    responsavel_email: body.responsavel_email || null,
    responsavel_nome: body.responsavel_nome || null,
    prioridade: body.prioridade || 'media',
    status: 'recebida',
    // Se não veio prazo, calcula automaticamente por SLA em dias úteis
    prazo_desejado: body.prazo_desejado || prazoPorPrioridade(body.prioridade || 'media'),
    referencias: body.referencias || null,
    briefing: body.briefing || null,
    tempo_estimado_horas: body.tempo_estimado_horas || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // Se marcando como concluída, registra data_entrega
  if (updates.status === 'concluida' && !updates.data_entrega) {
    updates.data_entrega = new Date().toISOString().split('T')[0]
  }
  updates.atualizado_em = new Date().toISOString()

  const { data, error } = await sb.from('demandas_design').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const { error } = await sb.from('demandas_design').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
