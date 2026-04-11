import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a,l) => {
  const i = l.indexOf('=')
  if (i > 0 && !l.startsWith('#')) a[l.slice(0,i).trim()] = l.slice(i+1).trim()
  return a
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const USERS = [
  {
    email: 'juan.excalibur@gmail.com',
    nome: 'Juan',
    role: 'editor_video',
    senha: 'excalibur10',
  },
  {
    email: 'vinicius.excalibur@gmail.com',
    nome: 'Vinicius',
    role: 'designer',
    senha: 'excalibur10',
  },
]

const { data: list } = await sb.auth.admin.listUsers()

for (const u of USERS) {
  let user = list?.users?.find(x => x.email === u.email)
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.senha,
      email_confirm: true,
    })
    if (error) { console.error('Auth erro:', u.email, error.message); continue }
    user = data.user
    console.log(`✅ Auth criado: ${u.email}`)
  } else {
    await sb.auth.admin.updateUserById(user.id, { password: u.senha })
    console.log(`✅ Auth atualizado: ${u.email}`)
  }

  const { error: e2 } = await sb.from('usuarios_internos').upsert({
    email: u.email,
    nome: u.nome,
    role: u.role,
    roles: [u.role],
    ativo: true,
  }, { onConflict: 'email' })

  if (e2) console.error(`usuarios_internos erro ${u.email}:`, e2.message)
  else console.log(`✅ usuarios_internos: ${u.nome} (${u.role})`)
}

const { data: all } = await sb.from('usuarios_internos').select('email, nome, role').in('email', USERS.map(u => u.email))
console.log('\nResultado:', all)
