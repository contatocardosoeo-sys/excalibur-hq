import pg from 'pg'
const c = new pg.Client({
  connectionString: 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})
await c.connect()

// adocao_clinica.score é GENERATED a partir de booleans:
// 5 + 5 + 5 + 5 + 10 + 5 + 5 + 5 + 5 + 10 + 10 + 10 + 10 + 10 = 100 max
// Estratégia: setar booleans baseado em clinicas.fase

// FASE 'escala' (8) → score ~85 → todos true exceto 2 (vendas_recorrentes, roi_positivo half)
const updEscala = `
  UPDATE adocao_clinica SET
    assistiu_onboarding = true,
    participa_aulas_ao_vivo = true,
    assiste_gravado = true,
    usa_crm = true,
    responde_leads = true,
    usa_script = true,
    preenche_funil_diario = true,
    campanha_ativa = true,
    leads_chegando = true,
    taxa_resposta_boa = true,
    segue_processo = true,
    realizou_vendas = true,
    vendas_recorrentes = true,
    roi_positivo = false
  WHERE clinica_id IN (SELECT id FROM clinicas WHERE fase = 'escala')
`

// FASE 'adocao' (39) → score ~65 → 12 booleans true
const updAdocao = `
  UPDATE adocao_clinica SET
    assistiu_onboarding = true,
    participa_aulas_ao_vivo = false,
    assiste_gravado = true,
    usa_crm = true,
    responde_leads = true,
    usa_script = true,
    preenche_funil_diario = true,
    campanha_ativa = true,
    leads_chegando = true,
    taxa_resposta_boa = false,
    segue_processo = true,
    realizou_vendas = true,
    vendas_recorrentes = false,
    roi_positivo = false
  WHERE clinica_id IN (SELECT id FROM clinicas WHERE fase = 'adocao')
`

// FASE 'onboarding' (1) → score ~30
const updOnboarding = `
  UPDATE adocao_clinica SET
    assistiu_onboarding = true,
    participa_aulas_ao_vivo = false,
    assiste_gravado = false,
    usa_crm = true,
    responde_leads = true,
    usa_script = false,
    preenche_funil_diario = false,
    campanha_ativa = false,
    leads_chegando = false,
    taxa_resposta_boa = false,
    segue_processo = false,
    realizou_vendas = false,
    vendas_recorrentes = false,
    roi_positivo = false
  WHERE clinica_id IN (SELECT id FROM clinicas WHERE fase = 'onboarding')
`

const r1 = await c.query(updEscala)
console.log(`✅ ESCALA: ${r1.rowCount} clínicas atualizadas`)

const r2 = await c.query(updAdocao)
console.log(`✅ ADOÇÃO: ${r2.rowCount} clínicas atualizadas`)

const r3 = await c.query(updOnboarding)
console.log(`✅ ONBOARDING: ${r3.rowCount} clínicas atualizadas`)

// Sincronizar clinicas.score_total com adocao_clinica.score (semana atual)
const sync = await c.query(`
  UPDATE clinicas c SET score_total = a.score
  FROM adocao_clinica a
  WHERE a.clinica_id = c.id AND a.semana = '2026-W15'
`)
console.log(`✅ score_total sincronizado: ${sync.rowCount} clínicas`)

// Verificar resultado
const ag = await c.query(`SELECT MIN(score), MAX(score), AVG(score)::int FROM adocao_clinica WHERE semana='2026-W15'`)
console.log('Resultado adocao_clinica:', ag.rows[0])

const ag2 = await c.query(`SELECT MIN(score_total), MAX(score_total), AVG(score_total)::int FROM clinicas WHERE ativo=true`)
console.log('Resultado clinicas:', ag2.rows[0])

await c.end()
