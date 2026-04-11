import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a,l) => {
  const i = l.indexOf('=')
  if (i > 0) a[l.slice(0,i).trim()] = l.slice(i+1).trim()
  return a
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const email = 'jessica.excalibur@gmail.com'
const senha = 'excalibur10'

// 1. Check if user exists in auth
const { data: list } = await sb.auth.admin.listUsers()
let user = list?.users?.find(u => u.email === email)

if (!user) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (error) { console.error('Auth erro:', error.message); process.exit(1) }
  user = data.user
  console.log('✅ Auth criado:', user.email)
} else {
  await sb.auth.admin.updateUserById(user.id, { password: senha })
  console.log('✅ Auth já existe, senha atualizada:', user.email)
}

// 2. Upsert em usuarios_internos
const { error: e2 } = await sb.from('usuarios_internos').upsert({
  email,
  nome: 'Jéssica',
  role: 'head_traffic',
  roles: ['head_traffic'],
  ativo: true,
}, { onConflict: 'email' })

if (e2) { console.error('usuarios_internos erro:', e2.message); process.exit(1) }
console.log('✅ usuarios_internos: Jéssica (head_traffic)')

// 3. Verificar
const { data: final } = await sb.from('usuarios_internos').select('*').eq('email', email).single()
console.log('RESULTADO:', final)
