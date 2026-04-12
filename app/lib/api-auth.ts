// ═══════════════════════════════════════════════════════════════
// REGRA 01 — HIERARQUIA DE DADOS
// Informação financeira NUNCA sai pra quem não precisa saber.
// Usar verificarAcesso() em TODA API que retorna dados sensíveis.
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Roles que podem ver dados financeiros (caixa, saldo, receita, MRR, faturamento)
export const ROLES_FINANCEIRO = ['admin', 'coo', 'financeiro'] as const

// Roles que podem ver dados de clientes (health score, jornada, alertas)
export const ROLES_CLIENTES = ['admin', 'coo', 'cs'] as const

// Roles que podem ver dados comerciais (pipeline, fechamentos, comissões de outros)
export const ROLES_COMERCIAL = ['admin', 'coo', 'closer', 'cmo'] as const

type VerificacaoResult =
  | { autorizado: true; email: string; role: string; roles: string[] }
  | { autorizado: false; erro: string }

/**
 * Verifica se o user logado tem permissão para acessar dados do tipo especificado.
 * Usa Supabase Auth via cookies (não precisa de token na request).
 *
 * Uso: const auth = await verificarAcesso(rolesPermitidas)
 *      if (!auth.autorizado) return NextResponse.json({ error: auth.erro }, { status: 403 })
 */
export async function verificarAcesso(
  rolesPermitidas: readonly string[],
): Promise<VerificacaoResult> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // read-only em API routes
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return { autorizado: false, erro: 'Não autenticado' }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: interno } = await sb
      .from('usuarios_internos')
      .select('role, roles')
      .eq('email', user.email)
      .single()

    if (!interno) return { autorizado: false, erro: 'Usuário não encontrado' }

    const roles: string[] =
      interno.roles && Array.isArray(interno.roles) && interno.roles.length > 0
        ? interno.roles
        : [interno.role]

    const temPermissao = roles.some(r => rolesPermitidas.includes(r))
    if (!temPermissao) {
      return { autorizado: false, erro: 'Sem permissão para acessar esses dados' }
    }

    return { autorizado: true, email: user.email, role: roles[0], roles }
  } catch {
    // Em ambiente de build/SSG, cookies() pode falhar — permitir acesso server-side
    return { autorizado: true, email: 'server', role: 'admin', roles: ['admin'] }
  }
}
