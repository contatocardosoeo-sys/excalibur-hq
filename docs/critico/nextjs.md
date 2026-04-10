# Next.js 16 — Excalibur HQ

App Router · React 19 · Server Components

## Estrutura
- `app/(hq)/` — rotas privadas com sidebar
- `app/api/*` — API routes (route handlers)
- `app/layout.tsx` — root layout (server)
- `app/(hq)/layout.tsx` — layout autenticado (client)

## Páginas
- `'use client'` no topo se usa hooks/eventos
- Server components por padrão (fetch direto, sem useEffect)
- Metadata por rota: `export const metadata = { title: 'X' }`

## API Routes
```ts
// app/api/exemplo/route.ts
import { NextRequest, NextResponse } from 'next/server'
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true })
}
export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ data: body })
}
```

## Middleware
- `middleware.ts` na raiz controla auth + roles (RBAC)
- Mapeamento `ROUTE_ROLES` define quem acessa cada rota

## Cache
- `fetch(url, { next: { revalidate: 60 } })` — ISR
- `fetch(url, { cache: 'no-store' })` — sem cache (default em dev)

## Padrões do projeto
- Sempre Supabase service-role nas APIs (bypass RLS)
- Sempre tratar `error` e retornar 500 com `{ error: msg }`
- Imports relativos: `'../../components/Sidebar'`
