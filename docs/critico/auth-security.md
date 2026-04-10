# Auth & Security — Excalibur HQ

## Autenticação (Supabase Auth)
- Email + senha (mínimo 6 chars)
- Sessions via cookies (httpOnly)
- `usuarios_internos` tabela espelha auth.users + roles

## Roles (RBAC)
- `admin` — Cardoso, Luana
- `cs` — Medina
- `sdr` — Trindade
- `closer` — Guilherme
- `cmo` — Guilherme

Usuário pode ter múltiplos roles via `roles[]` (array).

## Middleware
`middleware.ts` na raiz:
1. Verifica session via cookies
2. Busca user em `usuarios_internos`
3. Mapeia rota → roles permitidos (`ROUTE_ROLES`)
4. Redireciona se não autorizado

## Proteção de APIs
- APIs server-side usam **service-role** (bypass RLS)
- IMPORTANTE: validar user no handler se for ação sensível
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
```

## Secrets
- Tudo em `.env.local` (gitignored)
- Vercel env vars para produção
- NUNCA hardcode tokens, senhas, connection strings

## OWASP Top 10 — checklist rápido
- [x] Injection: usar parameterized queries (Supabase faz isso)
- [x] Broken Auth: Supabase Auth + RLS
- [x] Sensitive Data: HTTPS, env vars, RLS
- [x] XXE: não usamos XML
- [x] Broken Access Control: middleware + role checks
- [x] Security Misconfig: headers via Next.js
- [x] XSS: React escapa automaticamente
- [x] Insecure Deserialization: validar JSON inputs
- [x] Components: npm audit periodicamente
- [x] Logging: console.error em prod via Vercel logs

## Evitar
- ❌ `dangerouslySetInnerHTML` sem sanitização
- ❌ Aceitar HTML do user sem escape
- ❌ Logs com PII (CPF, senha, token)
- ❌ Criar usuário sem verificar email
- ❌ Service role no browser (NUNCA)
