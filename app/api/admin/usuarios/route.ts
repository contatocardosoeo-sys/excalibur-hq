import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('usuarios_internos')
    .select('id, nome, email, role, roles, ativo, avatar_url, criado_por, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const { nome, email, role, senha } = await req.json()

  const { error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: senha || '1234',
    email_confirm: true,
    user_metadata: { nome, role },
  })
  if (authErr && !authErr.message.includes('already')) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('usuarios_internos')
    .upsert({ nome, email, role }, { onConflict: 'email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { email, ativo, role, novaSenha } = body

  // Alterar senha — usa Supabase Auth Admin API
  if (novaSenha) {
    if (novaSenha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no minimo 6 caracteres' }, { status: 400 })
    }
    // Buscar o usuario auth pelo email
    const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

    const authUser = usersList.users.find(u => u.email === email)
    if (!authUser) {
      return NextResponse.json({ error: 'Usuario nao encontrado no auth' }, { status: 404 })
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: novaSenha,
    })
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' })
  }

  // Update padrao (ativo, role)
  const updates: Record<string, unknown> = {}
  if (ativo !== undefined) updates.ativo = ativo
  if (role) updates.role = role

  const { data, error } = await supabase
    .from('usuarios_internos')
    .update(updates)
    .eq('email', email)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
