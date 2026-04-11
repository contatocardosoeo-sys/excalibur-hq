import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Regra DURO: comissão só conta vendas com registro no /comercial Kanban (pipeline_closer).
// Venda fora do sistema = comissão zero. Não existe no HQ = não existe no bolso.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'guilherme.excalibur@gmail.com'
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const [{ data: metas }, { data: pipeline }] = await Promise.all([
    supabase.from('metas_closer').select('*').eq('closer_email', email).eq('mes', mes).eq('ano', ano).maybeSingle(),
    supabase.from('pipeline_closer').select('*').eq('status', 'fechado'),
  ])

  const fechados = pipeline || []
  const inicioMes = new Date(ano, mes - 1, 1).toISOString().split('T')[0]
  const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0]

  const fechadosNoMes = fechados.filter(f => {
    const d = f.data_fechamento || f.updated_at || f.created_at
    return d >= inicioMes && d <= fimMes + 'T23:59:59'
  })

  const mrrRegistrado = fechadosNoMes.reduce((s, f) => s + Number(f.mrr_proposto || 0), 0)
  const qtdFechamentos = fechadosNoMes.length

  const comissaoPct = metas?.comissao_pct ? Number(metas.comissao_pct) : 5
  const metaMrr = metas?.meta_mrr ? Number(metas.meta_mrr) : 10000
  const metaFechamentos = metas?.meta_fechamentos ? Number(metas.meta_fechamentos) : 5

  // Comissão base
  const comissaoCalculada = (mrrRegistrado * comissaoPct) / 100

  // Regra DURO: só paga se atingiu meta mínima de fechamentos
  const atingiuMeta = qtdFechamentos >= metaFechamentos
  const comissaoLiberada = atingiuMeta ? comissaoCalculada : 0

  return NextResponse.json({
    closer: email,
    mes, ano,
    regra: 'DURO — só conta venda registrada no Kanban /comercial',
    fechamentos_mes: qtdFechamentos,
    mrr_registrado: mrrRegistrado,
    meta_fechamentos: metaFechamentos,
    meta_mrr: metaMrr,
    atingiu_meta_quantidade: atingiuMeta,
    comissao_pct: comissaoPct,
    comissao_calculada: comissaoCalculada,
    comissao_liberada: comissaoLiberada,
    aviso: !atingiuMeta
      ? `Comissão bloqueada: ${qtdFechamentos}/${metaFechamentos} fechamentos no mês`
      : 'Meta atingida — comissão liberada',
  })
}
