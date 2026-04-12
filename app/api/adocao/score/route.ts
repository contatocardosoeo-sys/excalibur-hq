import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ score: 0, nivel: 'iniciante' })

  const { data } = await sb
    .from('adocao_scores')
    .select('*')
    .eq('user_email', email)
    .maybeSingle()

  return NextResponse.json(data || { score: 0, nivel: 'iniciante' })
}
