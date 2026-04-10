import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get('start') || ''
  const end = req.nextUrl.searchParams.get('end') || ''

  if (!start || !end) {
    return NextResponse.json({ tarefas: [] })
  }

  const [{ data: clinicas }, { data: jornadas }, { data: tarefas }] = await Promise.all([
    supabase.from('clinicas').select('id, nome').eq('ativo', true),
    supabase.from('jornada_clinica').select('clinica_id, data_inicio'),
    supabase
      .from('tarefas_jornada')
      .select('id, clinica_id, fase, titulo, descricao, status, bloqueante, prazo_dia, data_prazo')
      .order('data_prazo'),
  ])

  const clinMap = new Map((clinicas || []).map(c => [c.id, c.nome]))
  const inicioMap = new Map((jornadas || []).map(j => [j.clinica_id, j.data_inicio]))

  const result = (tarefas || [])
    .filter(t => clinMap.has(t.clinica_id))
    .map(t => {
      let dataPrazo: string | null = t.data_prazo
      if (!dataPrazo && t.prazo_dia) {
        const inicio = inicioMap.get(t.clinica_id)
        if (inicio) {
          const d = new Date(inicio + 'T12:00:00')
          d.setDate(d.getDate() + t.prazo_dia)
          dataPrazo = d.toISOString().split('T')[0]
        }
      }
      return { t, dataPrazo }
    })
    .filter(({ dataPrazo }) => dataPrazo && dataPrazo >= start && dataPrazo <= end)
    .map(({ t, dataPrazo }) => ({
      id: t.id,
      clinica_id: t.clinica_id,
      clinica_nome: clinMap.get(t.clinica_id) as string,
      fase: t.fase,
      titulo: t.titulo,
      descricao: t.descricao || '',
      status: t.status,
      bloqueante: t.bloqueante || false,
      data_prazo: dataPrazo as string,
    }))
    .sort((a, b) => a.data_prazo.localeCompare(b.data_prazo))

  return NextResponse.json({ tarefas: result })
}
