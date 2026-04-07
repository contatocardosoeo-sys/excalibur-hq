import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prioridade = searchParams.get('prioridade')
    const status = searchParams.get('status')
    const responsavel = searchParams.get('responsavel')
    const tipo = searchParams.get('tipo')

    let query = supabase
      .from('alertas_sistema')
      .select('*')
      .order('criado_em', { ascending: false })

    if (prioridade) query = query.eq('prioridade', prioridade)
    if (status) query = query.eq('status', status)
    if (responsavel) query = query.eq('responsavel', responsavel)
    if (tipo) query = query.eq('tipo', tipo)

    const { data: alertas, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map criado_em to created_at for frontend compatibility
    const mapped = (alertas || []).map(a => ({ ...a, created_at: a.criado_em }))
    return NextResponse.json({ alertas: mapped, total: mapped.length })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, responsavel } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id e status sao obrigatorios' }, { status: 400 })
    }

    const updateData: Record<string, string> = { status }
    if (responsavel) updateData.responsavel = responsavel
    if (status === 'resolvido') updateData.resolved_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('alertas_sistema')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ alerta: data })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
