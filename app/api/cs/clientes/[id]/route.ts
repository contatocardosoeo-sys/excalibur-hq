import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const allowedFields = ['status_execucao', 'proxima_acao', 'ultimo_contato', 'problema_detectado']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const { data, error } = await supabase
    .from('clientes_hq')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
