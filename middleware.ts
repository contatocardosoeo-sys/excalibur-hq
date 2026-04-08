import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROTAS_CS = ['/dashboard', '/cs', '/clientes', '/jornada', '/adocao', '/alertas', '/onboarding', '/crm-whatsapp']
const ROTAS_PUBLICAS = ['/', '/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (ROTAS_PUBLICAS.some(r => pathname === r)) return NextResponse.next()
  if (pathname.startsWith('/api/')) return NextResponse.next()

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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const { data: interno } = await supabase
    .from('usuarios_internos')
    .select('role, ativo')
    .eq('email', user.email)
    .single()

  if (!interno || !interno.ativo) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (interno.role === 'admin') return response

  if (interno.role === 'cs') {
    const permitida = ROTAS_CS.some(r => pathname.startsWith(r))
    if (!permitida) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
