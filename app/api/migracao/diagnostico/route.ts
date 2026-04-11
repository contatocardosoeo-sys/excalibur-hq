import { NextRequest, NextResponse } from 'next/server'
import { migSb, marcarPassoConcluido } from '../../../lib/migracao'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

  const { data, error } = await migSb
    .from('migracao_diagnostico')
    .select('*')
    .eq('user_email', email)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ respondido: !!data, dados: data || null })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = body.user_email
  if (!email) return NextResponse.json({ error: 'user_email obrigatório' }, { status: 400 })

  const row = {
    user_email: email,
    user_nome: body.user_nome || null,
    user_role: body.user_role || null,
    q1_onde_guarda: body.q1_onde_guarda || null,
    q2_ferramenta_principal: body.q2_ferramenta_principal || null,
    q3_o_que_falta: body.q3_o_que_falta || null,
    q4_dado_nao_capturado: body.q4_dado_nao_capturado || null,
    q5_dor_principal: body.q5_dor_principal || null,
    respondido_em: new Date().toISOString(),
  }

  const { data, error } = await migSb
    .from('migracao_diagnostico')
    .upsert(row, { onConflict: 'user_email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await marcarPassoConcluido(email, 'diagnostico', { respondido_em: row.respondido_em })

  return NextResponse.json({ success: true, data })
}

export async function DELETE() {
  return NextResponse.json({ error: 'não permitido' }, { status: 403 })
}
