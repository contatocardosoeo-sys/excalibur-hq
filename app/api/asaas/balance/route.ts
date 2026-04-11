import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { asaasGet, asaasConfigured, type AsaasBalance, type AsaasPaymentStatistics } from '../../../lib/asaas'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  if (!asaasConfigured()) {
    // Fallback: retornar saldo calculado localmente
    const { data: pagos } = await sb
      .from('financeiro_receber')
      .select('valor, status')
    const pagosArr = pagos || []
    const saldoLocal = pagosArr.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor || 0), 0)
    const pendenteLocal = pagosArr.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor || 0), 0)
    return NextResponse.json({
      configurado: false,
      fonte: 'local',
      aviso: 'Asaas não configurado — usando dados locais',
      saldo_disponivel: saldoLocal,
      saldo_a_receber: 0,
      total_pendente: pendenteLocal,
      total_recebido_mes: 0,
    })
  }

  try {
    const [balance, stats] = await Promise.all([
      asaasGet<AsaasBalance>('/finance/balance').catch(() => ({ balance: 0 })),
      asaasGet<AsaasPaymentStatistics>('/finance/payment/statistics').catch(() => ({ value: 0, netValue: 0 })),
    ])

    // Cache no banco
    await sb.from('configuracoes_financeiro').upsert({
      chave: 'caixa_asaas',
      valor: String(balance.balance ?? 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'chave' })

    // Estatísticas adicionais do mês via agregação
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]

    const { data: mesRows } = await sb
      .from('financeiro_receber')
      .select('valor, valor_pago, status')
      .gte('data_vencimento', inicioMes)

    const mes = mesRows || []
    const recebidoMes = mes.filter(r => r.status === 'pago').reduce((s, r) => s + Number(r.valor_pago || r.valor || 0), 0)
    const pendenteMes = mes.filter(r => r.status === 'pendente').reduce((s, r) => s + Number(r.valor || 0), 0)
    const atrasadoMes = mes.filter(r => r.status === 'atrasado').reduce((s, r) => s + Number(r.valor || 0), 0)

    return NextResponse.json({
      configurado: true,
      fonte: 'asaas',
      saldo_disponivel: balance.balance ?? 0,
      saldo_a_receber: stats.netValue ?? 0,
      total_pendente: pendenteMes,
      total_atrasado: atrasadoMes,
      total_recebido_mes: recebidoMes,
      atualizado_em: new Date().toISOString(),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      configurado: true,
      fonte: 'error',
      erro: msg,
      saldo_disponivel: 0,
      saldo_a_receber: 0,
      total_pendente: 0,
      total_recebido_mes: 0,
    }, { status: 200 })
  }
}
