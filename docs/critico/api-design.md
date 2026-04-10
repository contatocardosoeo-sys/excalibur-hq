# API Design — Excalibur HQ

REST com Next.js Route Handlers + Supabase service-role.

## Padrão do projeto

```ts
// app/api/recurso/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const { data, error } = await supabase.from('tabela').select('*').eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Validar inputs
  if (!body.nome) return NextResponse.json({ error: 'nome required' }, { status: 400 })
  const { data, error } = await supabase.from('tabela').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const { data, error } = await supabase.from('tabela').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
```

## Status codes
- 200 — sucesso (GET/PATCH)
- 201 — created (POST)
- 400 — input inválido
- 401 — não autenticado
- 403 — não autorizado (role errado)
- 404 — não encontrado
- 500 — erro interno

## Validação
- Sempre validar inputs no POST/PATCH
- Tipos de dados, ranges, formato
- Mensagens de erro em pt-BR

## Padrões de resposta
```json
// Sucesso
{ "data": [...], "totais": {...} }
{ "success": true, "data": {...} }

// Erro
{ "error": "mensagem clara" }
```

## Filtros via query params
```ts
// /api/sdr/metricas?email=x&periodo=mes&start=2026-04-01
const periodo = req.nextUrl.searchParams.get('periodo') || 'mes'
const email = req.nextUrl.searchParams.get('email') || 'default@x.com'
```

## Erros comuns evitados
- Não esquecer `await req.json()`
- Não retornar `data` direto sem `NextResponse.json()`
- Não fazer query sem checar `error`
