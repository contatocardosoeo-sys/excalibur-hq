import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const de = req.nextUrl.searchParams.get('de')
  const ate = req.nextUrl.searchParams.get('ate')
  const pessoa = req.nextUrl.searchParams.get('pessoa') // email ou 'todos'

  const hoje = new Date().toISOString().split('T')[0]
  const dataInicio = de || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const dataFim = ate || hoje

  let query = supabase.from('input_diario').select('*')
    .gte('data', dataInicio).lte('data', dataFim).order('data', { ascending: false })

  if (pessoa && pessoa !== 'todos') {
    query = query.eq('email', pessoa)
  }

  const { data: rows } = await query

  const items = rows || []

  // Agrupar por dia (consolidado)
  const porDia: Record<string, { data: string; investimento: number; leads: number; agendamentos: number; reunioes_realizadas: number; reunioes_qualificadas: number; fechamentos: number; faturamento: number; pessoas: string[] }> = {}
  for (const r of items) {
    if (!porDia[r.data]) {
      porDia[r.data] = { data: r.data, investimento: 0, leads: 0, agendamentos: 0, reunioes_realizadas: 0, reunioes_qualificadas: 0, fechamentos: 0, faturamento: 0, pessoas: [] }
    }
    const d = porDia[r.data]
    d.investimento += Number(r.investimento || 0)
    d.leads += r.leads || 0
    d.agendamentos += r.agendamentos || 0
    d.reunioes_realizadas += r.reunioes_realizadas || 0
    d.reunioes_qualificadas += r.reunioes_qualificadas || 0
    d.fechamentos += r.fechamentos || 0
    d.faturamento += Number(r.faturamento || 0)
    if (!d.pessoas.includes(r.nome)) d.pessoas.push(r.nome)
  }

  const consolidado = Object.values(porDia).sort((a, b) => b.data.localeCompare(a.data))

  // Agrupar por pessoa (rendimento)
  const porPessoa: Record<string, { nome: string; email: string; dias: number; investimento: number; leads: number; agendamentos: number; reunioes_realizadas: number; fechamentos: number; faturamento: number }> = {}
  for (const r of items) {
    if (!porPessoa[r.email]) {
      porPessoa[r.email] = { nome: r.nome, email: r.email, dias: 0, investimento: 0, leads: 0, agendamentos: 0, reunioes_realizadas: 0, fechamentos: 0, faturamento: 0 }
    }
    const p = porPessoa[r.email]
    p.dias++
    p.investimento += Number(r.investimento || 0)
    p.leads += r.leads || 0
    p.agendamentos += r.agendamentos || 0
    p.reunioes_realizadas += r.reunioes_realizadas || 0
    p.fechamentos += r.fechamentos || 0
    p.faturamento += Number(r.faturamento || 0)
  }

  return NextResponse.json({
    registros: items,
    consolidado,
    porPessoa: Object.values(porPessoa),
    periodo: { de: dataInicio, ate: dataFim },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('input_diario')
    .upsert({
      email: body.email, nome: body.nome, data: body.data,
      investimento: Number(body.investimento) || 0,
      leads: Number(body.leads) || 0,
      agendamentos: Number(body.agendamentos) || 0,
      reunioes_realizadas: Number(body.reunioes_realizadas) || 0,
      reunioes_qualificadas: Number(body.reunioes_qualificadas) || 0,
      fechamentos: Number(body.fechamentos) || 0,
      faturamento: Number(body.faturamento) || 0,
      observacoes: body.observacoes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email,data' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Marcar preenchimento do dia
  await supabase.from('preenchimento_diario')
    .upsert({ email: body.email, data: body.data, preenchido: true }, { onConflict: 'email,data' })

  return NextResponse.json({ success: true, data })
}
