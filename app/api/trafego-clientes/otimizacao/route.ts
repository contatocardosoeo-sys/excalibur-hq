import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clinicaId = url.searchParams.get('clinica_id')

  let q = sb.from('trafego_otimizacoes').select('*').order('data', { ascending: false }).limit(50)
  if (clinicaId) q = q.eq('clinica_id', clinicaId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ otimizacoes: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = body.data || new Date().toISOString().split('T')[0]

  // Pega gestor_id do vínculo
  const { data: vinc } = await sb.from('trafego_clinica').select('gestor_id').eq('clinica_id', body.clinica_id).maybeSingle()

  const { data: otim, error } = await sb.from('trafego_otimizacoes').insert({
    clinica_id: body.clinica_id,
    gestor_id: vinc?.gestor_id || null,
    data,
    acoes: body.acoes || [],
    observacao: body.observacao || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualiza ultima_otimizacao na trafego_clinica
  await sb.from('trafego_clinica').update({ ultima_otimizacao: data }).eq('clinica_id', body.clinica_id)

  return NextResponse.json({ success: true, data: otim })
}
