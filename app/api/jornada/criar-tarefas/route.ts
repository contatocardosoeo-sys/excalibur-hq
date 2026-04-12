import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDiasUteis } from '../../../lib/dias-uteis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEMO_CLINICA_ID = '21e95ba0-8f06-4062-85f0-1b9da496be52'

export async function POST(req: NextRequest) {
  const { clinica_id } = await req.json()

  if (!clinica_id) {
    return NextResponse.json({ error: 'clinica_id obrigatório' }, { status: 400 })
  }

  const { data: existentes } = await supabase
    .from('tarefas_jornada')
    .select('id')
    .eq('clinica_id', clinica_id)
    .limit(1)

  if (existentes && existentes.length > 0) {
    return NextResponse.json({ error: 'Clínica já tem tarefas', criadas: 0 }, { status: 409 })
  }

  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id, data_inicio')
    .eq('id', clinica_id)
    .single()

  if (!clinica) {
    return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
  }

  const { data: jornada } = await supabase
    .from('jornada_clinica')
    .select('data_inicio')
    .eq('clinica_id', clinica_id)
    .maybeSingle()

  if (!jornada) {
    await supabase.from('jornada_clinica').insert({
      clinica_id,
      etapa: 'D0_NOVO',
      data_inicio: clinica.data_inicio || new Date().toISOString().split('T')[0],
      dias_na_plataforma: 0,
    })
  }

  const baseDate = jornada?.data_inicio || clinica.data_inicio || new Date().toISOString().split('T')[0]

  const { data: template } = await supabase
    .from('tarefas_jornada')
    .select('fase, titulo, descricao, responsavel, prazo_dia, bloqueante')
    .eq('clinica_id', DEMO_CLINICA_ID)

  if (!template || template.length === 0) {
    return NextResponse.json({ error: 'Template Demo não encontrado' }, { status: 500 })
  }

  const base = new Date(baseDate + 'T12:00:00')
  const novas = template.map(t => {
    // Prazo em DIAS ÚTEIS (antes era corrido)
    const prazo = t.prazo_dia > 0 ? addDiasUteis(base, t.prazo_dia) : new Date(base)
    return {
      clinica_id,
      fase: t.fase,
      titulo: t.titulo,
      descricao: t.descricao,
      responsavel: t.responsavel,
      prazo_dia: t.prazo_dia,
      data_prazo: prazo.toISOString().split('T')[0],
      status: 'pendente',
      bloqueante: t.bloqueante,
    }
  })

  const { error } = await supabase.from('tarefas_jornada').insert(novas)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ criadas: novas.length })
}
