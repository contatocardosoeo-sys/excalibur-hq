import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { clinica_id, tipo, descricao, cs_email } = await req.json()

  if (!clinica_id || !tipo || !descricao) {
    return NextResponse.json({ error: 'clinica_id, tipo e descricao obrigatorios' }, { status: 400 })
  }

  const nota = `[${new Date().toLocaleString('pt-BR')}] ${cs_email} — ${tipo}: ${descricao}`

  await supabase.from('alertas_clinica').insert({
    clinica_id,
    tipo: 'CONTATO_CS',
    nivel: 1,
    titulo: `Contato registrado: ${tipo}`,
    descricao: nota,
    resolvido: true,
    resolvido_em: new Date().toISOString(),
  })

  await supabase.from('jornada_clinica')
    .update({ notas: nota, updated_at: new Date().toISOString() })
    .eq('clinica_id', clinica_id)

  return NextResponse.json({ success: true })
}
