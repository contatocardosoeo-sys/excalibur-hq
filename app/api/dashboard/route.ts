import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const [
    { data: clinicas },
    { data: pipeline },
    { data: leads },
    { data: campanhas },
    { data: alertas },
    { data: adocao },
    { data: jornada },
  ] = await Promise.all([
    supabase.from('clinicas').select('id, nome, ativo').eq('ativo', true),
    supabase.from('pipeline_closer').select('*'),
    supabase.from('leads_sdr').select('id, status, campanha_id'),
    supabase.from('campanhas_trafego').select('id, nome, investimento, leads, status'),
    supabase.from('alertas_clinica').select('id, nivel, resolvido').eq('resolvido', false),
    supabase.from('adocao_clinica').select('clinica_id, score').order('created_at', { ascending: false }),
    supabase.from('jornada_clinica').select('clinica_id, etapa'),
  ])

  const cl = clinicas || []
  const pl = pipeline || []
  const ld = leads || []
  const cp = campanhas || []
  const al = alertas || []
  const ad = adocao || []

  // Funil comercial
  const totalLeadsTrafego = cp.reduce((s, c) => s + (c.leads || 0), 0)
  const leadsSDRAtivos = ld.filter(l => !['perdido', 'convertido'].includes(l.status)).length
  const reunioes = ld.filter(l => l.status === 'reuniao_feita').length + pl.length
  const fechamentos = pl.filter(p => p.status === 'fechado').length
  const mrrPipeline = pl.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  // MRR: buscar do financeiro_receber (receita prevista do mês atual) como fonte real
  const now = new Date()
  const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const fimMes = now.getMonth() === 11 ? `${now.getFullYear() + 1}-01-01` : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`
  const { data: receberMes } = await supabase.from('financeiro_receber').select('valor').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes)
  const mrrFinanceiro = (receberMes || []).reduce((s, r) => s + Number(r.valor || 0), 0)
  const mrrTotal = mrrFinanceiro > 0 ? mrrFinanceiro : mrrPipeline

  // Saúde CS
  const clinicasAtivas = cl.length
  const scores = cl.map(c => {
    const a = ad.find(x => x.clinica_id === c.id)
    return a?.score || 0
  })
  const emRisco = scores.filter(s => s < 60).length
  const alertasCriticos = al.filter(a => a.nivel === 3).length
  const healthScoreMedio = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  // Financeiro
  const investTrafego = cp.reduce((s, c) => s + Number(c.investimento || 0), 0)
  const cplMedio = totalLeadsTrafego > 0 ? Math.round((investTrafego / totalLeadsTrafego) * 100) / 100 : 0

  // Funil visual: conversões
  const funilEtapas = [
    { label: 'Trafego', valor: totalLeadsTrafego, cor: '#3b82f6' },
    { label: 'SDR', valor: ld.length, cor: '#f59e0b' },
    { label: 'Reuniao', valor: reunioes, cor: '#a855f7' },
    { label: 'Fechado', valor: fechamentos, cor: '#22c55e' },
    { label: 'Cliente ativo', valor: clinicasAtivas, cor: '#06b6d4' },
  ]

  return NextResponse.json({
    comercial: { totalLeadsTrafego, leadsSDRAtivos, reunioes, fechamentos, mrrTotal },
    saude: { clinicasAtivas, emRisco, alertasCriticos, healthScoreMedio },
    financeiro: { mrrTotal, investTrafego, cplMedio },
    funil: funilEtapas,
  })
}
