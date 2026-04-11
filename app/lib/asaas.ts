// Cliente Asaas — helpers compartilhados
// Docs: https://docs.asaas.com

export const ASAAS_BASE = process.env.ASAAS_ENV === 'sandbox'
  ? 'https://sandbox.asaas.com/api'
  : 'https://api.asaas.com'

export function asaasHeaders() {
  const key = process.env.ASAAS_API_KEY
  if (!key) throw new Error('ASAAS_API_KEY não configurada')
  return {
    access_token: key,
    'Content-Type': 'application/json',
    'User-Agent': 'ExcaliburHQ/1.0',
  }
}

export async function asaasGet<T = unknown>(path: string): Promise<T> {
  const url = `${ASAAS_BASE}/v3${path}`
  const r = await fetch(url, { headers: asaasHeaders(), cache: 'no-store' })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`Asaas GET ${path} → ${r.status}: ${txt.slice(0, 200)}`)
  }
  return r.json() as Promise<T>
}

export async function asaasPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = `${ASAAS_BASE}/v3${path}`
  const r = await fetch(url, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`Asaas POST ${path} → ${r.status}: ${txt.slice(0, 200)}`)
  }
  return r.json() as Promise<T>
}

// Mapear status do Asaas pro nosso
export function mapAsaasStatus(s: string): 'pago' | 'pendente' | 'atrasado' | 'cancelado' {
  const map: Record<string, 'pago' | 'pendente' | 'atrasado' | 'cancelado'> = {
    RECEIVED: 'pago',
    RECEIVED_IN_CASH: 'pago',
    CONFIRMED: 'pago',
    PENDING: 'pendente',
    AWAITING_RISK_ANALYSIS: 'pendente',
    OVERDUE: 'atrasado',
    REFUNDED: 'cancelado',
    REFUND_REQUESTED: 'cancelado',
    CHARGEBACK_REQUESTED: 'cancelado',
    DELETED: 'cancelado',
  }
  return map[s] || 'pendente'
}

export type AsaasPayment = {
  id: string
  customer: string
  subscription?: string
  value: number
  netValue?: number
  status: string
  billingType: string
  dueDate: string
  paymentDate?: string
  customerName?: string
  bankSlipUrl?: string
  invoiceUrl?: string
  description?: string
}

export type AsaasCustomer = {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
  phone?: string
  mobilePhone?: string
  externalReference?: string
}

export type AsaasBalance = {
  balance: number
}

export type AsaasStatistics = {
  netValue: number
  pendingValue: number
  receivedThisMonth?: number
}
