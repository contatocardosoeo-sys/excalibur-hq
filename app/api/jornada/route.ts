import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const clinica_id = req.nextUrl.searchParams.get('clinica_id')

  if (!clinica_id) {
    const { data, error } = await supabase
      .from('clinicas')
      .select('id, nome, data_inicio, cs_responsavel, ativo')
      .eq('ativo', true)
      .order('nome')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ clinicas: data })
  }

  const [
    { data: clinica },
    { data: tarefas },
    { data: jornada },
  ] = await Promise.all([
    supabase.from('clinicas').select('*').eq('id', clinica_id).single(),
    supabase.from('tarefas_jornada').select('*').eq('clinica_id', clinica_id).order('prazo_dia'),
    supabase.from('jornada_clinica').select('*').eq('clinica_id', clinica_id).single(),
  ])

  const fases: Record<string, typeof tarefas> = {}
  for (const t of tarefas || []) {
    if (!fases[t.fase]) fases[t.fase] = []
    fases[t.fase]!.push(t)
  }

  const total = tarefas?.length || 0
  const concluidas = tarefas?.filter((t: { status: string }) => t.status === 'concluida').length || 0
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0

  return NextResponse.json({ clinica, tarefas, fases, jornada, progresso, total, concluidas })
}

export async function PATCH(req: NextRequest) {
  const { tarefa_id, status, clinica_id } = await req.json()

  const { data, error } = await supabase
    .from('tarefas_jornada')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tarefa_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'concluida' && data.titulo?.includes('Marco D7')) {
    await supabase.from('jornada_clinica').update({ etapa: 'D7_ATIVADO' }).eq('clinica_id', clinica_id)
  }
  if (status === 'concluida' && data.titulo?.includes('Marco D15')) {
    await supabase.from('jornada_clinica').update({ etapa: 'D15_MARCO' }).eq('clinica_id', clinica_id)
  }
  if (status === 'concluida' && data.titulo?.includes('Marco D30')) {
    await supabase.from('jornada_clinica').update({ etapa: 'D30_CLASSIFICACAO' }).eq('clinica_id', clinica_id)
  }

  return NextResponse.json({ success: true, data })
}
