'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

const FERRAMENTAS = ['WhatsApp', 'Google Sheets / Planilha', 'Google Agenda', 'Meta Ads Manager', 'Notion', 'Email / Gmail', 'Outro CRM', 'Caderneta / Papel', 'Outro']

type HistoricoItem = { data: string; usou_externo: boolean; ferramenta_externa: string | null }

export default function CheckinPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [feitoHoje, setFeitoHoje] = useState(false)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])

  const [usouExterno, setUsouExterno] = useState<boolean | null>(null)
  const [ferramenta, setFerramenta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setLoading(false); return }
    setEmail(user.email)
    const { data: interno } = await supabase.from('usuarios_internos').select('nome').eq('email', user.email).single()
    setNome(interno?.nome || '')

    const r = await fetch(`/api/migracao/checkin?email=${encodeURIComponent(user.email)}`).then(r => r.json())
    setFeitoHoje(r.feito_hoje)
    setHistorico(r.historico || [])
    if (r.dados_hoje) {
      setUsouExterno(r.dados_hoje.usou_externo)
      setFerramenta(r.dados_hoje.ferramenta_externa || '')
      setMotivo(r.dados_hoje.motivo || '')
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usouExterno === null) { setMsg('Selecione "sim" ou "não"'); return }
    if (usouExterno && !ferramenta) { setMsg('Informe qual ferramenta externa'); return }

    setSalvando(true); setMsg('')
    try {
      const r = await fetch('/api/migracao/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: email, usou_externo: usouExterno, ferramenta_externa: ferramenta, motivo }),
      }).then(r => r.json())
      if (r.success) {
        setMsg('✅ Checkin registrado')
        await carregar()
        setTimeout(() => router.push('/migracao'), 1000)
      } else {
        setMsg('❌ ' + (r.error || 'erro'))
      }
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setSalvando(false)
  }

  if (loading) return <div className="min-h-screen bg-gray-950 p-6 text-gray-500 text-sm">Carregando...</div>

  const streakHQOnly = (() => {
    let count = 0
    for (const h of historico) {
      if (!h.usou_externo) count++
      else break
    }
    return count
  })()

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button onClick={() => router.push('/migracao')} className="text-xs text-amber-400 hover:text-amber-300 mb-2">← Voltar</button>
            <h1 className="text-white text-2xl font-bold">✅ Checkin diário</h1>
            <p className="text-gray-400 text-sm mt-1">
              Uma pergunta por dia. Responde com <strong>sinceridade</strong> — usar o externo não é problema, <strong>esconder é</strong>.
            </p>
          </div>

          {/* Streak */}
          {streakHQOnly > 0 && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <div className="text-green-400 font-bold text-lg">{streakHQOnly} dia{streakHQOnly > 1 ? 's' : ''} HQ-only seguidos</div>
                  <div className="text-xs text-gray-400">Cada dia adicional soma +bonus pro seu score</div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={submeter} className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:p-7 space-y-5">
            {feitoHoje && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
                ℹ Você já respondeu o checkin de hoje. Pode atualizar se precisar.
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-white mb-3">Você usou alguma ferramenta externa hoje pra tocar o trabalho?</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setUsouExterno(false)}
                  className={`p-4 rounded-xl border-2 transition min-h-[80px] ${usouExterno === false ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-green-500/50'}`}>
                  <div className="text-2xl mb-1">✅</div>
                  <div className="font-bold text-sm">Não, só HQ</div>
                </button>
                <button type="button" onClick={() => setUsouExterno(true)}
                  className={`p-4 rounded-xl border-2 transition min-h-[80px] ${usouExterno === true ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-red-500/50'}`}>
                  <div className="text-2xl mb-1">⚠️</div>
                  <div className="font-bold text-sm">Sim, usei fora</div>
                </button>
              </div>
            </div>

            {usouExterno === true && (
              <>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Qual ferramenta?</label>
                  <div className="flex flex-wrap gap-2">
                    {FERRAMENTAS.map(f => (
                      <button key={f} type="button" onClick={() => setFerramenta(f)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${ferramenta === f ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Por quê? <span className="text-gray-500 text-xs font-normal">(opcional — mas ajuda muito)</span></label>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="Ex: Cliente mandou áudio no WhatsApp pedindo urgência, não deu pra parar pra cadastrar antes..." />
                  <p className="text-[10px] text-gray-500 mt-1">Isso vai pro Cardoso — ele vai entender, não julgar. Use isso pra apontar o que o HQ ainda não resolve.</p>
                </div>
              </>
            )}

            {msg && <div className="p-3 rounded bg-gray-800 text-xs text-gray-300">{msg}</div>}

            <button type="submit" disabled={salvando || usouExterno === null} className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-3 font-bold text-sm min-h-[44px] disabled:opacity-50">
              {salvando ? 'Salvando...' : feitoHoje ? 'Atualizar checkin' : 'Registrar checkin ⚔️'}
            </button>
          </form>

          {/* Histórico 14 dias */}
          {historico.length > 0 && (
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-gray-400 text-xs uppercase font-semibold mb-3">Últimos 14 dias</h3>
              <div className="flex flex-wrap gap-1.5">
                {historico.map(h => (
                  <div key={h.data} title={`${h.data} — ${h.usou_externo ? 'Usou fora: ' + (h.ferramenta_externa || 'sem detalhe') : 'HQ only'}`}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${h.usou_externo ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {h.usou_externo ? '✗' : '✓'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
