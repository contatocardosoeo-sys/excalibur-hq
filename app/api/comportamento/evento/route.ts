import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST — registrar evento comportamental
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userEmail, userNome, role, tipo, pagina, elemento, acao, resultado, contexto, duracao_ms } = body

  if (!userEmail || !tipo) {
    return NextResponse.json({ error: 'userEmail e tipo obrigatórios' }, { status: 400 })
  }

  const { error } = await sb.from('comportamento_eventos').insert({
    user_email: userEmail,
    user_nome: userNome || null,
    role: role || null,
    tipo,
    pagina: pagina || null,
    elemento: elemento || null,
    acao: acao || null,
    resultado: resultado || null,
    contexto: contexto || null,
    duracao_ms: duracao_ms || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Detectar padrões em background
  Promise.resolve().then(async () => {
    try {
      if (tipo === 'abandono_pagina' || tipo === 'erro') {
        const { count } = await sb
          .from('comportamento_eventos')
          .select('id', { count: 'exact', head: true })
          .eq('user_email', userEmail)
          .eq('tipo', tipo)
          .eq('pagina', pagina || '')
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())

        if ((count || 0) >= 3) {
          const padrao = tipo === 'abandono_pagina' ? 'abandono_recorrente' : 'erro_repetido'
          const upsertResult = await sb.from('padroes_detectados').upsert({
            user_email: userEmail,
            tipo: padrao,
            descricao: `${padrao} em ${pagina} (${count}x em 7 dias)`,
            frequencia: count || 0,
            ultima_vez: new Date().toISOString(),
            contexto: { pagina, elemento, tipo_original: tipo },
          }, { onConflict: 'user_email,tipo' })
          if (upsertResult.error) {
            await sb.from('padroes_detectados').insert({
              user_email: userEmail,
              tipo: padrao,
              descricao: `${padrao} em ${pagina} (${count}x em 7 dias)`,
              frequencia: count || 0,
              contexto: { pagina, elemento },
            })
          }
        }
      }

      // Atualizar health score: último acesso
      await sb.from('colaborador_health_score').upsert({
        user_email: userEmail,
        user_nome: userNome || null,
        role: role || null,
        ultimo_acesso: new Date().toISOString(),
        dias_sem_acesso: 0,
        calculado_em: new Date().toISOString(),
      }, { onConflict: 'user_email' })
    } catch {
      /* */
    }
  })

  return NextResponse.json({ ok: true })
}

// GET — últimos eventos (admin/coo)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 50

  let q = sb.from('comportamento_eventos').select('*').order('created_at', { ascending: false }).limit(limit)
  if (email) q = q.eq('user_email', email)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ eventos: data || [] })
}
