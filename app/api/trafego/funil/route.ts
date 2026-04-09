import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Baseline histórico (média saudável do sistema)
const BASELINE = { cpl: 10.68, agendamento: 35.25, comparecimento: 71.30, qualificacao: 82.56, conversao: 24.09, cac: 188.94 }

// Regras de classificação (cores)
function classificar(valor: number, tipo: string): { cor: string; status: string; emoji: string } {
  const regras: Record<string, [number, number][]> = {
    agendamento: [[35, 30]], // >=35 verde, 30-34 amarelo, <30 vermelho
    comparecimento: [[70, 65]],
    qualificacao: [[75, 65]],
    conversao: [[24, 20]],
    cac_inv: [[200, 300]], // <=200 verde, 201-300 amarelo, >300 vermelho
    cpl_inv: [[12, 15]],
  }
  const r = regras[tipo]
  if (!r) return { cor: '#6b7280', status: 'neutro', emoji: '⚪' }
  const [limites] = r
  if (tipo.endsWith('_inv')) {
    if (valor <= limites[0]) return { cor: '#22c55e', status: 'verde', emoji: '🟢' }
    if (valor <= limites[1]) return { cor: '#f59e0b', status: 'amarelo', emoji: '🟡' }
    return { cor: '#ef4444', status: 'vermelho', emoji: '🔴' }
  }
  if (valor >= limites[0]) return { cor: '#22c55e', status: 'verde', emoji: '🟢' }
  if (valor >= limites[1]) return { cor: '#f59e0b', status: 'amarelo', emoji: '🟡' }
  return { cor: '#ef4444', status: 'vermelho', emoji: '🔴' }
}

// Ações por métrica e status
const ACOES: Record<string, Record<string, string[]>> = {
  agendamento: {
    vermelho: ['Prioridade total em SDR', 'Revisar tempo de resposta ao lead', 'Auditar conversas das ultimas 24h', 'Ajustar script inicial', 'Implementar follow-ups obrigatorios', 'Suspender escala de trafego'],
    amarelo: ['Roleplay com SDR', 'Ajustar CTA das mensagens', 'Melhorar urgencia na abordagem'],
    verde: ['Manter processo atual', 'Escalar trafego com seguranca'],
  },
  comparecimento: {
    vermelho: ['Confirmacao D-1 e D-0 obrigatoria', 'Audio personalizado pre-reuniao', 'Reforco de escassez na confirmacao', 'Revisar promessa vs entrega'],
    amarelo: ['Melhorar lembretes automaticos', 'Reduzir tempo entre agendamento e reuniao'],
    verde: ['Escalar volume de agendamentos'],
  },
  conversao: {
    vermelho: ['Revisar gravacoes das calls', 'Ajustar oferta e ancoragem', 'Mapear objecoes recorrentes', 'Treinar contorno de objecoes'],
    amarelo: ['Refinar script de fechamento', 'Treinar tecnicas de fechamento'],
    verde: ['Escalar reunioes com confianca'],
  },
  cac: {
    vermelho: ['NAO aumentar trafego', 'Corrigir gargalo interno primeiro', 'Focar em eficiencia do funil'],
    amarelo: ['Otimizar campanhas de menor ROI'],
    verde: ['Escalar investimento em trafego'],
  },
  cpl: {
    vermelho: ['Trocar criativos imediatamente', 'Revisar segmentacao de publico', 'Testar novos angulos de copy'],
    amarelo: ['Otimizar campanhas existentes', 'A/B test de criativos'],
    verde: ['Escalar investimento atual'],
  },
}

export async function GET(req: NextRequest) {
  const mes = Number(req.nextUrl.searchParams.get('mes')) || new Date().getMonth() + 1
  const ano = Number(req.nextUrl.searchParams.get('ano')) || new Date().getFullYear()

  const [{ data: funil }, { data: metas }] = await Promise.all([
    supabase.from('funil_trafego').select('*').eq('mes', mes).eq('ano', ano).single(),
    supabase.from('metas_trafego').select('*').order('nome'),
  ])

  if (!funil) return NextResponse.json({ funil: null, metas: metas || [] })

  const f = funil
  const invest = Number(f.investimento_total)
  const cpl = f.leads > 0 ? invest / f.leads : 0
  const txAgend = f.leads > 0 ? (f.agendamentos / f.leads) * 100 : 0
  const txComp = f.agendamentos > 0 ? (f.reunioes_realizadas / f.agendamentos) * 100 : 0
  const txQual = f.reunioes_realizadas > 0 ? (f.reunioes_qualificadas / f.reunioes_realizadas) * 100 : 0
  const txConv = f.reunioes_qualificadas > 0 ? (f.fechamentos / f.reunioes_qualificadas) * 100 : 0
  const cac = f.fechamentos > 0 ? invest / f.fechamentos : 0
  const custoAgend = f.agendamentos > 0 ? invest / f.agendamentos : 0
  const custoReuniao = f.reunioes_realizadas > 0 ? invest / f.reunioes_realizadas : 0
  const receitaLead = f.leads > 0 ? Number(f.faturamento) / f.leads : 0
  const receitaReuniao = f.reunioes_realizadas > 0 ? Number(f.faturamento) / f.reunioes_realizadas : 0
  const ticketMedio = f.fechamentos > 0 ? Number(f.faturamento) / f.fechamentos : 0
  const roas = invest > 0 ? Number(f.faturamento) / invest : 0

  const diasUteis = 22
  const leadsDia = Math.round(f.leads / diasUteis * 10) / 10
  const agendDia = Math.round(f.agendamentos / diasUteis * 10) / 10
  const reunioesDia = Math.round(f.reunioes_realizadas / diasUteis * 10) / 10
  const vendasDia = Math.round(f.fechamentos / diasUteis * 10) / 10

  // Classificações
  const diagAgend = classificar(txAgend, 'agendamento')
  const diagComp = classificar(txComp, 'comparecimento')
  const diagQual = classificar(txQual, 'qualificacao')
  const diagConv = classificar(txConv, 'conversao')
  const diagCac = classificar(cac, 'cac_inv')
  const diagCpl = classificar(cpl, 'cpl_inv')

  // Funil visual (horizontal, da esquerda p/ direita)
  const etapas = [
    { nome: 'Leads', valor: f.leads, custo: cpl, custoLabel: 'CPL', taxa: null, diag: diagCpl, baseline: BASELINE.cpl },
    { nome: 'Agendamentos', valor: f.agendamentos, custo: custoAgend, custoLabel: 'Custo/agend', taxa: Math.round(txAgend * 100) / 100, diag: diagAgend, baseline: BASELINE.agendamento },
    { nome: 'Reunioes', valor: f.reunioes_realizadas, custo: custoReuniao, custoLabel: 'Custo/reuniao', taxa: Math.round(txComp * 100) / 100, diag: diagComp, baseline: BASELINE.comparecimento },
    { nome: 'Qualificadas', valor: f.reunioes_qualificadas, custo: null, custoLabel: null, taxa: Math.round(txQual * 100) / 100, diag: diagQual, baseline: BASELINE.qualificacao },
    { nome: 'Fechamentos', valor: f.fechamentos, custo: cac, custoLabel: 'CAC', taxa: Math.round(txConv * 100) / 100, diag: diagConv, baseline: BASELINE.conversao },
    { nome: 'Faturamento', valor: Number(f.faturamento), custo: null, custoLabel: null, taxa: null, diag: null, baseline: null },
  ]

  // Alertas automáticos
  const alertas: string[] = []
  if (diagAgend.status === 'vermelho') alertas.push('GARGALO: Taxa de agendamento critica (' + txAgend.toFixed(1) + '%) — revisar SDR imediatamente')
  if (diagComp.status === 'vermelho') alertas.push('GARGALO: Comparecimento abaixo do aceitavel (' + txComp.toFixed(1) + '%) — corrigir confirmacao')
  if (diagConv.status === 'vermelho') alertas.push('GARGALO: Conversao critica (' + txConv.toFixed(1) + '%) — revisar calls e oferta')
  if (diagCac.status === 'vermelho') alertas.push('GARGALO: CAC acima de R$300 (R$' + cac.toFixed(0) + ') — NAO escalar trafego, corrigir funil')
  if (diagCpl.status === 'vermelho') alertas.push('GARGALO: CPL acima de R$15 (R$' + cpl.toFixed(2) + ') — trocar criativos')

  // Gargalo principal (prioridade: agendamento > comparecimento > conversão > tráfego)
  let gargalo = null
  if (diagAgend.status === 'vermelho') gargalo = { nome: 'Agendamento', taxa: txAgend, status: 'vermelho', acoes: ACOES.agendamento.vermelho }
  else if (diagComp.status === 'vermelho') gargalo = { nome: 'Comparecimento', taxa: txComp, status: 'vermelho', acoes: ACOES.comparecimento.vermelho }
  else if (diagConv.status === 'vermelho') gargalo = { nome: 'Conversao', taxa: txConv, status: 'vermelho', acoes: ACOES.conversao.vermelho }
  else if (diagAgend.status === 'amarelo') gargalo = { nome: 'Agendamento', taxa: txAgend, status: 'amarelo', acoes: ACOES.agendamento.amarelo }
  else if (diagComp.status === 'amarelo') gargalo = { nome: 'Comparecimento', taxa: txComp, status: 'amarelo', acoes: ACOES.comparecimento.amarelo }

  // Decisões por métrica
  const decisoes = [
    { metrica: 'Agendamento', valor: txAgend, ...diagAgend, acoes: ACOES.agendamento[diagAgend.status] || [], baseline: BASELINE.agendamento, unidade: '%' },
    { metrica: 'Comparecimento', valor: txComp, ...diagComp, acoes: ACOES.comparecimento[diagComp.status] || [], baseline: BASELINE.comparecimento, unidade: '%' },
    { metrica: 'Conversao', valor: txConv, ...diagConv, acoes: ACOES.conversao[diagConv.status] || [], baseline: BASELINE.conversao, unidade: '%' },
    { metrica: 'CAC', valor: cac, ...diagCac, acoes: ACOES.cac[diagCac.status] || [], baseline: BASELINE.cac, unidade: 'R$' },
    { metrica: 'CPL', valor: cpl, ...diagCpl, acoes: ACOES.cpl[diagCpl.status] || [], baseline: BASELINE.cpl, unidade: 'R$' },
  ]

  // Metas operacionais 3 tiers
  const metasOps = {
    minima: { faturamento: 74000, vendas: 37, reunioes: 153, agendamentos: 215, leads: 610, leadsDia: 28, agendDia: 10, reunioesDia: 7, vendasDia: 2 },
    normal: { faturamento: 90000, vendas: 45, reunioes: 187, agendamentos: 262, leads: 743, leadsDia: 34, agendDia: 12, reunioesDia: 9, vendasDia: 2 },
    super:  { faturamento: 106000, vendas: 53, reunioes: 220, agendamentos: 308, leads: 874, leadsDia: 40, agendDia: 14, reunioesDia: 10, vendasDia: 3 },
  }

  // Resumo executivo
  const resumo = gerarResumo(diagAgend, diagComp, diagConv, diagCac, diagCpl, txAgend, txComp, txConv, cac, cpl)

  return NextResponse.json({
    funil: f, etapas, alertas, gargalo, decisoes, metasOps, resumo, metas: metas || [],
    metricas: { cpl, txAgend, txComp, txQual, txConv, cac, custoAgend, custoReuniao, receitaLead, receitaReuniao, ticketMedio, roas },
    diario: { leadsDia, agendDia, reunioesDia, vendasDia, metaReunioesDia: 10 },
    diagnosticos: { agend: diagAgend, comp: diagComp, qual: diagQual, conv: diagConv, cac: diagCac, cpl: diagCpl },
  })
}

function gerarResumo(dA: {status:string}, dCo: {status:string}, dCv: {status:string}, dCac: {status:string}, dCpl: {status:string}, txA: number, txCo: number, txCv: number, cac: number, cpl: number): string {
  const parts: string[] = []
  if (dCpl.status === 'verde') parts.push('CPL saudavel (R$' + cpl.toFixed(2) + '), geracao de leads consistente.')
  else parts.push('CPL em ' + dCpl.status + ' (R$' + cpl.toFixed(2) + '), revisar criativos e segmentacao.')

  if (dA.status === 'vermelho') parts.push('O principal gargalo esta na conversao de leads em agendamentos (' + txA.toFixed(1) + '%), muito abaixo da media ideal de 35%, impactando o volume de reunioes e elevando o CAC.')
  else if (dA.status === 'amarelo') parts.push('Agendamento em atencao (' + txA.toFixed(1) + '%), proximo do limite. Monitorar de perto.')

  if (dCo.status !== 'verde') parts.push('Comparecimento em ' + dCo.status + ' (' + txCo.toFixed(1) + '%), necessita correcao no processo de confirmacao.')
  if (dCv.status === 'verde') parts.push('Fechamento estavel, indicando que o problema nao esta na venda.')
  else parts.push('Conversao em ' + dCv.status + ' (' + txCv.toFixed(1) + '%), revisar script e oferta.')

  if (dCac.status === 'vermelho') parts.push('CAC acima do limite (R$' + cac.toFixed(0) + '). Prioridade: corrigir funil antes de escalar investimento.')

  parts.push('Ordem de prioridade: 1) Agendamento 2) Comparecimento 3) Conversao 4) Trafego.')
  return parts.join(' ')
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { mes, ano, ...dados } = body
  dados.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('funil_trafego')
    .upsert({ mes: mes || new Date().getMonth() + 1, ano: ano || new Date().getFullYear(), ...dados }, { onConflict: 'mes,ano' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
