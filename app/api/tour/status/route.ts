import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const pagina = req.nextUrl.searchParams.get('pagina')
  if (!email || !pagina) return NextResponse.json({ deve_mostrar: false })

  const { data } = await sb
    .from('tour_progresso')
    .select('concluido, passo_atual')
    .eq('user_email', email)
    .eq('pagina', pagina)
    .maybeSingle()

  return NextResponse.json({
    deve_mostrar: !data || !data.concluido,
    passo_atual: data?.passo_atual || 0,
    concluido: data?.concluido || false,
  })
}
