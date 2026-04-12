import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data } = await sb.from('padroes_detectados').select('*').order('ultima_vez', { ascending: false })
  return NextResponse.json({ padroes: data || [] })
}
