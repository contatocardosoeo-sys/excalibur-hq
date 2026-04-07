import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: session, error } = await supabase
      .from('onboarding_sessions')
      .select('*, clinicas(*)')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão de onboarding não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface PatchBody {
  step: number
  dados: Record<string, unknown>
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as PatchBody
    const { step, dados } = body

    // Fetch existing session to merge dados_parciais
    const { data: existing, error: fetchError } = await supabase
      .from('onboarding_sessions')
      .select('dados_parciais')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: fetchError?.message || 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    const existingDados = (existing.dados_parciais || {}) as Record<string, unknown>
    const mergedDados: Record<string, unknown> = {
      ...existingDados,
      [`step${step}`]: dados,
    }

    const updatePayload: Record<string, unknown> = {
      step_atual: step + 1,
      step_concluido: step,
      dados_parciais: mergedDados,
      updated_at: new Date().toISOString(),
    }

    // If final step, mark as concluido
    if (step === 5) {
      updatePayload.status = 'concluido'
    }

    const { data: updated, error: updateError } = await supabase
      .from('onboarding_sessions')
      .update(updatePayload)
      .eq('id', id)
      .select('*, clinicas(*)')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ session: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
