# Supabase — Excalibur HQ

URL: `https://hluhlsnodndpskrkbjuw.supabase.co`

## Clientes

### Browser (anon key) — sujeito a RLS
```ts
import { createBrowserClient } from '@supabase/ssr'
const supabase = createBrowserClient(URL, ANON_KEY)
```

### Server (service-role) — bypass RLS
```ts
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## Auth

### Login
```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})
```

### Session
```ts
const { data: { session } } = await supabase.auth.getSession()
const email = session?.user?.email
```

### Admin (criar usuário, mudar senha)
```ts
// SO no servidor com service-role
await supabase.auth.admin.createUser({ email, password, email_confirm: true })
await supabase.auth.admin.updateUserById(id, { password: 'nova' })
```

## Queries

### Select com filtros
```ts
const { data, error } = await supabase
  .from('clinicas')
  .select('id, nome, plano')
  .eq('ativo', true)
  .order('nome')
```

### Insert/Upsert
```ts
await supabase.from('tabela').insert({ campo: 'valor' })
await supabase.from('tabela').upsert(
  { id, campo: 'valor' },
  { onConflict: 'id' }
)
```

### Update
```ts
await supabase.from('tabela').update({ ativo: false }).eq('id', id)
```

## Padrões do projeto
- APIs sempre com service-role (bypass RLS)
- Frontend que precisa listar tudo: criar API
- Sempre tratar `error` antes de usar `data`
- Limpar dados de teste com `delete().neq('id', '00000000...')` ou DELETE no SQL
