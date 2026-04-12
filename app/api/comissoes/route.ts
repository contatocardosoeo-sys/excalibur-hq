import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Comissao = {
  id: string
  colaborador_email: string
  colaborador_nome: string | null
  role: 'closer' | 'sdr'
  tipo: 'venda' | 'agendamento' | 'comparecimento'
  valor: number
  mes: number
  ano: number
  data_evento: string
  pipeline_card_id: string | null
  lead_nome: string | null
  ticket_venda: number | null
  status: 'pendente' | 'aprovado' | 'pago' | 'cancelado'
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const mes = Number(url.searchParams.get('mes')) || new Date().getMonth() + 1
  const ano = Number(url.searchParams.get('ano')) || new Date().getFullYear()
  const email = url.searchParams.get('email')
  const role = url.searchParams.get('role')
  const status = url.searchParams.get('status')
  const resumo = url.searchParams.get('resumo') === 'true'

  let q = sb.from('comissoes').select('*').eq('mes', mes).eq('ano', ano)
  if (email) q = q.eq('colaborador_email', email)
  if (role) q = q.eq('role', role)
  if (status) q = q.eq('status', status)
  q = q.order('data_evento', { ascending: false })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data || []) as Comissao[]

  const agregar = (filtro: (c: Comissao) => boolean) => {
    const subset = items.filter(filtro)
    return {
      total: subset.reduce((s, c) => s + Number(c.valor), 0),
      pendente: subset.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0),
      aprovado: subset.filter(c => c.status === 'aprovado').reduce((s, c) => s + Number(c.valor), 0),
      pago: subset.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0),
      qtd: subset.length,
    }
  }

  const closer = agregar(c => c.role === 'closer')
  const sdr = agregar(c => c.role === 'sdr')
  const totalGeral = closer.total + sdr.total

  // Bônus de equipe do mês
  const { data: bonusEquipe } = await sb
    .from('bonus_equipe')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)
    .order('patamar')

  if (resumo) {
    return NextResponse.json({
      mes,
      ano,
      closer,
      sdr,
      total: totalGeral,
      bonus_equipe: bonusEquipe || [],
    })
  }

  return NextResponse.json({
    mes,
    ano,
    comissoes: items,
    closer,
    sdr,
    total: totalGeral,
    bonus_equipe: bonusEquipe || [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const required = ['colaborador_email', 'role', 'tipo', 'valor', 'data_evento']
  for (const k of required) {
    if (!body[k] && body[k] !== 0) {
      return NextResponse.json({ error: `${k} obrigatório` }, { status: 400 })
    }
  }

  const data = body.data_evento || new Date().toISOString().slice(0, 10)
  const mes = Number(body.mes) || new Date(data).getMonth() + 1
  const ano = Number(body.ano) || new Date(data).getFullYear()

  const { data: inserted, error } = await sb
    .from('comissoes')
    .insert({
      colaborador_email: body.colaborador_email,
      colaborador_nome: body.colaborador_nome || null,
      role: body.role,
      tipo: body.tipo,
      valor: body.valor,
      mes,
      ano,
      data_evento: data,
      pipeline_card_id: body.pipeline_card_id || null,
      lead_nome: body.lead_nome || null,
      ticket_venda: body.ticket_venda || null,
      observacao: body.observacao || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, comissao: inserted })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  if (!body.id && !body.ids) {
    return NextResponse.json({ error: 'id ou ids obrigatório' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.aprovado_por) updates.aprovado_por = body.aprovado_por
  if (body.status === 'aprovado') updates.aprovado_em = new Date().toISOString()
  if (body.status === 'pago') updates.pago_em = new Date().toISOString()
  if (body.observacao !== undefined) updates.observacao = body.observacao

  const ids: string[] = body.ids || [body.id]
  const { data, error } = await sb.from('comissoes').update(updates).in('id', ids).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, updated: data?.length || 0 })
}
