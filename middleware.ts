import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Mapeamento de rotas por roles permitidos
const ROUTE_ROLES: Record<string, string[]> = {
  '/cs': ['admin', 'coo', 'cs'],
  '/clientes': ['admin', 'coo', 'cs'],
  '/jornada': ['admin', 'coo', 'cs'],
  '/alertas': ['admin', 'coo', 'cs'],
  '/adocao': ['admin', 'coo', 'cs'],
  '/onboarding': ['admin', 'coo', 'cs'],
  '/sdr': ['admin', 'coo', 'sdr', 'closer'],
  '/sdr/feedbacks': ['admin', 'coo', 'sdr', 'closer'],
  '/comercial': ['admin', 'coo', 'closer'],
  '/trafego': ['admin', 'coo', 'cmo'],
  '/planos': ['admin'],
  '/financeiro': ['admin', 'financeiro'],
  '/operacao/financeiro': ['admin'],
  '/operacao/colaboradores': ['admin', 'coo'],
  '/cs/calendario': ['admin', 'coo', 'cs'],
  '/visao-geral': ['admin', 'coo'],
  '/admin': ['admin'],
  '/ceo': ['admin'],
  '/coo': ['admin', 'coo'],
  '/pipeline': ['admin', 'coo', 'cs'],
  '/observabilidade': ['admin'],
  '/base': ['admin'],
  '/ia': ['admin'],
  '/automacoes': ['admin'],
}

// Rota padrão por role (onde redirecionar se não tem acesso)
const DEFAULT_ROUTE: Record<string, string> = {
  admin: '/ceo',
  coo: '/coo',
  cs: '/cs',
  sdr: '/sdr',
  closer: '/comercial',
  cmo: '/trafego',
  financeiro: '/financeiro',
}

function getUserRoles(interno: { role: string; roles?: string[] | null }): string[] {
  if (interno.roles && interno.roles.length > 0) return interno.roles
  return [interno.role]
}

function hasAccess(userRoles: string[], pathname: string): boolean {
  // Achar a rota mais específica que match
  const matchedRoute = Object.keys(ROUTE_ROLES)
    .filter(r => pathname === r || pathname.startsWith(r + '/'))
    .sort((a, b) => b.length - a.length)[0]

  if (!matchedRoute) return true // Rota não mapeada = livre
  return ROUTE_ROLES[matchedRoute].some(r => userRoles.includes(r))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/' || pathname === '/login') return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  const { data: interno } = await supabase
    .from('usuarios_internos')
    .select('role, roles, ativo')
    .eq('email', user.email)
    .single()

  if (!interno || !interno.ativo) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  const userRoles = getUserRoles(interno)

  // Pagina /dashboard foi removida — redirecionar para rota padrao do role
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    const defaultRoute = DEFAULT_ROUTE[userRoles[0]] || '/ceo'
    const url = request.nextUrl.clone()
    url.pathname = defaultRoute
    return NextResponse.redirect(url)
  }

  if (hasAccess(userRoles, pathname)) return supabaseResponse

  // Sem acesso → redirecionar para rota padrão do primeiro role
  const defaultRoute = DEFAULT_ROUTE[userRoles[0]] || '/ceo'
  const url = request.nextUrl.clone()
  url.pathname = defaultRoute
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\..*|api).*)'],
}
