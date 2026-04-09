import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const emails = [
  'contato.cardosoeo@gmail.com',
  'luanacaira.excalibur@gmail.com',
  'brunomedina.contato@gmail.com',
  'guilherme.excalibur@gmail.com',
  'trindade.excalibur@gmail.com',
]

const senha = process.argv[2] || '123456'

const { data } = await supabase.auth.admin.listUsers()
for (const email of emails) {
  const user = data?.users?.find(u => u.email === email)
  if (!user) { console.log(`SKIP: ${email} (nao encontrado)`); continue }
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: senha })
  console.log(error ? `ERRO ${email}: ${error.message}` : `OK: ${email} → ${senha}`)
}
