import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('usuarios_internos')
    .select('*')
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
  const { email, ativo, role } = await req.json()
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
