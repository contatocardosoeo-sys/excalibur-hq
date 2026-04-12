import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Funil calculado a partir da receita (mesma lógica do lib/metas-funil.ts)
const TICKET = 2000
const CPL = 10.70
const TAXAS = { qualificacao: 0.70, agendamento: 0.35, comparecimento: 0.70, fechamento: 0.30 }

function calcular(receita) {
  const vendas = Math.ceil(receita / TICKET)
  const comparec = Math.ceil(vendas / TAXAS.fechamento)
  const agend = Math.ceil(comparec / TAXAS.comparecimento)
  const qualif = Math.ceil(agend / TAXAS.agendamento)
  const leads = Math.ceil(qualif / TAXAS.qualificacao)
  const invest = Math.round(leads * CPL)
  const cac = Math.round(invest / vendas)
  const custoReuniao = Math.round(invest / comparec)
  return { vendas, comparec, agend, qualif, leads, invest, cac, custoReuniao }
}

const niveis = [
  { nivel: 'minima', ativo: false, receita: 74000 },
  { nivel: 'alvo', ativo: true, receita: 90000 },
  { nivel: 'super', ativo: false, receita: 106000 },
]

await c.connect()

// 1. Criar tabela funil_metas
await c.query(`
  CREATE TABLE IF NOT EXISTS funil_metas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel text NOT NULL UNIQUE,
    ativo boolean DEFAULT false,
    receita_meta numeric NOT NULL,
    ticket_medio numeric DEFAULT 2000,
    vendas_mes int NOT NULL,
    comparecimentos_mes int NOT NULL,
    agendamentos_mes int NOT NULL,
    qualificados_mes int NOT NULL,
    leads_mes int NOT NULL,
    cpl_meta numeric DEFAULT 10.70,
    investimento_mensal numeric NOT NULL,
    cac_meta numeric NOT NULL,
    custo_reuniao_meta numeric NOT NULL,
    taxa_qualificacao numeric DEFAULT 0.70,
    taxa_agendamento numeric DEFAULT 0.35,
    taxa_comparecimento numeric DEFAULT 0.70,
    taxa_fechamento numeric DEFAULT 0.30,
    updated_at timestamptz DEFAULT now()
  )
`)
console.log('✅ Tabela funil_metas criada')

// 2. Upsert dos 3 níveis
for (const n of niveis) {
  const f = calcular(n.receita)
  console.log(`\n📊 ${n.nivel.toUpperCase()} (R$${n.receita.toLocaleString('pt-BR')}/mês):`)
  console.log(`  Vendas: ${f.vendas} · Comparec: ${f.comparec} · Agend: ${f.agend} · Qualif: ${f.qualif} · Leads: ${f.leads}`)
  console.log(`  Invest: R$${f.invest} · CAC: R$${f.cac} · Custo/reunião: R$${f.custoReuniao}`)

  await c.query(`
    INSERT INTO funil_metas (nivel, ativo, receita_meta, ticket_medio,
      vendas_mes, comparecimentos_mes, agendamentos_mes, qualificados_mes, leads_mes,
      cpl_meta, investimento_mensal, cac_meta, custo_reuniao_meta,
      taxa_qualificacao, taxa_agendamento, taxa_comparecimento, taxa_fechamento)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (nivel) DO UPDATE SET
      ativo = EXCLUDED.ativo,
      receita_meta = EXCLUDED.receita_meta,
      vendas_mes = EXCLUDED.vendas_mes,
      comparecimentos_mes = EXCLUDED.comparecimentos_mes,
      agendamentos_mes = EXCLUDED.agendamentos_mes,
      qualificados_mes = EXCLUDED.qualificados_mes,
      leads_mes = EXCLUDED.leads_mes,
      investimento_mensal = EXCLUDED.investimento_mensal,
      cac_meta = EXCLUDED.cac_meta,
      custo_reuniao_meta = EXCLUDED.custo_reuniao_meta,
      updated_at = now()
  `, [
    n.nivel, n.ativo, n.receita, TICKET,
    f.vendas, f.comparec, f.agend, f.qualif, f.leads,
    CPL, f.invest, f.cac, f.custoReuniao,
    TAXAS.qualificacao, TAXAS.agendamento, TAXAS.comparecimento, TAXAS.fechamento,
  ])
}
console.log('\n✅ 3 níveis upserted')

// 3. Adicionar colunas faltantes em metas_sdr
await c.query(`
  ALTER TABLE metas_sdr
    ADD COLUMN IF NOT EXISTS qualificados_mes int DEFAULT 615,
    ADD COLUMN IF NOT EXISTS receita_meta numeric DEFAULT 90000,
    ADD COLUMN IF NOT EXISTS ticket_medio numeric DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS cpl_meta numeric DEFAULT 10.70,
    ADD COLUMN IF NOT EXISTS investimento_mensal numeric DEFAULT 9405,
    ADD COLUMN IF NOT EXISTS cac_meta numeric DEFAULT 209,
    ADD COLUMN IF NOT EXISTS nivel_meta text DEFAULT 'alvo'
`)
console.log('✅ metas_sdr: colunas adicionadas')

// 4. Atualizar Trindade com valores do nível ALVO
const alvo = calcular(90000)
await c.query(`
  UPDATE metas_sdr SET
    meta_leads = $1,
    meta_leads_dia = $2,
    meta_contatos = $3,
    meta_contatos_dia = $4,
    qualificados_mes = $5,
    meta_agendamentos = $6,
    meta_agendamentos_dia = $7,
    meta_comparecimentos = $8,
    meta_vendas = $9,
    receita_meta = 90000,
    ticket_medio = 2000,
    cpl_meta = 10.70,
    investimento_mensal = $10,
    cac_meta = $11,
    nivel_meta = 'alvo'
  WHERE sdr_email = 'trindade.excalibur@gmail.com' AND mes = 4 AND ano = 2026
`, [
  alvo.leads,
  Math.ceil(alvo.leads / 22),
  alvo.leads,  // contatos_mes = leads (100% dos leads viram contatos)
  Math.ceil(alvo.leads / 22),
  alvo.qualif,
  alvo.agend,
  Math.ceil(alvo.agend / 22),
  alvo.comparec,
  alvo.vendas,
  alvo.invest,
  alvo.cac,
])
console.log(`✅ Trindade atualizado com nível ALVO: ${alvo.leads} leads, ${alvo.agend} agend, ${alvo.comparec} comp, ${alvo.vendas} vendas`)

// 5. Atualizar Guilherme (closer)
await c.query(`
  UPDATE metas_closer SET
    meta_reunioes = $1,
    meta_fechamentos = $2,
    meta_mrr = $3
  WHERE closer_email = 'guilherme.excalibur@gmail.com' AND mes = 4 AND ano = 2026
`, [alvo.comparec, alvo.vendas, 90000])
console.log(`✅ Guilherme atualizado: ${alvo.comparec} reuniões, ${alvo.vendas} fechamentos, R$90k MRR`)

// 6. Verificar
const verif = await c.query(`SELECT nivel, receita_meta, vendas_mes, comparecimentos_mes, agendamentos_mes, leads_mes, investimento_mensal, cac_meta FROM funil_metas ORDER BY receita_meta`)
console.log('\n📋 funil_metas:')
verif.rows.forEach(r => console.log(' ', r))

await c.end()
