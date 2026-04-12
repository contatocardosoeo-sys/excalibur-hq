import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data } = await sb
    .from('base_atualizacao_progresso')
    .select('liberado, concluidos, total')
    .eq('id', 1)
    .single()
  return NextResponse.json(data || { liberado: false, concluidos: 0, total: 48 })
}
