import { NextRequest, NextResponse } from 'next/server'
import { migSb } from '../../../lib/migracao'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

  const hoje = new Date().toISOString().split('T')[0]
  const { data } = await migSb
    .from('checkin_diario')
    .select('*')
    .eq('user_email', email)
    .eq('data', hoje)
    .maybeSingle()

  // Histórico 14 dias
  const dHist = new Date()
  dHist.setDate(dHist.getDate() - 14)
  const { data: historico } = await migSb
    .from('checkin_diario')
    .select('data, usou_externo, ferramenta_externa')
    .eq('user_email', email)
    .gte('data', dHist.toISOString().split('T')[0])
    .order('data', { ascending: false })

  return NextResponse.json({
    feito_hoje: !!data,
    dados_hoje: data || null,
    historico: historico || [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = body.user_email
  if (!email) return NextResponse.json({ error: 'user_email obrigatório' }, { status: 400 })

  const hoje = new Date().toISOString().split('T')[0]
  const usouExterno = !!body.usou_externo

  const row = {
    user_email: email,
    data: hoje,
    usou_externo: usouExterno,
    ferramenta_externa: usouExterno ? (body.ferramenta_externa || null) : null,
    motivo: usouExterno ? (body.motivo || null) : null,
    confirmou_em: new Date().toISOString(),
  }

  const { data, error } = await migSb
    .from('checkin_diario')
    .upsert(row, { onConflict: 'user_email,data' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se usou externo, criar alerta dinâmico pra COO
  if (usouExterno) {
    try {
      await migSb.from('alertas_clinica').insert({
        tipo: 'uso_externo',
        titulo: `${email.split('@')[0]} usou ferramenta externa`,
        descricao: `${body.ferramenta_externa || 'Externa'} · ${body.motivo || 'sem motivo'}`,
        nivel: 2,
        resolvido: false,
      })
    } catch { /* */ }
  }

  return NextResponse.json({ success: true, data })
}
