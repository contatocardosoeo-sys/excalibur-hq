import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a,l) => {
  const i = l.indexOf('=')
  if (i > 0) a[l.slice(0,i).trim()] = l.slice(i+1).trim()
  return a
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 1. 3 gestores
const gestoresSeed = [
  { nome: 'Rafael Silva', email: 'rafael.trafego@excalibur.com', whatsapp: '11999001001' },
  { nome: 'Amanda Costa', email: 'amanda.trafego@excalibur.com', whatsapp: '11999001002' },
  { nome: 'Diego Martins', email: 'diego.trafego@excalibur.com', whatsapp: '11999001003' },
]

const gestoresInseridos = []
for (const g of gestoresSeed) {
  const { data: exist } = await sb.from('gestores_trafego').select('id').eq('email', g.email).maybeSingle()
  if (exist) {
    gestoresInseridos.push({ ...g, id: exist.id })
    continue
  }
  const { data, error } = await sb.from('gestores_trafego').insert(g).select().single()
  if (error) { console.error('Gestor erro:', error.message); continue }
  gestoresInseridos.push(data)
}
console.log(`✅ ${gestoresInseridos.length} gestores`)

// 2. Vincular 10 primeiras clínicas
const { data: clinicas } = await sb.from('clinicas').select('id, nome').order('nome').limit(10)
console.log(`📍 ${clinicas?.length} clínicas para vincular`)

const plataformas = ['meta', 'google', 'multi']
const statuses = ['ativo', 'ativo', 'ativo', 'ativo', 'ativo', 'ativo', 'ativo', 'pausado', 'ativo', 'problema']

const vinculos = []
const lista = clinicas || []
for (let i = 0; i < lista.length; i++) {
  const c = lista[i]
  const gestor = gestoresInseridos[i % gestoresInseridos.length]
  const vinculo = {
    clinica_id: c.id,
    gestor_id: gestor.id,
    plataforma: plataformas[i % plataformas.length],
    investimento_mensal: Math.floor(Math.random() * 4000) + 1500,
    meta_leads: Math.floor(Math.random() * 30) + 20,
    meta_cpl: Math.floor(Math.random() * 10) + 12,
    status: statuses[i],
  }
  const { data, error } = await sb.from('trafego_clinica').upsert(vinculo, { onConflict: 'clinica_id' }).select().single()
  if (error) { console.error('Vinculo erro:', error.message); continue }
  vinculos.push(data)
}
console.log(`✅ ${vinculos.length} vínculos`)

// 3. Métricas dos últimos 7 dias
let metricasCount = 0
for (const v of vinculos) {
  if (v.status !== 'ativo') continue
  for (let d = 1; d <= 7; d++) {
    const dt = new Date()
    dt.setDate(dt.getDate() - d)
    const dataStr = dt.toISOString().split('T')[0]
    const leads = Math.floor(Math.random() * 15) + 3
    const investimento = Math.floor(Math.random() * 200) + 80
    const cliques = Math.floor(Math.random() * 200) + 30
    const impressoes = cliques * (Math.floor(Math.random() * 30) + 20)
    const metrica = {
      clinica_id: v.clinica_id,
      gestor_id: v.gestor_id,
      data: dataStr,
      leads, investimento,
      cpl: Math.round((investimento / leads) * 100) / 100,
      cpc: Math.round((investimento / cliques) * 100) / 100,
      ctr: Math.round((cliques / impressoes) * 10000) / 100,
      impressoes, cliques,
      alcance: Math.floor(impressoes * 0.6),
      frequencia: Math.round((impressoes / (impressoes * 0.6)) * 100) / 100,
    }
    const { error } = await sb.from('trafego_metricas').upsert(metrica, { onConflict: 'clinica_id,data' })
    if (!error) metricasCount++
  }
}
console.log(`✅ ${metricasCount} métricas (7 dias)`)

// 4. Atualizar clinicas_count dos gestores
for (const g of gestoresInseridos) {
  const { count } = await sb.from('trafego_clinica').select('*', { count: 'exact', head: true }).eq('gestor_id', g.id)
  await sb.from('gestores_trafego').update({ clinicas_count: count || 0 }).eq('id', g.id)
}
console.log('✅ clinicas_count atualizado')

console.log('\n🎯 SEED COMPLETO')
