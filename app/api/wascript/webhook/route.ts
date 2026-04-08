// app/api/wascript/webhook/route.ts — excalibur-hq
// Recebe TODOS os eventos Wascript
// Salva no HQ (pipeline interno) e repassa para o APP (clinicas)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_WEBHOOK = 'https://excalibur-web.vercel.app/api/wascript/webhook'
const WASCRIPT_TOKEN = '1775624326931-c26ceac2707ee87e9e17c3f57923d73a'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'token obrigatorio' }, { status: 400 })
    }

    const { data: conexao } = await supabase
      .from('wascript_connections')
      .select('clinica_id, modo')
      .eq('token', token)
      .eq('ativo', true)
      .single()

    if (!conexao) {
      return NextResponse.json({ error: 'token invalido' }, { status: 404 })
    }

    const phone = (body.phone || body.numero || '').replace(/\D/g, '')
    const nome = body.nome || body.name || null
    const evento = body.evento || body.event || 'Mensagem'
    const etiqueta = body.etiqueta || null

    // 1. Salvar no HQ (pipeline interno)
    await supabase
      .from('whatsapp_leads')
      .upsert({
        clinica_id: conexao.clinica_id,
        phone,
        nome,
        etapa: etiqueta || 'SDR',
        etiqueta,
        ultimo_contato: new Date().toISOString(),
        dados: body,
      }, { onConflict: 'clinica_id,phone' })

    // Salvar em leads (pipeline B2B)
    const { error: leadsErr } = await supabase
      .from('leads')
      .upsert({
        telefone: phone,
        nome: nome || phone,
        etapa: etiqueta || 'Recebido',
        procedimento: 'Implante',
      }, { onConflict: 'telefone' })
    if (leadsErr) console.error('[HQ] sync leads:', leadsErr.message)

    // 2. Repassar para excalibur-app (clinicas)
    fetch(`${APP_WEBHOOK}?token=${WASCRIPT_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((err) => console.error('[HQ→APP repasse]', err))

    console.log(`[WASCRIPT HQ] ${evento} | ${phone} | ${nome} → roteado HQ+APP`)

    return NextResponse.json({
      success: true,
      phone,
      evento,
      roteado: ['hq', 'app'],
    })
  } catch (err) {
    console.error('[WASCRIPT HQ WEBHOOK]', err)
    return NextResponse.json({ error: 'erro interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Excalibur HQ Wascript Webhook ativo ⚔️' })
}
