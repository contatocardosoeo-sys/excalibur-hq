// lib/wascript.ts — Excalibur OS Wascript Client
// Integracao com Wascript API para envio de mensagens WhatsApp

const WASCRIPT_BASE = 'https://api-whatsapp.wascript.com.br'

export type WascriptAcaoTipo = 'txt' | 'audio' | 'img' | 'doc' | 'video'

export interface WascriptAcao {
  type: WascriptAcaoTipo
  propriedades: {
    mensagem?: string
    base64?: string
    aguarde?: number
    composing?: number
  }
}

export async function wascriptEnviarTexto(token: string, phone: string, message: string) {
  const res = await fetch(`${WASCRIPT_BASE}/api/enviar-texto/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  })
  return res.json()
}

export async function wascriptEnviarAudio(token: string, phone: string, base64: string) {
  const res = await fetch(`${WASCRIPT_BASE}/api/enviar-audio/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, base64 }),
  })
  return res.json()
}

export async function wascriptEnviarImagem(token: string, phone: string, base64: string, message?: string) {
  const res = await fetch(`${WASCRIPT_BASE}/api/enviar-imagem/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, base64, message }),
  })
  return res.json()
}

export async function wascriptEnviarDocumento(token: string, phone: string, base64: string, name?: string) {
  const res = await fetch(`${WASCRIPT_BASE}/api/enviar-documento/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, base64, name }),
  })
  return res.json()
}

export async function wascriptModificarEtiqueta(
  token: string,
  phones: string[],
  actions: { labelId: string; type: 'add' | 'remove' }[]
) {
  const res = await fetch(`${WASCRIPT_BASE}/api/modificar-etiquetas/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phones, actions }),
  })
  return res.json()
}

export async function wascriptCriarNota(token: string, userID: string, text: string, base64?: string) {
  const res = await fetch(`${WASCRIPT_BASE}/api/criar-nota/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userID, text, base64 }),
  })
  return res.json()
}

export async function wascriptExecutarSequencia(
  token: string,
  phone: string,
  acoes: Array<{
    type: string
    propriedades: {
      mensagem?: string
      base64?: string
      aguarde?: number
      composing?: number
    }
  }>,
  variaveis?: Record<string, string>
) {
  for (const acao of acoes) {
    const { aguarde = 0, mensagem, base64 } = acao.propriedades

    let msg = mensagem || ''
    if (variaveis) {
      Object.entries(variaveis).forEach(([k, v]) => {
        msg = msg.replace(new RegExp(`#${k}|\\{${k}\\}`, 'g'), v)
      })
    }

    if (aguarde > 0) {
      await new Promise((r) => setTimeout(r, aguarde * 1000))
    }

    if (acao.type === 'txt' && msg) {
      await wascriptEnviarTexto(token, phone, msg)
    } else if (acao.type === 'audio' && base64) {
      await wascriptEnviarAudio(token, phone, base64)
    } else if (acao.type === 'img' && base64) {
      await wascriptEnviarImagem(token, phone, base64, msg)
    } else if (acao.type === 'doc' && base64) {
      await wascriptEnviarDocumento(token, phone, base64)
    }
  }
}

export async function wascriptGetToken(clinicaId: string): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('wascript_connections')
    .select('token')
    .eq('clinica_id', clinicaId)
    .eq('ativo', true)
    .single()
  return data?.token || null
}
