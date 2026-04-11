import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a,l) => {
  const i = l.indexOf('=')
  if (i > 0) a[l.slice(0,i).trim()] = l.slice(i+1).trim()
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// getWeekString clone
function getWeekString(date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

const semana = getWeekString(new Date())
console.log('Semana ISO:', semana)

const { data } = await sb.from('adocao_clinica').select('clinica_id, score, semana').eq('semana', semana).limit(5)
console.log('Sample for semana:', data?.length, data?.slice(0, 2))

const { data: c } = await sb.from('clinicas').select('id, nome, score_total').eq('ativo', true).limit(5)
console.log('Clinicas score_total sample:', c)

// Test painel API call locally
const r = await fetch('https://excalibur-hq.vercel.app/api/cs/painel').then(r => r.json())
console.log('API painel kpis:', r.kpis)
