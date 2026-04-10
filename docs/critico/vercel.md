# Vercel — Excalibur HQ

Deploy: `excalibur-hq.vercel.app`

## Deploy manual
```bash
npx vercel --prod --token "$VERCEL_TOKEN"
```

Token vive em .env.local — NUNCA commitar.

## Auto-deploy
- Push em `main` → deploy automático produção
- Push em outras branches → preview deploy

## Env vars (Vercel dashboard)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `ANTHROPIC_API_KEY` (server-only)

## Build
- Next.js 16 com Turbopack
- Build local: `npm run build`
- Verificar em produção: `https://excalibur-hq.vercel.app`

## Edge functions vs Node
- API routes em Next.js 16 = Node.js por padrão
- Para edge: `export const runtime = 'edge'`
- Middleware sempre roda no edge

## Troubleshooting
- Deploy falhou? Ver logs no dashboard
- Build local passou mas deploy falhou? Checar env vars
- 404 em rota nova? Verificar se foi commitada e pushada
- API retorna 500? Ver Function Logs no Vercel
