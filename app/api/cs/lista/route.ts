import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWeekString } from '../../../lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const semana = getWeekString(new Date())

  const [clinicasRes, jornadaRes, adocaoRes, alertasRes, funilRes] = await Promise.all([
    supabase.from('clinicas').select('id, nome, aviso_previo_inicio, score_total, sla_estourado, dias_sem_venda, problema_detectado, proxima_acao, cs_responsavel, fase, status_execucao'),
    supabase.from('jornada_clinica').select('clinica_id, etapa, dias_na_plataforma, cs_responsavel'),
    supabase.from('adocao_clinica').select('clinica_id, score').eq('semana', semana),
    supabase.from('alertas_clinica').select('clinica_id').eq('resolvido', false),
    supabase.from('funil_diario').select('clinica_id, faturamento').gte('data', inicioMes),
  ])

  if (clinicasRes.error) {
    return NextResponse.json({ error: clinicasRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    clinicas: clinicasRes.data || [],
    jornada: jornadaRes.data || [],
    adocao: adocaoRes.data || [],
    alertas: alertasRes.data || [],
    funil: funilRes.data || [],
  })
}
