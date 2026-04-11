// Client helper para a API do Asaas — centraliza env + base URL + auth

export const ASAAS_API_KEY = (process.env.ASAAS_API_KEY || '').trim()
export const ASAAS_WEBHOOK_TOKEN = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim()

// Inferir ambiente pela própria key (mais robusto que env var):
// - $aact_prod_... → produção
// - $aact_YTU0... (sem prefixo prod_) → sandbox
// Fallback: ASAAS_ENV env var (trim pra evitar whitespace)
const envVar = (process.env.ASAAS_ENV || '').trim().toLowerCase()
const keyIndicaProducao = ASAAS_API_KEY.startsWith('$aact_prod_')
export const ASAAS_ENV: 'production' | 'sandbox' = keyIndicaProducao
  ? 'production'
  : (envVar === 'production' ? 'production' : 'sandbox')
export const ASAAS_BASE = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com'
  : 'https://sandbox.asaas.com/api'

export function asaasConfigured(): boolean {
  return !!ASAAS_API_KEY && ASAAS_API_KEY.length > 10
}

export async function asaasGet<T = unknown>(path: string): Promise<T> {
  if (!asaasConfigured()) throw new Error('ASAAS_API_KEY não configurada')
  const res = await fetch(`${ASAAS_BASE}/v3${path}`, {
    headers: {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Asaas ${path}: ${res.status} ${txt.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export async function asaasPost<T = unknown>(path: string, body: unknown): Promise<T> {
  if (!asaasConfigured()) throw new Error('ASAAS_API_KEY não configurada')
  const res = await fetch(`${ASAAS_BASE}/v3${path}`, {
    method: 'POST',
    headers: {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Asaas POST ${path}: ${res.status} ${txt.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// Mapeamento de status do Asaas → nosso status interno
export function mapAsaasStatus(asaasStatus: string): 'pago' | 'pendente' | 'atrasado' | 'cancelado' {
  const map: Record<string, 'pago' | 'pendente' | 'atrasado' | 'cancelado'> = {
    RECEIVED: 'pago',
    CONFIRMED: 'pago',
    RECEIVED_IN_CASH: 'pago',
    PENDING: 'pendente',
    AWAITING_RISK_ANALYSIS: 'pendente',
    OVERDUE: 'atrasado',
    REFUNDED: 'cancelado',
    REFUND_REQUESTED: 'cancelado',
    REFUND_IN_PROGRESS: 'cancelado',
    CHARGEBACK_REQUESTED: 'cancelado',
    CHARGEBACK_DISPUTE: 'cancelado',
    AWAITING_CHARGEBACK_REVERSAL: 'cancelado',
    DUNNING_REQUESTED: 'atrasado',
    DUNNING_RECEIVED: 'pago',
    DELETED: 'cancelado',
  }
  return map[asaasStatus] || 'pendente'
}

// Tipos do payload Asaas
export type AsaasPayment = {
  id: string
  customer: string
  subscription?: string
  value: number
  netValue?: number
  dueDate: string
  paymentDate?: string
  status: string
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED'
  description?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  externalReference?: string
}

export type AsaasBalance = {
  balance: number
}

export type AsaasPaymentStatistics = {
  quantity?: number
  value?: number
  netValue?: number
}

export type AsaasCustomer = {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
  mobilePhone?: string
  externalReference?: string
}

export type AsaasListResponse<T> = {
  object: string
  hasMore: boolean
  totalCount: number
  limit: number
  offset: number
  data: T[]
}
