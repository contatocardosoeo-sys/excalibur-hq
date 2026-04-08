import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processarEventoComReacoes } from '@/app/lib/eventReaction'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || '50')

  const { data, error } = await supabase
    .from('eventos_sistema')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.event_name) {
      return NextResponse.json({ success: false, error: 'event_name obrigatório' }, { status: 400 })
    }

    // Salvar evento
    const { data: evento, error } = await supabase
      .from('eventos_sistema')
      .insert({
        event_name: body.event_name,
        aggregate_type: body.aggregate_type || null,
        aggregate_id: body.aggregate_id || null,
        clinica_id: body.clinica_id || null,
        source_system: body.source_system || 'api',
        payload_json: body.payload_json || {},
        metadata_json: body.metadata_json || {},
        status: 'processed'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Disparar reações automáticas
    const reacoes = await processarEventoComReacoes({
      event_name: body.event_name,
      aggregate_type: body.aggregate_type,
      aggregate_id: body.aggregate_id,
      clinica_id: body.clinica_id,
      payload_json: { ...body.payload_json, evento_id: evento.id }
    })

    return NextResponse.json({
      success: true,
      evento,
      reacoes_executadas: reacoes
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
