import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET — checar se o user já completou o onboarding
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

  const { data } = await sb
    .from('usuarios_internos')
    .select('nome, email, role, roles, onboarding_completo, onboarding_dados, onboarding_completado_em')
    .eq('email', email)
    .single()

  if (!data) return NextResponse.json({ error: 'usuário não encontrado' }, { status: 404 })

  return NextResponse.json({
    email: data.email,
    nome: data.nome,
    role: data.role,
    onboarding_completo: data.onboarding_completo || false,
    dados: data.onboarding_dados || null,
    completado_em: data.onboarding_completado_em || null,
  })
}

// POST — salvar resultado do wizard
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, dados } = body

  if (!email || !dados) {
    return NextResponse.json({ error: 'email e dados obrigatórios' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('usuarios_internos')
    .update({
      onboarding_completo: true,
      onboarding_dados: dados,
      onboarding_completado_em: new Date().toISOString(),
    })
    .eq('email', email)
    .select('nome, email, onboarding_completo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
