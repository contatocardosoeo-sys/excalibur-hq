// ═══════════════════════════════════════════════════════════════
// Cliente Wascript API (WaSeller backend)
// Docs: https://api-whatsapp.wascript.com.br/api-docs/
// Endpoints disponíveis:
//   GET  /api/listar-etiquetas/{token}
//   POST /api/modificar-etiquetas/{token}
//   POST /api/criar-nota/{token}
//   POST /api/enviar-texto/{token}
//   POST /api/enviar-imagem/{token}
//   POST /api/enviar-documento/{token}
//   POST /api/enviar-audio/{token}
//   POST /api/enviar-video/{token}
// ═══════════════════════════════════════════════════════════════

const BASE = 'https://api-whatsapp.wascript.com.br'

function token(): string {
  const t = process.env.WASCRIPT_TOKEN_TRINDADE
  if (!t) throw new Error('WASCRIPT_TOKEN_TRINDADE não configurado')
  return t
}

export type Etiqueta = {
  id: string
  name: string          // ex: "Novo cliente", "Lead", "Agendado"
  color: number
  count: number         // quantos contatos têm essa etiqueta no momento
  hexColor: string
  colorIndex: number
}

export type ListarEtiquetasResp = {
  success: boolean
  message: string
  etiquetas?: Etiqueta[]
}

export async function listarEtiquetas(): Promise<Etiqueta[]> {
  const r = await fetch(`${BASE}/api/listar-etiquetas/${token()}`, {
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`listarEtiquetas HTTP ${r.status}`)
  const j: ListarEtiquetasResp = await r.json()
  if (!j.success) throw new Error(j.message || 'listarEtiquetas falhou')
  return j.etiquetas || []
}

export type AcaoEtiqueta = { labelId: string; type: 'add' | 'remove' }

export async function modificarEtiquetas(params: {
  phone: string | string[]
  actions: AcaoEtiqueta | AcaoEtiqueta[]
}): Promise<{ success: boolean; message?: string }> {
  const r = await fetch(`${BASE}/api/modificar-etiquetas/${token()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const j = await r.json().catch(() => ({ success: false, message: 'parse error' }))
  return j
}

export async function enviarTexto(params: {
  phone: string
  message: string
}): Promise<{ success: boolean; message?: string }> {
  const r = await fetch(`${BASE}/api/enviar-texto/${token()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return r.json().catch(() => ({ success: false, message: 'parse error' }))
}

export async function criarNota(params: {
  phone: string
  content: string
}): Promise<{ success: boolean; message?: string }> {
  const r = await fetch(`${BASE}/api/criar-nota/${token()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return r.json().catch(() => ({ success: false, message: 'parse error' }))
}

// ─── Normalização de nomes de etiqueta pro funil Excalibur ──────────
// O Trindade usa etiquetas no WhatsApp Business. A função abaixo mapeia
// o nome raw da etiqueta pra uma etapa canonical do HQ, com tolerância
// a variações (Novo cliente, novo lead, lead quente, qualificado etc.)

export type EtapaHQ = 'lead' | 'contato' | 'qualificado' | 'agendamento' | 'comparecimento' | 'venda' | 'perdido' | 'outros'

const MAP_ETIQUETA_HQ: Array<{ pattern: RegExp; etapa: EtapaHQ }> = [
  { pattern: /novo\s*cliente|novo\s*lead|^lead$|entrada|recebido/i, etapa: 'lead' },
  { pattern: /contato|em\s*conversa|conversa\b/i, etapa: 'contato' },
  { pattern: /qualific|interessad/i, etapa: 'qualificado' },
  { pattern: /agenda|reuni[aã]o\s*marcada/i, etapa: 'agendamento' },
  { pattern: /compareceu|reuni[aã]o\s*realizada|presente/i, etapa: 'comparecimento' },
  { pattern: /pago|finalizad|fechado|ganho|cliente\s*ativo/i, etapa: 'venda' },
  { pattern: /perdido|n[aã]o\s*quis|cancel|desist/i, etapa: 'perdido' },
  { pattern: /acompanhar|follow/i, etapa: 'contato' },
  { pattern: /importante/i, etapa: 'outros' },
  { pattern: /pagamento\s*pendente/i, etapa: 'venda' },
  { pattern: /novo\s*pedido/i, etapa: 'agendamento' },
]

export function mapearEtiquetaParaEtapa(nome: string): EtapaHQ {
  // Remove caractere de controle invisível (U+200E left-to-right mark) que o WA manda
  const limpo = nome.replace(/[\u200E\u200F]/g, '').trim()
  for (const { pattern, etapa } of MAP_ETIQUETA_HQ) {
    if (pattern.test(limpo)) return etapa
  }
  return 'outros'
}

// Agrega contadores por etapa a partir da lista crua de etiquetas
export function agregarFunilDaWascript(etiquetas: Etiqueta[]): Record<EtapaHQ, { count: number; nomes: string[] }> {
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
