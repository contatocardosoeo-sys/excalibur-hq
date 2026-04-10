import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Quem DEVE preencher todo dia (operadores — NÃO incluir admin/CEO)
const OBRIGATORIOS = [
  { email: 'guilherme.excalibur@gmail.com', nome: 'Guilherme' },
  { email: 'trindade.excalibur@gmail.com', nome: 'Trindade' },
]

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const hoje = new Date().toISOString().split('T')[0]

  // Status do usuário logado.
  // Admin/CEO e quem nao esta em OBRIGATORIOS nao precisa preencher → sempre "preenchido".
  let meuStatus = { preenchido: true, data: hoje }
  const precisaPreencher = email ? OBRIGATORIOS.some(u => u.email === email) : false
  if (email && precisaPreencher) {
    const { data } = await supabase.from('preenchimento_diario')
      .select('*').eq('email', email).eq('data', hoje).maybeSingle()
    meuStatus = { preenchido: !!data, data: hoje }
  }

  // Controle geral: quem preencheu e quem não preencheu hoje
  const { data: preenchidos } = await supabase.from('preenchimento_diario')
    .select('email').eq('data', hoje)
  const emailsPreenchidos = (preenchidos || []).map(p => p.email)

  const controle = OBRIGATORIOS.map(u => ({
    ...u,
    preenchido: emailsPreenchidos.includes(u.email),
  }))

  // Histórico: últimos 7 dias
  const semanaAtras = new Date()
  semanaAtras.setDate(semanaAtras.getDate() - 6)
  const { data: historico } = await supabase.from('preenchimento_diario')
    .select('email, data').gte('data', semanaAtras.toISOString().split('T')[0])
    .order('data', { ascending: false })

  const faltasSemana: Record<string, number> = {}
  for (const u of OBRIGATORIOS) {
    let faltas = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dia = d.toISOString().split('T')[0]
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue // pular fim de semana
      const tem = (historico || []).some(h => h.email === u.email && h.data === dia)
      if (!tem) faltas++
    }
    faltasSemana[u.email] = faltas
  }

  return NextResponse.json({ meuStatus, controle, faltasSemana })
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  const hoje = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('preenchimento_diario')
    .upsert({ email, data: hoje, preenchido: true }, { onConflict: 'email,data' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
