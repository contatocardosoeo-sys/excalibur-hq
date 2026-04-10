import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWeekString } from '../../../lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const semana = getWeekString(new Date())

  const [clinicasRes, jornadaRes, adocaoRes, alertasRes] = await Promise.all([
    supabase.from('clinicas').select('id, nome'),
    supabase.from('jornada_clinica').select('clinica_id, etapa, dias_na_plataforma, data_inicio, notas, updated_at'),
    supabase.from('adocao_clinica').select('clinica_id, score').eq('semana', semana),
    supabase.from('alertas_clinica').select('id, clinica_id, tipo, titulo, nivel, resolvido, created_at').eq('resolvido', false),
  ])

  if (clinicasRes.error) {
    return NextResponse.json({ error: clinicasRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    clinicas: clinicasRes.data || [],
    jornada: jornadaRes.data || [],
    adocao: adocaoRes.data || [],
    alertas: alertasRes.data || [],
  })
}
