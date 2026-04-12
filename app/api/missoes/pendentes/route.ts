import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ missoes: [], total: 0 })

  const hoje = new Date().toISOString().slice(0, 10)
  const { data } = await sb
    .from('missoes_diarias')
    .select('*')
    .eq('user_email', email)
    .eq('concluida', false)
    .lte('data', hoje)
    .order('created_at')

  return NextResponse.json({ missoes: data || [], total: data?.length || 0 })
}
