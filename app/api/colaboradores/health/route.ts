import { NextRequest, NextResponse } from 'next/server'
import { calcularHealthScore, calcularHealthTodos } from '../../../lib/health-score'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (email) {
    const role = req.nextUrl.searchParams.get('role') || 'admin'
    const nome = req.nextUrl.searchParams.get('nome') || email.split('@')[0]
    const single = await calcularHealthScore(email, nome, role)
    return NextResponse.json(single)
  }

  const todos = await calcularHealthTodos()
  const media = todos.length > 0 ? Math.round(todos.reduce((s, t) => s + t.score, 0) / todos.length) : 0

  return NextResponse.json({
    colaboradores: todos,
    resumo: {
      total: todos.length,
      score_medio: media,
      excelentes: todos.filter(t => t.score >= 85).length,
      bons: todos.filter(t => t.score >= 65 && t.score < 85).length,
      atencao: todos.filter(t => t.score >= 40 && t.score < 65).length,
      criticos: todos.filter(t => t.score < 40).length,
    },
  })
}
