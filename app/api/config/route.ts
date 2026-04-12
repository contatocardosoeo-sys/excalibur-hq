import { NextResponse } from 'next/server'
import {
  DIAS_UTEIS_MES, SEMANAS_MES, isHojeDiaUtil,
  diasUteisPassados, diasUteisFaltando,
  FUNIL_ATIVO, FUNIL, SDR_METAS, COMERCIAL_METAS, TRAFEGO_METAS,
  RECEITA_METAS, META_ATIVA, TAXAS_META, TAXAS_REAIS, LIMITES,
  DESIGN_SLA_UTEIS, JORNADA_PRAZOS_UTEIS, detectarGargalo,
  TICKET_MEDIO, CPL_MEDIO, CPL_MAX,
} from '../../lib/config'

export async function GET() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1

  return NextResponse.json({
    hoje: {
      data: agora.toISOString().slice(0, 10),
      eh_dia_util: isHojeDiaUtil(),
      dias_uteis_mes: DIAS_UTEIS_MES,
      dias_uteis_passados: diasUteisPassados(ano, mes),
      dias_uteis_faltando: diasUteisFaltando(ano, mes),
      semanas_uteis_mes: SEMANAS_MES,
      mes, ano,
    },
    meta_ativa: META_ATIVA,
    receita: RECEITA_METAS,
    funil_ativo: FUNIL_ATIVO,
    todos_niveis: FUNIL,
    sdr: SDR_METAS,
    comercial: COMERCIAL_METAS,
    trafego: TRAFEGO_METAS,
    taxas: { meta: TAXAS_META, reais: TAXAS_REAIS },
    limites: LIMITES,
    design_sla: DESIGN_SLA_UTEIS,
    jornada_prazos: JORNADA_PRAZOS_UTEIS,
    gargalo: detectarGargalo(),
    constantes: {
      ticket_medio: TICKET_MEDIO,
      cpl_medio: CPL_MEDIO,
      cpl_max: CPL_MAX,
    },
  })
}
