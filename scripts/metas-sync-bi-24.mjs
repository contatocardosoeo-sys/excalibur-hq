// Sync DB to BI spec 24% fechamento
import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

const TICKET = 2000
const CPL = 10.70
const T = { qualificacao: 0.70, agendamento: 0.35, comparecimento: 0.70, fechamento: 0.24 }
const DIAS_UTEIS = 22

function calcular(receita) {
  const vendas = Math.ceil(receita / TICKET)
  const comparec = Math.ceil(vendas / T.fechamento)
  const agend = Math.ceil(comparec / T.comparecimento)
  const qualif = Math.ceil(agend / T.agendamento)
  const leads = Math.ceil(qualif / T.qualificacao)
  const invest = Math.round(leads * CPL)
  const cac = Math.round(invest / vendas)
  const custoReuniao = Math.round(invest / comparec)
  return { vendas, comparec, agend, qualif, leads, invest, cac, custoReuniao }
}

const niveis = [
  { nivel: 'minima', ativo: false, receita: 74000 },
  { nivel: 'alvo',   ativo: true,  receita: 90000 },
  { nivel: 'super',  ativo: false, receita: 106000 },
]

await c.connect()

await c.query(`
  UPDATE empresa_config SET
    taxa_fechamento = 0.24,
    sdr_agendamentos_dia = 12,
    sdr_agendamentos_min = 10,
    sdr_agendamentos_max = 15,
    updated_at = now(),
    updated_by = 'bi-sync-24'
  WHERE id = 1
`)
console.log('✅ empresa_config: taxa_fech 24%, sdr 12/dia (min 10 / max 15)')

for (const n of niveis) {
  const f = calcular(n.receita)
  console.log(`\n📊 ${n.nivel.toUpperCase()} (R$${n.receita.toLocaleString('pt-BR')}):`)
  console.log(`  Vendas:${f.vendas} Reun:${f.comparec} Agend:${f.agend} Qualif:${f.qualif} Leads:${f.leads}`)
  console.log(`  Invest:R$${f.invest} CAC:R$${f.cac} Custo/reun:R$${f.custoReuniao}`)

  await c.query(`
    UPDATE funil_metas SET
      ativo = $2,
      receita_meta = $3,
      vendas_mes = $4,
      comparecimentos_mes = $5,
      agendamentos_mes = $6,
      qualificados_mes = $7,
      leads_mes = $8,
      investimento_mensal = $9,
      cac_meta = $10,
      custo_reuniao_meta = $11,
      taxa_fechamento = 0.24,
      updated_at = now()
    WHERE nivel = $1
  `, [n.nivel, n.ativo, n.receita, f.vendas, f.comparec, f.agend, f.qualif, f.leads, f.invest, f.cac, f.custoReuniao])
}
console.log('\n✅ funil_metas recalculado')

// metas_sdr Trindade — 12 agend/dia com taxa 24%
const agendDia = 12
const reunDia = Math.floor(agendDia * 0.70)  // 8 (meta de comparec 70%)
const vendasDia = Math.ceil(reunDia * 0.24)   // 2
const qualifDia = Math.ceil(agendDia / 0.35)  // 35
const leadsDia = Math.ceil(qualifDia / 0.70)  // 50

await c.query(`
  UPDATE metas_sdr SET
    meta_leads = $1,
    meta_leads_dia = $2,
    meta_contatos = $1,
    meta_contatos_dia = $2,
    qualificados_mes = $3,
    qualificados_dia = $4,
    meta_agendamentos = $5,
    meta_agendamentos_dia = $6,
    meta_agendamentos_dia_min = 10,
    meta_agendamentos_dia_max = 15,
    agendamentos_semana = $7,
    meta_comparecimentos = $8,
    meta_vendas = $9,
    noshow_esperado_dia = $10,
    taxa_comparecimento = 0.70,
    taxa_agendamento = 0.35,
    taxa_fechamento = 0.24,
    dias_uteis_mes = $11,
    receita_meta = 90000,
    ticket_medio = 2000,
    cpl_meta = 10.70,
    investimento_mensal = $12,
    nivel_meta = 'alvo'
  WHERE sdr_email = 'trindade.excalibur@gmail.com' AND mes = 4 AND ano = 2026
`, [
  leadsDia * DIAS_UTEIS,
  leadsDia,
  qualifDia * DIAS_UTEIS,
  qualifDia,
  agendDia * DIAS_UTEIS,
  agendDia,
  Math.ceil((agendDia * DIAS_UTEIS) / 4.4),
  reunDia * DIAS_UTEIS,
  vendasDia * DIAS_UTEIS,
  agendDia - reunDia,
  DIAS_UTEIS,
  Math.round(leadsDia * DIAS_UTEIS * CPL),
])
console.log(`\n✅ metas_sdr Trindade: ${agendDia}/dia, ${reunDia} reun, ${vendasDia} vendas`)

// metas_closer Guilherme
await c.query(`
  UPDATE metas_closer SET
    meta_reunioes = $1,
    meta_fechamentos = $2,
    meta_mrr = 90000
  WHERE closer_email = 'guilherme.excalibur@gmail.com' AND mes = 4 AND ano = 2026
`, [reunDia * DIAS_UTEIS, vendasDia * DIAS_UTEIS])
console.log(`✅ metas_closer Guilherme: ${reunDia * DIAS_UTEIS} reun, ${vendasDia * DIAS_UTEIS} fech`)

// Verificar
const fm = await c.query('SELECT nivel, receita_meta, vendas_mes, comparecimentos_mes, agendamentos_mes, leads_mes, cac_meta FROM funil_metas ORDER BY receita_meta')
console.log('\n📋 funil_metas:')
fm.rows.forEach(r => console.log(' ', r))

await c.end()
console.log('\n✅ Sync BI 24% concluída')
