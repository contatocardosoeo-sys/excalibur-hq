import { NextRequest, NextResponse } from 'next/server'
import { migSb, calcularScoreAdocao, PASSOS, getSemanaIso } from '../../../lib/migracao'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const todos = req.nextUrl.searchParams.get('todos') === '1'

  if (todos) {
    // Lista de todos os colaboradores + score de cada um (pra painel COO)
    const { data: users } = await migSb
      .from('usuarios_internos')
      .select('email, nome, role')
      .eq('ativo', true)

    const lista = await Promise.all((users || []).map(async u => {
      const s = await calcularScoreAdocao(u.email)
      return { ...u, ...s }
    }))

    const semana = getSemanaIso()
    return NextResponse.json({ semana, colaboradores: lista.sort((a, b) => b.score - a.score) })
  }

  if (!email) return NextResponse.json({ error: 'email obrigatório ou todos=1' }, { status: 400 })

  const score = await calcularScoreAdocao(email)

  // Passos detalhados
  const { data: passosDb } = await migSb
    .from('migracao_passos')
    .select('*')
    .eq('user_email', email)

  const passosMap = Object.fromEntries((passosDb || []).map(p => [p.passo_key, p]))
  const passosDetalhe = PASSOS.map(p => ({
    ...p,
    concluido: !!passosMap[p.key]?.concluido,
    concluido_em: passosMap[p.key]?.concluido_em || null,
  }))

  return NextResponse.json({
    email,
    semana: getSemanaIso(),
    ...score,
    passos: passosDetalhe,
  })
}
