import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Estado = 'tutorial' | 'check' | 'ativo'

// GET — verifica o estado do colaborador e retorna se deve exibir o onboarding
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')

  if (!email) return NextResponse.json({ show: false })

  // Admin e COO nao veem onboarding
  if (role === 'admin' || role === 'coo') {
    return NextResponse.json({ show: false, estado: 'ativo' as Estado })
  }

  const { data, error } = await supabase
    .from('onboarding_colaborador')
    .select('*')
    .eq('user_email', email)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ show: false, error: error.message })
  }

  // Primeira visita — criar registro e mostrar tutorial
  if (!data) {
    await supabase.from('onboarding_colaborador').insert({
      user_email: email,
      user_role: role || 'cs',
      visitas: 1,
    })
    return NextResponse.json({ show: true, estado: 'tutorial' as Estado, visitas: 1 })
  }

  // Incrementa visitas e atualiza ultimo_acesso
  const novasVisitas = (data.visitas || 0) + 1
  await supabase
    .from('onboarding_colaborador')
    .update({ visitas: novasVisitas, ultimo_acesso: new Date().toISOString() })
    .eq('user_email', email)

  // Se ainda nao viu tutorial, mostra tutorial
  if (!data.tutorial_completo) {
    return NextResponse.json({ show: true, estado: 'tutorial' as Estado, visitas: novasVisitas })
  }

  // Segunda visita (ou ate que check seja feito) — check rapido
  if (!data.check_completo) {
    return NextResponse.json({ show: true, estado: 'check' as Estado, visitas: novasVisitas })
  }

  // Check ja completo — so lembretes inteligentes (sem modal)
  return NextResponse.json({ show: false, estado: 'ativo' as Estado, lembrete: true })
}

// POST — marca etapas como completas
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, acao } = body

  if (!email || !acao) {
    return NextResponse.json({ error: 'email e acao sao obrigatorios' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (acao === 'tutorial_visto') updates.tutorial_completo = true
  if (acao === 'check_ok') updates.check_completo = true
  if (acao === 'precisa_ajuda') updates.check_completo = false

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'acao invalida' }, { status: 400 })
  }

  const { error } = await supabase
    .from('onboarding_colaborador')
    .update(updates)
    .eq('user_email', email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
