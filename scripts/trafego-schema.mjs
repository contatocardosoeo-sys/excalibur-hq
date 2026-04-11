import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a,l) => {
  const i = l.indexOf('=')
  if (i > 0) a[l.slice(0,i).trim()] = l.slice(i+1).trim()
  return a
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Check clinicas schema
const { data: c } = await sb.from('clinicas').select('*').limit(1)
console.log('CLINICAS keys:', c?.[0] ? Object.keys(c[0]) : 'empty')

const { count } = await sb.from('clinicas').select('*', { count: 'exact', head: true })
console.log('TOTAL clinicas:', count)

const { data: u } = await sb.from('usuarios_internos').select('email, role, roles').limit(2)
console.log('USERS keys:', u?.[0] ? Object.keys(u[0]) : 'empty', u)
