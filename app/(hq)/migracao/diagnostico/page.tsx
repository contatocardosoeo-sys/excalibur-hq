'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

type Form = {
  q1_onde_guarda: string
  q2_ferramenta_principal: string
  q3_o_que_falta: string
  q4_dado_nao_capturado: string
  q5_dor_principal: string
}

export default function DiagnosticoPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Form>({
    q1_onde_guarda: '',
    q2_ferramenta_principal: '',
    q3_o_que_falta: '',
    q4_dado_nao_capturado: '',
    q5_dor_principal: '',
  })

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }
      setEmail(user.email)
      const { data: interno } = await supabase.from('usuarios_internos').select('nome, role').eq('email', user.email).single()
      setNome(interno?.nome || '')
      setRole(interno?.role || '')

      // Se já respondeu, carrega
      const r = await fetch(`/api/migracao/diagnostico?email=${encodeURIComponent(user.email)}`).then(r => r.json())
      if (r.respondido && r.dados) {
        setForm({
          q1_onde_guarda: r.dados.q1_onde_guarda || '',
          q2_ferramenta_principal: r.dados.q2_ferramenta_principal || '',
          q3_o_que_falta: r.dados.q3_o_que_falta || '',
          q4_dado_nao_capturado: r.dados.q4_dado_nao_capturado || '',
          q5_dor_principal: r.dados.q5_dor_principal || '',
        })
        setMsg('Você já respondeu — você pode editar e reenviar se quiser.')
      }
      setLoading(false)
    })()
  }, [])

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setMsg('')
    try {
      const r = await fetch('/api/migracao/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_email: email, user_nome: nome, user_role: role }),
      }).then(r => r.json())
      if (r.success) {
        setMsg('✅ Respostas salvas. Redirecionando...')
        setTimeout(() => router.push('/migracao'), 1200)
      } else {
        setMsg('❌ ' + (r.error || 'erro'))
      }
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setSalvando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
      </div>
    )
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none transition'
  const labelClass = 'block text-sm font-bold text-white mb-1.5'
  const helperClass = 'text-[11px] text-gray-500 mb-2'

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button onClick={() => router.push('/migracao')} className="text-xs text-amber-400 hover:text-amber-300 mb-2">← Voltar pra migração</button>
            <h1 className="text-white text-2xl font-bold">📝 Diagnóstico individual</h1>
            <p className="text-gray-400 text-sm mt-1">
              Olá, <strong>{nome?.split(' ')[0] || email}</strong>. Responda com <strong>sinceridade</strong>. Não tem certo ou errado — suas respostas vão moldar o sistema.
            </p>
          </div>

          <form onSubmit={submeter} className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:p-7 space-y-6">
            <div>
              <label className={labelClass}>1. Onde você guarda informações de clientes/leads hoje?</label>
              <p className={helperClass}>Ex: WhatsApp, planilha Google Sheets, Notion, agenda de papel, cabeça, etc.</p>
              <textarea required rows={2} value={form.q1_onde_guarda} onChange={e => setForm({ ...form, q1_onde_guarda: e.target.value })} className={inputClass} placeholder="Ex: Eu guardo tudo no WhatsApp e tenho uma planilha chamada..." />
            </div>

            <div>
              <label className={labelClass}>2. Qual ferramenta externa você MAIS usa no dia a dia?</label>
              <p className={helperClass}>A que se você tirasse amanhã, você ficaria perdido.</p>
              <input required type="text" value={form.q2_ferramenta_principal} onChange={e => setForm({ ...form, q2_ferramenta_principal: e.target.value })} className={inputClass} placeholder="Ex: WhatsApp, Google Sheets, Meta Ads Manager..." />
            </div>

            <div>
              <label className={labelClass}>3. O que falta no Excalibur HQ pra você usar SÓ ele?</label>
              <p className={helperClass}>Seja específico. Recurso, integração, visualização, qualquer coisa.</p>
              <textarea required rows={3} value={form.q3_o_que_falta} onChange={e => setForm({ ...form, q3_o_que_falta: e.target.value })} className={inputClass} placeholder="Ex: Eu precisaria poder..." />
            </div>

            <div>
              <label className={labelClass}>4. Que dado seu NÃO está sendo capturado hoje pelo sistema?</label>
              <p className={helperClass}>Alguma métrica, algum campo, algum histórico que você anota na mão.</p>
              <textarea required rows={3} value={form.q4_dado_nao_capturado} onChange={e => setForm({ ...form, q4_dado_nao_capturado: e.target.value })} className={inputClass} placeholder="Ex: Eu anoto na caderneta quantas..." />
            </div>

            <div>
              <label className={labelClass}>5. Qual é sua MAIOR dor operacional hoje? <span className="text-amber-400">(essa é a pergunta mais importante)</span></label>
              <p className={helperClass}>Aquela coisa que toma seu tempo, que te irrita, que te faz perder qualidade de vida.</p>
              <textarea required rows={4} value={form.q5_dor_principal} onChange={e => setForm({ ...form, q5_dor_principal: e.target.value })} className={inputClass} placeholder="Ex: Perco 2 horas todo dia montando relatório na mão porque..." />
            </div>

            {msg && <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300">{msg}</div>}

            <div className="flex gap-3 pt-2 border-t border-gray-800">
              <button type="button" onClick={() => router.push('/migracao')} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-3 text-sm font-semibold min-h-[44px]">Cancelar</button>
              <button type="submit" disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-3 text-sm font-bold disabled:opacity-60 min-h-[44px]">
                {salvando ? 'Salvando...' : 'Enviar respostas ⚔️'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
