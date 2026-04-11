import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  asaasGet,
  asaasConfigured,
  mapAsaasStatus,
  type AsaasListResponse,
  type AsaasPayment,
  type AsaasBalance,
  type AsaasCustomer,
} from '../../../lib/asaas'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type SyncResult = {
  ok: boolean
  periodo: string
  sincronizados: number
  novos: number
  atualizados: number
  erros: number
  saldo_asaas?: number
  customers_sincronizados?: number
  warning?: string
}

export async function POST(req: NextRequest) {
  return doSync(req)
}

export async function GET(req: NextRequest) {
  return doSync(req)
}

async function doSync(req: NextRequest): Promise<NextResponse> {
  if (!asaasConfigured()) {
    return NextResponse.json<SyncResult>({
      ok: false,
      periodo: '',
      sincronizados: 0,
      novos: 0,
      atualizados: 0,
      erros: 0,
      warning: 'ASAAS_API_KEY não configurada — defina em .env.local + Vercel env',
    })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') || 'mes' // mes | full | customers

  const hoje = new Date()
  const mes = hoje.getMonth() + 1
  const ano = hoje.getFullYear()
  const diaInicio = '01'
  const diaFim = String(new Date(ano, mes, 0).getDate()).padStart(2, '0')
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-${diaInicio}`
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${diaFim}`

  let novos = 0
  let atualizados = 0
  let erros = 0

  try {
    // 1. Sincronizar customers (vincular clínicas)
    let customersCount = 0
    if (mode === 'customers' || mode === 'full') {
      let offset = 0
      const limit = 100
      while (true) {
        const list = await asaasGet<AsaasListResponse<AsaasCustomer>>(`/customers?limit=${limit}&offset=${offset}`)
        for (const cust of list.data || []) {
          // Tentar vincular por externalReference (se a clínica tem esse ID) ou por nome
          if (cust.externalReference) {
            await sb.from('clinicas').update({ asaas_customer_id: cust.id }).eq('id', cust.externalReference)
          } else if (cust.name) {
            // Match fuzzy por nome (ILIKE primeira palavra)
            const primeiraPalavra = cust.name.split(/\s+/)[0]
            if (primeiraPalavra?.length >= 3) {
              await sb.from('clinicas').update({ asaas_customer_id: cust.id })
                .ilike('nome', `%${primeiraPalavra}%`)
                .is('asaas_customer_id', null)
            }
          }
          customersCount++
        }
        if (!list.hasMore) break
        offset += limit
        if (offset > 2000) break // safety
      }
    }

    // 2. Sincronizar pagamentos do período
    const query = mode === 'full'
      ? `/payments?limit=100`
      : `/payments?dueDate[ge]=${dataInicio}&dueDate[le]=${dataFim}&limit=100`

    let offset = 0
    const seen = new Set<string>()

    while (true) {
      const paginated = `${query}&offset=${offset}`
      const list = await asaasGet<AsaasListResponse<AsaasPayment>>(paginated)
      const items = list.data || []
      if (items.length === 0) break

      for (const p of items) {
        if (seen.has(p.id)) continue
        seen.add(p.id)

        try {
          const customerId = typeof p.customer === 'string' ? p.customer : (p.customer as { id?: string })?.id || null

          // 1. Match primário: asaas_payment_id
          let { data: existing } = await sb
            .from('financeiro_receber')
            .select('id, clinica_id')
            .eq('asaas_payment_id', p.id)
            .maybeSingle()

          // Tenta achar a clinica pelo customer vinculado
          let clinicaId: string | null = existing?.clinica_id || null
          if (!clinicaId && customerId) {
            const { data: clinica } = await sb
              .from('clinicas')
              .select('id, nome')
              .eq('asaas_customer_id', customerId)
              .maybeSingle()
            if (clinica) clinicaId = clinica.id
          }

          // 2. Fallback: se não achou pelo asaas_payment_id, tentar match por
          //    (valor + data_vencimento + clinica_id ou cliente_nome) pra evitar
          //    duplicar cobranças manuais já cadastradas.
          if (!existing) {
            if (clinicaId) {
              const { data: manual } = await sb
                .from('financeiro_receber')
                .select('id')
                .eq('clinica_id', clinicaId)
                .eq('valor', p.value)
                .eq('data_vencimento', p.dueDate)
                .is('asaas_payment_id', null)
                .maybeSingle()
              if (manual) existing = { id: manual.id, clinica_id: clinicaId }
            }
          }

          // 3. Se AINDA não achou e não tem clinica_id, NÃO INSERIR.
          //    Evita o bug que criou 27 linhas "Cliente Asaas" sem vínculo.
          if (!existing && !clinicaId) {
            continue
          }

          const row = {
            asaas_payment_id: p.id,
            asaas_customer_id: customerId,
            asaas_subscription_id: p.subscription || null,
            cliente_nome: (typeof p.customer === 'object' ? (p.customer as { name?: string })?.name : null) || 'Cliente Asaas',
            clinica_id: clinicaId,
            valor: p.value,
            valor_pago: mapAsaasStatus(p.status) === 'pago' ? (p.netValue || p.value) : null,
            data_vencimento: p.dueDate,
            data_pagamento: p.paymentDate || null,
            status: mapAsaasStatus(p.status),
            forma_pagamento: p.billingType,
            link_boleto: p.bankSlipUrl || null,
            plano: 'Asaas',
            updated_at: new Date().toISOString(),
          }

          if (existing) {
            await sb.from('financeiro_receber').update(row).eq('id', existing.id)
            atualizados++
          } else {
            await sb.from('financeiro_receber').insert(row)
            novos++
          }
        } catch (e) {
          erros++
          console.error('[sync] erro item', p.id, e instanceof Error ? e.message : e)
        }
      }

      if (!list.hasMore) break
      offset += items.length
      if (offset > 2000) break
    }

    // 3. Saldo
    let saldo = 0
    try {
      const bal = await asaasGet<AsaasBalance>('/finance/balance')
      saldo = bal.balance ?? 0
      await sb.from('configuracoes_financeiro').upsert({
        chave: 'caixa_asaas',
        valor: String(saldo),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chave' })
    } catch { /* */ }

    return NextResponse.json<SyncResult>({
      ok: true,
      periodo: mode === 'full' ? 'histórico completo' : `${dataInicio} → ${dataFim}`,
      sincronizados: novos + atualizados,
      novos,
      atualizados,
      erros,
      saldo_asaas: saldo,
      customers_sincronizados: customersCount,
    })
  } catch (error) {
    return NextResponse.json<SyncResult>({
      ok: false,
      periodo: `${dataInicio} → ${dataFim}`,
      sincronizados: novos + atualizados,
      novos,
      atualizados,
      erros: erros + 1,
      warning: error instanceof Error ? error.message : String(error),
    }, { status: 200 })
  }
}
