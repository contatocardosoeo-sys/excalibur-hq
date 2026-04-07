import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET() {
  try {
    const { data: sessions, error } = await supabase
      .from('onboarding_sessions')
      .select('*, clinicas(nome, email, responsavel)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      sessions: sessions || [],
      total: sessions?.length || 0,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface OnboardingBody {
  nome: string
  cnpj: string
  responsavel: string
  email: string
  whatsapp: string
  cidade: string
  estado: string
  especialidade: string
  plano: string
  data_inicio: string
  cs_responsavel: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OnboardingBody

    const {
      nome,
      cnpj,
      responsavel,
      email,
      whatsapp,
      cidade,
      estado,
      especialidade,
      plano,
      cs_responsavel,
    } = body

    // Step 1: Insert into clinicas
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .insert({
        nome,
        cnpj,
        responsavel,
        email,
        whatsapp,
        cidade,
        estado,
        especialidade,
        plano,
        status_cliente: 'onboarding',
      })
      .select('id')
      .single()

    if (clinicaError || !clinica) {
      return NextResponse.json(
        { error: clinicaError?.message || 'Erro ao criar clínica' },
        { status: 500 }
      )
    }

    // Step 2: Insert into onboarding_sessions
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({
        clinica_id: clinica.id,
        cs_responsavel,
        step_atual: 1,
        step_concluido: 1,
        dados_parciais: { step1: body },
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || 'Erro ao criar sessão de onboarding' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { clinica_id: clinica.id, session_id: session.id },
      { status: 201 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
