import { NextRequest, NextResponse } from 'next/server'
import { migSb, marcarPassoConcluido } from '../../../lib/migracao'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = body.user_email
  const tipo = body.tipo
  const quantidade = Number(body.quantidade || 0)
  const payloadResumo = body.payload_resumo || {}

  if (!email || !tipo) {
    return NextResponse.json({ error: 'user_email e tipo obrigatórios' }, { status: 400 })
  }

  const { data, error } = await migSb.from('importacao_log').insert({
    user_email: email,
    tipo,
    quantidade,
    payload_resumo: payloadResumo,
    sucesso: quantidade > 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (quantidade > 0) {
    const mapTipo: Record<string, string> = {
      leads: 'importar_dados',
      pipeline: 'importar_dados',
      clinicas_trafego: 'importar_dados',
      contatos_cs: 'importar_dados',
    }
    const passo = mapTipo[tipo] || 'importar_dados'
    await marcarPassoConcluido(email, passo as 'importar_dados', { tipo, quantidade })
  }

  return NextResponse.json({ success: true, data })
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  let q = migSb.from('importacao_log').select('*').order('criado_em', { ascending: false }).limit(50)
  if (email) q = q.eq('user_email', email)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ importacoes: data || [] })
}
