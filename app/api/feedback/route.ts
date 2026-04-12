import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/feedback?email=X — próxima pergunta pendente
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ pergunta: null })

  const { data } = await sb
    .from('feedback_perguntas')
    .select('*')
    .eq('user_email', email)
    .eq('status', 'pendente')
    .lte('agendada_para', new Date().toISOString())
    .order('agendada_para', { ascending: true })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ pergunta: data || null })
}

// POST /api/feedback — responder ou dispensar
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { pergunta_id, user_email, resposta, resposta_livre, acao } = body

  if (!pergunta_id || !user_email) {
    return NextResponse.json({ error: 'pergunta_id e user_email obrigatórios' }, { status: 400 })
  }

  if (acao === 'dispensar') {
    await sb.from('feedback_perguntas').update({ status: 'dispensada' }).eq('id', pergunta_id)
    return NextResponse.json({ ok: true, dispensada: true })
  }

  // Salvar resposta
  await sb.from('feedback_respostas').insert({
    pergunta_id,
    user_email,
    resposta: resposta || null,
    resposta_livre: resposta_livre || null,
    sentimento: resposta === 'sim' || resposta === 'facil' ? 'positivo' : resposta === 'nao' || resposta === 'dificil' ? 'negativo' : 'neutro',
  })

  await sb.from('feedback_perguntas').update({ status: 'respondida' }).eq('id', pergunta_id)

  // Verificar se deve gerar proposta de melhoria (3+ feedbacks negativos no mesmo tema)
  Promise.resolve().then(async () => {
    try {
      const { data: perguntas } = await sb
        .from('feedback_perguntas')
        .select('id, gatilho')
        .eq('user_email', user_email)
        .eq('status', 'respondida')

      if (!perguntas) return

      for (const p of perguntas) {
        const { data: respostas } = await sb
          .from('feedback_respostas')
          .select('sentimento')
          .eq('pergunta_id', p.id)

        const negativos = respostas?.filter(r => r.sentimento === 'negativo').length || 0
        if (negativos >= 2) {
          const existe = await sb
            .from('melhorias_propostas')
            .select('id')
            .ilike('titulo', `%${p.gatilho}%`)
            .eq('status', 'pendente')
            .maybeSingle()

          if (!existe?.data) {
            await sb.from('melhorias_propostas').insert({
              titulo: `Melhorar: ${p.gatilho}`,
              descricao: `Padrão detectado: ${negativos} feedbacks negativos sobre "${p.gatilho}" do ${user_email}`,
              evidencia: { feedbacks_negativos: negativos, user: user_email, gatilho: p.gatilho },
              impacto_esperado: 'Reduzir fricção e aumentar adoção',
              roles_impactados: [body.role || 'todos'],
            })
          }
        }
      }
    } catch {
      /* */
    }
  })

  return NextResponse.json({ ok: true })
}
