import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Helper local (mesma lógica de app/lib/dias-uteis.ts)
function diasUteis(ano, mes) {
  let count = 0
  const dias = new Date(ano, mes, 0).getDate()
  for (let d = 1; d <= dias; d++) {
    const dt = new Date(ano, mes - 1, d)
    const dow = dt.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

await c.connect()

const ano = 2026
const mes = 4
const dias = diasUteis(ano, mes)
console.log(`📅 Abril ${ano}: ${dias} dias úteis`)

// Metas do SDR (Trindade) — baseadas em dias úteis
const sdrDiarias = {
  leads: 50,
  agendamentos_min: 10,
  agendamentos: 15,
  agendamentos_max: 20,
  comparecimentos: 8,  // estimativa 8/dia
  vendas: 1,           // estimativa 1/dia
}

const sdrMensais = {
  meta_leads: sdrDiarias.leads * dias,
  meta_leads_dia: sdrDiarias.leads,
  meta_agendamentos: sdrDiarias.agendamentos * dias,
  meta_agendamentos_min: sdrDiarias.agendamentos_min * dias,
  meta_agendamentos_max: sdrDiarias.agendamentos_max * dias,
  meta_agendamentos_dia: sdrDiarias.agendamentos,
  meta_agendamentos_dia_min: sdrDiarias.agendamentos_min,
  meta_agendamentos_dia_max: sdrDiarias.agendamentos_max,
  meta_comparecimentos: sdrDiarias.comparecimentos * dias,
  meta_vendas: sdrDiarias.vendas * dias,
}

console.log('\n📊 Metas SDR mensais (22 dias úteis):')
Object.entries(sdrMensais).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

await c.query(`
  UPDATE metas_sdr SET
    meta_leads = $1,
    meta_leads_dia = $2,
    meta_agendamentos = $3,
    meta_agendamentos_min = $4,
    meta_agendamentos_max = $5,
    meta_agendamentos_dia = $6,
    meta_agendamentos_dia_min = $7,
    meta_agendamentos_dia_max = $8,
    meta_comparecimentos = $9,
    meta_vendas = $10
  WHERE sdr_email = 'trindade.excalibur@gmail.com' AND mes = $11 AND ano = $12
`, [
  sdrMensais.meta_leads,
  sdrMensais.meta_leads_dia,
  sdrMensais.meta_agendamentos,
  sdrMensais.meta_agendamentos_min,
  sdrMensais.meta_agendamentos_max,
  sdrMensais.meta_agendamentos_dia,
  sdrMensais.meta_agendamentos_dia_min,
  sdrMensais.meta_agendamentos_dia_max,
  sdrMensais.meta_comparecimentos,
  sdrMensais.meta_vendas,
  mes, ano,
])
console.log('✅ metas_sdr atualizada')

// metas_closer — também baseada em dias úteis
// Guilherme: meta de 5 fechamentos/semana = 1/dia útil
const closerDiarias = {
  reunioes: 2,      // 2 reuniões/dia útil = 44/mês
  fechamentos: 1,   // 1 fechamento/dia útil = 22/mês
  mrr: 2500,        // meta mrr por fechamento = R$55.000/mês
}

// Check se metas_closer existe com linha pro Guilherme
const existe = await c.query(`SELECT id FROM metas_closer WHERE closer_email='guilherme.excalibur@gmail.com' AND mes=$1 AND ano=$2`, [mes, ano])
if (existe.rows.length === 0) {
  await c.query(`
    INSERT INTO metas_closer (closer_email, mes, ano, meta_reunioes, meta_fechamentos, meta_mrr, comissao_pct)
    VALUES ('guilherme.excalibur@gmail.com', $1, $2, $3, $4, $5, 10)
  `, [mes, ano, closerDiarias.reunioes * dias, closerDiarias.fechamentos * dias, closerDiarias.mrr * dias])
  console.log('✅ metas_closer CRIADA pra Guilherme')
} else {
  await c.query(`
    UPDATE metas_closer SET
      meta_reunioes = $1,
      meta_fechamentos = $2,
      meta_mrr = $3
    WHERE closer_email='guilherme.excalibur@gmail.com' AND mes=$4 AND ano=$5
  `, [closerDiarias.reunioes * dias, closerDiarias.fechamentos * dias, closerDiarias.mrr * dias, mes, ano])
  console.log('✅ metas_closer atualizada')
}

// Verificar
const v1 = await c.query(`SELECT * FROM metas_sdr WHERE sdr_email='trindade.excalibur@gmail.com' AND mes=$1 AND ano=$2`, [mes, ano])
const v2 = await c.query(`SELECT * FROM metas_closer WHERE closer_email='guilherme.excalibur@gmail.com' AND mes=$1 AND ano=$2`, [mes, ano])
console.log('\n📋 VERIFICAÇÃO FINAL:')
console.log('SDR:', v1.rows[0])
console.log('CLOSER:', v2.rows[0])

await c.end()
