// ═══════════════════════════════════════════════════════════════
// Cliente Wascript API (WaSeller backend do Trindade)
// Docs: https://api-whatsapp.wascript.com.br/api-docs/
//
// Endpoints disponíveis:
//   GET  /api/listar-etiquetas/{token}
//   POST /api/modificar-etiquetas/{token}
//   POST /api/criar-nota/{token}
//   POST /api/enviar-texto/{token}
//   POST /api/enviar-imagem/{token}
//   POST /api/enviar-documento/{token}
//   POST /api/enviar-audio/{token}
//   POST /api/enviar-video/{token}
//
// Campos EXATOS validados ao vivo:
//   POST enviar-texto:        { phone, message }
//   POST modificar-etiquetas: { phone, actions: { labelId, type: 'add'|'remove' } }
//   POST criar-nota:          { phone, note }
// ═══════════════════════════════════════════════════════════════

const BASE = 'https://api-whatsapp.wascript.com.br'

function token(): string {
  const t = process.env.WASCRIPT_TOKEN || process.env.WASCRIPT_TOKEN_TRINDADE
  if (!t) throw new Error('WASCRIPT_TOKEN não configurado')
  return t
}

// Normaliza telefone para o formato que a API aceita (55 + DDD + número, só dígitos)
export function fmt(tel: string): string {
  const n = (tel || '').replace(/\D/g, '')
  if (!n) return ''
  if (n.startsWith('55') && n.length >= 12) return n
  return '55' + n
}

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type Etiqueta = {
  id: string
  name: string
  color: number
  count: number
  hexColor: string
  colorIndex: number
}

export type ListarEtiquetasResp = {
  success: boolean
  message?: string
  etiquetas?: Etiqueta[]
}

export type AcaoEtiqueta = { labelId: string; type: 'add' | 'remove' }
export type EtapaHQ = 'lead' | 'contato' | 'qualificado' | 'agendamento' | 'comparecimento' | 'venda' | 'perdido' | 'outros'

// ═══════════════════════════════════════════════════════════
// MAPEAMENTO ETAPA HQ → LABELID REAL DO WHATSAPP (validado)
// ═══════════════════════════════════════════════════════════
// IDs capturados ao vivo no WhatsApp Business do Trindade:
//   1 Novo cliente  · 2 Novo pedido · 3 Pagamento pendente
//   4 Pago          · 5 Pedido finalizado · 6 Importante
//   7 Acompanhar    · 8 Lead
export const ETIQUETAS_FUNIL: Record<string, string | null> = {
  lead:           '8',   // "Lead"
  qualificado:    '7',   // "Acompanhar" — lead qualificado (mesmo label que agendamento)
  agendamento:    '7',   // "Acompanhar" — aguardando reunião
  comparecimento: '1',   // "Novo cliente" — reunião realizada
  venda:          '4',   // "Pago" — fechou
  perdido:        null,  // remove todas
}

// ═══════════════════════════════════════════════════════════
// MENSAGENS PADRÃO POR EVENTO (customizáveis futuramente via empresa_config)
// ═══════════════════════════════════════════════════════════
export const MSGS: Record<string, string> = {
  confirmacao: `Olá! 😊 Passando para confirmar nossa conversa agendada.\nVocê confirma presença? 🗓️`,
  lembrete:    `Oi! Só um lembrete da nossa conversa de hoje. Nos vemos em breve! 💪`,
  pos_reuniao: `Obrigado pela conversa! Foi ótimo conhecer mais sobre sua clínica. Em breve entramos em contato com a proposta. 🚀`,
  no_show:     `Oi, tudo bem? Notei que não conseguimos nos falar hoje. Podemos reagendar? Tenho horários disponíveis esta semana. 📅`,
  follow_up:   `Olá! Passando para saber se você teve alguma dúvida sobre o que conversamos. Estou à disposição! 😊`,
}

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DA API
// ═══════════════════════════════════════════════════════════

export async function listarEtiquetas(): Promise<Etiqueta[]> {
  const r = await fetch(`${BASE}/api/listar-etiquetas/${token()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`listarEtiquetas HTTP ${r.status}`)
  const j: ListarEtiquetasResp = await r.json()
  if (!j.success) throw new Error(j.message || 'listarEtiquetas falhou')
  return j.etiquetas || []
}

export async function enviarTexto(
  telefone: string,
  mensagem: string,
): Promise<{ success: boolean; message?: string }> {
  const phone = fmt(telefone)
  if (!phone) return { success: false, message: 'telefone vazio' }
  try {
    const r = await fetch(`${BASE}/api/enviar-texto/${token()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: mensagem }),
    })
    const d = await r.json()
    console.log('[WASCRIPT enviarTexto]', phone, d.success)
    return d
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return { success: false, message: msg }
  }
}

export async function modificarEtiqueta(
  telefone: string,
  labelId: string,
  type: 'add' | 'remove',
): Promise<{ success: boolean; message?: string; result?: unknown }> {
  const phone = fmt(telefone)
  if (!phone) return { success: false, message: 'telefone vazio' }
  try {
    const r = await fetch(`${BASE}/api/modificar-etiquetas/${token()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, actions: { labelId, type } }),
    })
    const d = await r.json()
    console.log('[WASCRIPT etiqueta]', phone, type, labelId, d.success)
    return d
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return { success: false, message: msg }
  }
}

// Variante batch — aceita múltiplas ações de uma vez (a API suporta nativo)
export async function modificarEtiquetasBatch(params: {
  phone: string | string[]
  actions: AcaoEtiqueta | AcaoEtiqueta[]
}): Promise<{ success: boolean; message?: string; result?: unknown }> {
  const phoneRaw = params.phone
  const phone = Array.isArray(phoneRaw) ? phoneRaw.map(fmt).filter(Boolean) : fmt(phoneRaw)
  const r = await fetch(`${BASE}/api/modificar-etiquetas/${token()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, actions: params.actions }),
  })
  return r.json().catch(() => ({ success: false, message: 'parse error' }))
}

export async function criarNota(
  telefone: string,
  nota: string,
): Promise<{ success: boolean; message?: string }> {
  const phone = fmt(telefone)
  if (!phone) return { success: false, message: 'telefone vazio' }
  const r = await fetch(`${BASE}/api/criar-nota/${token()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, note: nota }),
  })
  return r.json().catch(() => ({ success: false, message: 'parse error' }))
}

// ═══════════════════════════════════════════════════════════
// AVANÇAR ETAPA — remove etiqueta anterior + aplica nova (paralelo)
// ═══════════════════════════════════════════════════════════
export async function avancarEtapa(
  telefone: string,
  etapaAnterior: string | null,
  etapaNova: string,
): Promise<Array<{ success: boolean; message?: string }>> {
  const promessas: Promise<{ success: boolean; message?: string }>[] = []

  if (etapaAnterior && ETIQUETAS_FUNIL[etapaAnterior]) {
    promessas.push(modificarEtiqueta(telefone, ETIQUETAS_FUNIL[etapaAnterior]!, 'remove'))
  }

  const novaLabel = ETIQUETAS_FUNIL[etapaNova]
  if (novaLabel) {
    promessas.push(modificarEtiqueta(telefone, novaLabel, 'add'))
  }

  return Promise.all(promessas)
}

// ═══════════════════════════════════════════════════════════
// AGREGAÇÃO DE FUNIL (para dashboard de counts)
// ═══════════════════════════════════════════════════════════
const MAP_ETIQUETA_HQ: Array<{ pattern: RegExp; etapa: EtapaHQ }> = [
  { pattern: /^\s*lead\s*$|novo\s*lead/i, etapa: 'lead' },
  { pattern: /novo\s*cliente|compareceu|reuni[aã]o\s*realizada|presente/i, etapa: 'comparecimento' },
  { pattern: /acompanhar|agenda|follow/i, etapa: 'agendamento' },
  { pattern: /novo\s*pedido/i, etapa: 'agendamento' },
  { pattern: /qualific|interessad/i, etapa: 'qualificado' },
  { pattern: /contato|em\s*conversa|conversa\b/i, etapa: 'contato' },
  { pattern: /\bpago\b|finalizad|fechado|ganho/i, etapa: 'venda' },
  { pattern: /pagamento\s*pendente/i, etapa: 'venda' },
  { pattern: /perdido|n[aã]o\s*quis|cancel|desist/i, etapa: 'perdido' },
  { pattern: /importante/i, etapa: 'outros' },
]

export function mapearEtiquetaParaEtapa(nome: string): EtapaHQ {
  const limpo = (nome || '').replace(/[\u200E\u200F]/g, '').trim()
  for (const { pattern, etapa } of MAP_ETIQUETA_HQ) {
    if (pattern.test(limpo)) return etapa
  }
  return 'outros'
}

export function agregarFunilDaWascript(
  etiquetas: Etiqueta[],
): Record<EtapaHQ, { count: number; nomes: string[] }> {
  const base: Record<EtapaHQ, { count: number; nomes: string[] }> = {
    lead: { count: 0, nomes: [] },
    contato: { count: 0, nomes: [] },
    qualificado: { count: 0, nomes: [] },
    agendamento: { count: 0, nomes: [] },
    comparecimento: { count: 0, nomes: [] },
    venda: { count: 0, nomes: [] },
    perdido: { count: 0, nomes: [] },
    outros: { count: 0, nomes: [] },
  }
  for (const e of etiquetas) {
    const etapa = mapearEtiquetaParaEtapa(e.name)
    base[etapa].count += Number(e.count || 0)
    base[etapa].nomes.push(e.name.replace(/[\u200E\u200F]/g, '').trim())
  }
  return base
}
