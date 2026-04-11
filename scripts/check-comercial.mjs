import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a,l) => {
  const i = l.indexOf('=')
  if (i > 0) a[l.slice(0,i).trim()] = l.slice(i+1).trim()
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { count } = await sb.from('pipeline_closer').select('*', { count: 'exact', head: true })
console.log('pipeline_closer count:', count)

const { data } = await sb.from('pipeline_closer').select('id, status, data_reuniao, mrr_proposto').limit(5)
console.log('pipeline_closer sample:', data)

const { data: f } = await sb.from('funil_trafego').select('*').eq('mes', 4).eq('ano', 2026).maybeSingle()
console.log('funil_trafego abril 2026:', f)
