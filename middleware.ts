import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROTAS_CS = ['/cs', '/clientes', '/jornada', '/adocao', '/alertas', '/onboarding', '/crm-whatsapp', '/dashboard']
const ROTAS_PUBLICAS = ['/', '/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API e rotas públicas passam direto
  if (pathname.startsWith('/api')) return NextResponse.next()
  if (ROTAS_PUBLICAS.includes(pathname)) return NextResponse.next()

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sem sessão → login
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Buscar role
  const { data: interno } = await supabase
    .from('usuarios_internos')
    .select('role, ativo')
    .eq('email', user.email)
    .single()

  if (!interno || !interno.ativo) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin passa em tudo
  if (interno.role === 'admin') return response

  // CS — só rotas permitidas
  if (interno.role === 'cs') {
    const permitida = ROTAS_CS.some(r => pathname === r || pathname.startsWith(r + '/'))
    if (!permitida) {
      return NextResponse.redirect(new URL('/cs', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
