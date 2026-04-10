import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const mes = Number(req.nextUrl.searchParams.get('mes') || new Date().getMonth() + 1)
  const ano = Number(req.nextUrl.searchParams.get('ano') || new Date().getFullYear())

  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimMes = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  // Mês anterior
  const mesAnt = mes === 1 ? 12 : mes - 1
  const anoAnt = mes === 1 ? ano - 1 : ano
  const inicioMesAnt = `${anoAnt}-${String(mesAnt).padStart(2, '0')}-01`
  const fimMesAnt = inicioMes

  const [receber, pagar, receberAnt, pagarAnt] = await Promise.all([
    supabase.from('financeiro_receber').select('*').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    supabase.from('financeiro_pagar').select('*').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    supabase.from('financeiro_receber').select('valor, status').gte('data_vencimento', inicioMesAnt).lt('data_vencimento', fimMesAnt),
    supabase.from('financeiro_pagar').select('valor, status').gte('data_vencimento', inicioMesAnt).lt('data_vencimento', fimMesAnt),
  ])

  const r = receber.data || []
  const p = pagar.data || []
  const rAnt = receberAnt.data || []
  const pAnt = pagarAnt.data || []

  const recebido = r.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const totalReceber = r.reduce((s, i) => s + Number(i.valor), 0)
  const pagoTotal = p.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const totalPagar = p.reduce((s, i) => s + Number(i.valor), 0)

  const caixa = recebido - pagoTotal
  const txPagamento = totalReceber > 0 ? Math.round((recebido / totalReceber) * 100) : 0
  const atrasados = r.filter(i => i.status === 'atrasado')
  const txAtraso = r.length > 0 ? Math.round((atrasados.length / r.length) * 100) : 0

  const inadimplentes = atrasados.map(i => ({ nome: i.cliente_nome, valor: Number(i.valor), plano: i.plano }))

  // Mês anterior
  const recebidoAnt = rAnt.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const pagoAnt = pAnt.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const caixaAnt = recebidoAnt - pagoAnt

  return NextResponse.json({
    caixa,
    recebido,
    total_receber: totalReceber,
    pago: pagoTotal,
    total_pagar: totalPagar,
    tx_pagamento: txPagamento,
    tx_atraso: txAtraso,
    inadimplentes,
    mes_anterior: { caixa: caixaAnt, recebido: recebidoAnt, pago: pagoAnt },
  })
}
