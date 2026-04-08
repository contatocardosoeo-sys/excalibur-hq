import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  wascriptEnviarTexto,
  wascriptEnviarAudio,
  wascriptEnviarImagem,
  wascriptModificarEtiqueta,
  wascriptCriarNota,
  wascriptExecutarSequencia,
} from '@/lib/wascript'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clinica_id, phone, tipo, mensagem, base64, sequencia, variaveis, etiquetas, nota } = body

    if (!clinica_id || !phone) {
      return NextResponse.json({ error: 'clinica_id e phone obrigatorios' }, { status: 400 })
    }

    const { data: conexao } = await supabase
      .from('wascript_connections')
      .select('token')
      .eq('clinica_id', clinica_id)
      .eq('ativo', true)
      .single()

    if (!conexao) {
      return NextResponse.json({ error: 'clinica sem conexao Wascript ativa' }, { status: 404 })
    }

    const { token } = conexao
    let result: unknown

    switch (tipo) {
      case 'texto':
        result = await wascriptEnviarTexto(token, phone, mensagem)
        break
      case 'audio':
        result = await wascriptEnviarAudio(token, phone, base64)
        break
      case 'imagem':
        result = await wascriptEnviarImagem(token, phone, base64, mensagem)
        break
      case 'sequencia':
        await wascriptExecutarSequencia(token, phone, sequencia, variaveis)
        result = { success: true, enviadas: sequencia.length }
        break
      case 'etiqueta':
        result = await wascriptModificarEtiqueta(token, [phone], etiquetas)
        break
      case 'nota':
        result = await wascriptCriarNota(token, phone, nota)
        break
      default:
        return NextResponse.json({ error: `tipo invalido: ${tipo}` }, { status: 400 })
    }

    await supabase
      .from('whatsapp_leads')
      .update({ ultimo_contato: new Date().toISOString() })
      .eq('clinica_id', clinica_id)
      .eq('phone', phone.replace(/\D/g, ''))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[WASCRIPT SEND]', err)
    return NextResponse.json({ error: 'erro interno' }, { status: 500 })
  }
}
