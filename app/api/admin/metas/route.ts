import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calcularFunil,
  TAXAS_REAIS,
  LIMITES,
  CAC_ZONAS,
  zonaCAC,
  gerarAlertas,
  analisarSensibilidade,
  calcularMetasSDR,
  type NivelMeta,
} from '@/app/lib/config'
import { calendarioMesAtual } from '@/app/lib/dias-uteis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type EmpresaConfig = {
  id: number
  nivel_meta: NivelMeta
  receita_minima: number
  receita_alvo: number
  receita_super: number
  ticket_medio: number
  cpl_medio: number
  cpl_max: number
  taxa_qualificacao: number
  taxa_agendamento: number
  taxa_comparecimento: number
  taxa_fechamento: number
  sdr_agendamentos_dia: number
  sdr_agendamentos_min: number
  sdr_agendamentos_max: number
  comissao_closer_pct: number
  cac_max: number
  custo_reuniao_max: number
  updated_at: string
  updated_by: string | null
}

async function carregarConfig(): Promise<EmpresaConfig> {
  const { data, error } = await supabase
    .from('empresa_config')
    .select('*')
    .eq('id', 1)
    .single()
  if (error || !data) throw new Error(error?.message || 'empresa_config vazio')
  return {
    ...data,
    receita_minima: Number(data.receita_minima),
    receita_alvo: Number(data.receita_alvo),
    receita_super: Number(data.receita_super),
    ticket_medio: Number(data.ticket_medio),
    cpl_medio: Number(data.cpl_medio),
    cpl_max: Number(data.cpl_max),
    taxa_qualificacao: Number(data.taxa_qualificacao),
    taxa_agendamento: Number(data.taxa_agendamento),
    taxa_comparecimento: Number(data.taxa_comparecimento),
    taxa_fechamento: Number(data.taxa_fechamento),
    comissao_closer_pct: Number(data.comissao_closer_pct),
    cac_max: Number(data.cac_max),
    custo_reuniao_max: Number(data.custo_reuniao_max),
  }
}

function calcularFunilComCfg(receita: number, cfg: EmpresaConfig, diasUteis: number) {
  const t = {
    qualificacao: cfg.taxa_qualificacao,
    agendamento: cfg.taxa_agendamento,
    comparecimento: cfg.taxa_comparecimento,
    fechamento: cfg.taxa_fechamento,
  }
  const vendas = Math.ceil(receita / cfg.ticket_medio)
  const comparec = Math.ceil(vendas / t.fechamento)
  const agend = Math.ceil(comparec / t.comparecimento)
  const qualif = Math.ceil(agend / t.agendamento)
  const leads = Math.ceil(qualif / t.qualificacao)
  const invest = Math.round(leads * cfg.cpl_medio)
  const cac = Math.round(invest / vendas)
  const custoReuniao = Math.round(invest / comparec)
  const du = diasUteis || 22

  return {
    receita,
    mensal: { vendas, comparecimentos: comparec, agendamentos: agend, qualificados: qualif, leads },
    diario: {
      vendas: Math.ceil(vendas / du),
      comparecimentos: Math.ceil(comparec / du),
      agendamentos: Math.ceil(agend / du),
      qualificados: Math.ceil(qualif / du),
      leads: Math.ceil(leads / du),
    },
    custos: {
      investimento_mensal: invest,
      investimento_diario: Math.round(invest / du),
      cac,
      custo_reuniao: custoReuniao,
    },
  }
}

export async function GET() {
  try {
    const cfg = await carregarConfig()
    const calendario = calendarioMesAtual()
    const { data: feriados } = await supabase
      .from('feriados')
      .select('data, nome')
      .eq('ativo', true)
      .order('data')

    const receitas: Record<NivelMeta, number> = {
      minima: cfg.receita_minima,
      alvo: cfg.receita_alvo,
      super: cfg.receita_super,
    }

    const funis = {
      minima: calcularFunilComCfg(receitas.minima, cfg, calendario.total),
      alvo: calcularFunilComCfg(receitas.alvo, cfg, calendario.total),
      super: calcularFunilComCfg(receitas.super, cfg, calendario.total),
    }

    const ativo = funis[cfg.nivel_meta]

    // SDR derivado do nível ativo
    const sdr_meta = {
      agendamentos_dia: cfg.sdr_agendamentos_dia,
      agendamentos_min: cfg.sdr_agendamentos_min,
      agendamentos_max: cfg.sdr_agendamentos_max,
      leads_dia: ativo.diario.leads,
      qualificados_dia: ativo.diario.qualificados,
      reunioes_dia: ativo.diario.comparecimentos,
      vendas_dia: ativo.diario.vendas,
      agendamentos_mes: ativo.mensal.agendamentos,
      leads_mes: ativo.mensal.leads,
      qualificados_mes: ativo.mensal.qualificados,
      reunioes_mes: ativo.mensal.comparecimentos,
      vendas_mes: ativo.mensal.vendas,
      receita_mes: ativo.receita,
    }

    // Gargalo: maior diferença entre meta e real
    const diffs = [
      { etapa: 'qualificacao' as const, meta: cfg.taxa_qualificacao, real: TAXAS_REAIS.qualificacao },
      { etapa: 'agendamento' as const, meta: cfg.taxa_agendamento, real: TAXAS_REAIS.agendamento },
      { etapa: 'comparecimento' as const, meta: cfg.taxa_comparecimento, real: TAXAS_REAIS.comparecimento },
      { etapa: 'fechamento' as const, meta: cfg.taxa_fechamento, real: TAXAS_REAIS.fechamento },
    ]
    const gargalo = diffs
      .map(d => ({ ...d, diff: d.meta - d.real }))
      .filter(d => d.diff > 0)
      .sort((a, b) => b.diff - a.diff)[0] || null

    // BI: alertas baseados nas taxas reais + cac atual
    const alertas = gerarAlertas({
      taxa_qualif: TAXAS_REAIS.qualificacao,
      taxa_agend: TAXAS_REAIS.agendamento,
      taxa_comp: TAXAS_REAIS.comparecimento,
      taxa_fech: TAXAS_REAIS.fechamento,
      cac: ativo.custos.cac,
      custo_reuniao: ativo.custos.custo_reuniao,
    })

    // Sensibilidade: a partir dos leads do nível ativo, quanto ganha otimizando cada taxa
    const sensibilidade = analisarSensibilidade(ativo.mensal.leads)

    // SDR ajustado ao meta ativo via função dinâmica
    const sdrDinamico = calcularMetasSDR(cfg.sdr_agendamentos_dia)

    return NextResponse.json({
      config: cfg,
      calendario,
      feriados: feriados || [],
      funis,
      ativo,
      sdr_meta,
      sdr_dinamico: sdrDinamico,
      taxas_reais: TAXAS_REAIS,
      limites: LIMITES,
      cac_zonas: CAC_ZONAS,
      cac_atual: { valor: ativo.custos.cac, zona: zonaCAC(ativo.custos.cac) },
      alertas,
      sensibilidade,
      gargalo: gargalo
        ? {
            etapa: gargalo.etapa,
            meta: gargalo.meta,
            real: gargalo.real,
            impacto_pct: Math.round(gargalo.diff * 100),
          }
        : null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const allowed = [
      'nivel_meta',
      'receita_minima',
      'receita_alvo',
      'receita_super',
      'ticket_medio',
      'cpl_medio',
      'cpl_max',
      'taxa_qualificacao',
      'taxa_agendamento',
      'taxa_comparecimento',
      'taxa_fechamento',
      'sdr_agendamentos_dia',
      'sdr_agendamentos_min',
      'sdr_agendamentos_max',
      'comissao_closer_pct',
      'cac_max',
      'custo_reuniao_max',
      'updated_by',
    ] as const

    const updates: Record<string, unknown> = {}
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k]
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'nenhum campo para atualizar' }, { status: 400 })
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('empresa_config')
      .update(updates)
      .eq('id', 1)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Recalcula funil depois do update
    const cfg = await carregarConfig()
    const cal = calendarioMesAtual()
    const funilNovo = calcularFunilComCfg(
      cfg.nivel_meta === 'minima'
        ? cfg.receita_minima
        : cfg.nivel_meta === 'super'
          ? cfg.receita_super
          : cfg.receita_alvo,
      cfg,
      cal.total,
    )

    return NextResponse.json({
      success: true,
      config: data,
      ativo: funilNovo,
      calendario: cal,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
