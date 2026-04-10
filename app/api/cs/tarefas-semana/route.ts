import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get('start') || ''
  const end = req.nextUrl.searchParams.get('end') || ''

  if (!start || !end) {
    return NextResponse.json({ tarefas: [] })
  }

  const [{ data: clinicas }, { data: tarefas }] = await Promise.all([
    supabase.from('clinicas').select('id, nome, data_inicio').eq('ativo', true),
    supabase.from('tarefas_jornada').select('*').order('prazo_dia'),
  ])

  const cl = clinicas || []
  const tf = tarefas || []

  const result = []

  for (const clinica of cl) {
    const dataInicio = clinica.data_inicio
    if (!dataInicio) continue

    const tarefasClinica = tf.filter(t => t.clinica_id === clinica.id)

    for (const tarefa of tarefasClinica) {
      // Calcular data_prazo: data_inicio + prazo_dia
      let dataPrazo = tarefa.data_prazo
      if (!dataPrazo && tarefa.prazo_dia && dataInicio) {
        const d = new Date(dataInicio + 'T12:00:00')
        d.setDate(d.getDate() + tarefa.prazo_dia)
        dataPrazo = d.toISOString().split('T')[0]
      }

      if (!dataPrazo) continue
      if (dataPrazo < start || dataPrazo > end) continue

      result.push({
        id: tarefa.id,
        clinica_id: clinica.id,
        clinica_nome: clinica.nome,
        fase: tarefa.fase,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || '',
        status: tarefa.status,
        bloqueante: tarefa.bloqueante || false,
        data_prazo: dataPrazo,
      })
    }
  }

  result.sort((a, b) => a.data_prazo.localeCompare(b.data_prazo))

  return NextResponse.json({ tarefas: result })
}
