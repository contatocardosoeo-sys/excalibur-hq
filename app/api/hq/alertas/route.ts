import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AlertaRow = {
  id: string
  clinica_id: string
  tipo: string
  nivel: number | null
  titulo: string | null
  descricao: string | null
  resolvido: boolean | null
  created_at: string
}

function nivelToPrioridade(nivel: number | null): 'critica' | 'alta' | 'media' | 'baixa' {
  const n = nivel ?? 5
  if (n <= 2) return 'critica'
  if (n <= 4) return 'alta'
  if (n <= 6) return 'media'
  return 'baixa'
}

function statusFromResolvido(resolvido: boolean | null): string {
  return resolvido ? 'resolvido' : 'aberto'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prioridadeFilter = searchParams.get('prioridade')
    const statusFilter = searchParams.get('status')
    const tipoFilter = searchParams.get('tipo')

    const [{ data: alertas, error }, { data: clinicas }] = await Promise.all([
      supabase
        .from('alertas_clinica')
        .select('id, clinica_id, tipo, nivel, titulo, descricao, resolvido, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('clinicas').select('id, nome'),
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const nomeMap = new Map((clinicas || []).map(c => [c.id, c.nome]))

    const mapped = ((alertas as AlertaRow[]) || [])
      .map(a => ({
        id: a.id,
        cliente_id: a.clinica_id,
        cliente_nome: nomeMap.get(a.clinica_id) || 'Clinica sem nome',
        tipo: a.tipo || 'geral',
        prioridade: nivelToPrioridade(a.nivel),
        descricao: a.descricao || a.titulo || '',
        acao_sugerida: a.titulo || 'Verificar cliente',
        status: statusFromResolvido(a.resolvido),
        responsavel: '',
        created_at: a.created_at,
      }))
      .filter(a => !prioridadeFilter || a.prioridade === prioridadeFilter)
      .filter(a => !statusFilter || a.status === statusFilter)
      .filter(a => !tipoFilter || a.tipo === tipoFilter)

    return NextResponse.json({ alertas: mapped, total: mapped.length })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id e status sao obrigatorios' }, { status: 400 })
    }

    const resolvido = status === 'resolvido'
    const updateData: Record<string, unknown> = { resolvido }
    if (resolvido) updateData.resolvido_em = new Date().toISOString()

    const { data, error } = await supabase
      .from('alertas_clinica')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ alerta: data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
