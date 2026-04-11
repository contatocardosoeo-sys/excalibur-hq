import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  asaasGet,
  mapAsaasStatus,
  ASAAS_WEBHOOK_TOKEN,
  type AsaasBalance,
  type AsaasPayment,
} from '../../../lib/asaas'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type WebhookBody = {
  event: string
  payment?: AsaasPayment & { customer?: { id?: string; name?: string } | string }
  dateCreated?: string
}

export async function POST(req: NextRequest) {
  // 1. Validar autenticidade
  const token = req.headers.get('asaas-access-token')
  if (ASAAS_WEBHOOK_TOKEN && token !== ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WebhookBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, payment } = body
  const paymentId = payment?.id || null

  // Log de auditoria (sempre grava mesmo se falhar o processamento)
  const { data: logRow } = await sb.from('asaas_webhooks_log').insert({
    event,
    payment_id: paymentId,
    payload: body,
    processed: false,
  }).select().single()

  try {
    if (!payment) {
      return NextResponse.json({ received: true, warning: 'no payment in body' })
    }

    const valor = Number(payment.value || 0)
    const customerRaw: string | { id?: string; name?: string } | undefined = payment.customer as string | { id?: string; name?: string } | undefined
    const customerId: string | null = typeof customerRaw === 'string'
      ? customerRaw
      : customerRaw?.id || null
    const customerName: string | undefined = typeof customerRaw === 'object' && customerRaw !== null
      ? customerRaw.name
      : undefined

    switch (event) {
      // ── PAGAMENTO RECEBIDO / CONFIRMADO ──────────────────
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED_IN_CASH_UNDONE':
      case 'PAYMENT_RECEIVED_IN_CASH': {
        // Tentar match pelo asaas_payment_id
        const { data: existing } = await sb
          .from('financeiro_receber')
          .select('id')
          .eq('asaas_payment_id', payment.id)
          .maybeSingle()

        if (existing) {
          await sb.from('financeiro_receber').update({
            status: 'pago',
            data_pagamento: payment.paymentDate || new Date().toISOString().split('T')[0],
            forma_pagamento: payment.billingType,
            valor_pago: valor,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          // Cria uma nova entrada (pagamento criado direto no Asaas, sem estar no HQ ainda)
          await sb.from('financeiro_receber').insert({
            asaas_payment_id: payment.id,
            asaas_customer_id: customerId,
            asaas_subscription_id: payment.subscription || null,
            cliente_nome: customerName || 'Cliente Asaas',
            valor,
            valor_pago: valor,
            data_vencimento: payment.dueDate,
            data_pagamento: payment.paymentDate || new Date().toISOString().split('T')[0],
            status: 'pago',
            forma_pagamento: payment.billingType,
            plano: 'Asaas',
          })
        }

        // Evento em tempo real no HQ (best-effort — tabela eventos_hq pode variar)
        try {
          await sb.from('eventos_hq').insert({
            tipo: 'pagamento_recebido',
            titulo: 'Pagamento recebido!',
            descricao: `${customerName || 'Cliente'} pagou R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via ${payment.billingType}`,
            severidade: 'sucesso',
            origem: 'asaas',
            metadata: { asaas_id: payment.id, valor, forma: payment.billingType },
          })
        } catch { /* */ }

        // Atualizar cache de caixa
        await recalcularCaixa()
        break
      }

      // ── PAGAMENTO ATRASADO ───────────────────────────────
      case 'PAYMENT_OVERDUE': {
        await sb.from('financeiro_receber').update({
          status: 'atrasado',
          updated_at: new Date().toISOString(),
        }).eq('asaas_payment_id', payment.id)

        // Alerta dinâmico (alertas_clinica)
        try {
          await sb.from('alertas_clinica').insert({
            tipo: 'pagamento_atrasado',
            titulo: `Pagamento atrasado — ${customerName || 'cliente'}`,
            descricao: `R$ ${valor.toLocaleString('pt-BR')} vencido em ${payment.dueDate}`,
            nivel: 3,
            resolvido: false,
          })
        } catch { /* tabela talvez exija clinica_id */ }
        break
      }

      // ── COBRANÇA CRIADA ──────────────────────────────────
      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED': {
        const { data: existing } = await sb
          .from('financeiro_receber')
          .select('id')
          .eq('asaas_payment_id', payment.id)
          .maybeSingle()

        const upsert = {
          asaas_payment_id: payment.id,
          asaas_customer_id: customerId,
          asaas_subscription_id: payment.subscription || null,
          cliente_nome: customerName || 'Cliente Asaas',
          valor,
          data_vencimento: payment.dueDate,
          data_pagamento: payment.paymentDate || null,
          status: mapAsaasStatus(payment.status),
          forma_pagamento: payment.billingType,
          link_boleto: payment.bankSlipUrl || null,
          plano: 'Asaas',
          updated_at: new Date().toISOString(),
        }

        if (existing) {
          await sb.from('financeiro_receber').update(upsert).eq('id', existing.id)
        } else {
          await sb.from('financeiro_receber').insert(upsert)
        }
        break
      }

      // ── DELETED / REFUNDED ───────────────────────────────
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_REFUND_IN_PROGRESS': {
        await sb.from('financeiro_receber').update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        }).eq('asaas_payment_id', payment.id)
        break
      }

      default:
        // Evento não tratado — ok, só loga
        break
    }

    if (logRow) {
      await sb.from('asaas_webhooks_log').update({ processed: true }).eq('id', logRow.id)
    }

    return NextResponse.json({ received: true, event })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    if (logRow) {
      await sb.from('asaas_webhooks_log').update({ processed: false, error: errMsg }).eq('id', logRow.id)
    }
    console.error('[asaas webhook] erro:', errMsg)
    // 200 pra não pausar fila do Asaas
    return NextResponse.json({ received: true, warning: errMsg })
  }
}

async function recalcularCaixa() {
  try {
    const balance = await asaasGet<AsaasBalance>('/finance/balance')
    await sb.from('configuracoes_financeiro').upsert({
      chave: 'caixa_asaas',
      valor: String(balance.balance ?? 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'chave' })
  } catch (e) {
    // não quebra o webhook se o balance falhar
    console.error('[asaas] recalcularCaixa falhou:', e instanceof Error ? e.message : e)
  }
}

// GET utilitário — status de configuração (pra debug)
export async function GET() {
  return NextResponse.json({
    webhook: 'asaas',
    env: process.env.ASAAS_ENV || 'sandbox',
    configured: !!process.env.ASAAS_WEBHOOK_TOKEN,
  })
}
