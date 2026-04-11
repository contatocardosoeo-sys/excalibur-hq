'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

interface Feedback {
  id: string
  data: string
  sdr_email: string
  tipo: string
  o_que_funcionou: string | null
  o_que_nao_funcionou: string | null
  bloqueios: string | null
  ideias: string | null
  humor: number
  created_at: string
}

const inp: React.CSSProperties = { width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit' }

const HUMORES = [
  { v: 1, e: '😞', l: 'Muito ruim' },
  { v: 2, e: '😕', l: 'Ruim' },
  { v: 3, e: '😐', l: 'Neutro' },
  { v: 4, e: '🙂', l: 'Bom' },
  { v: 5, e: '😄', l: 'Muito bom' },
]

export default function FeedbacksSDR() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('trindade.excalibur@gmail.com')
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    o_que_funcionou: '', o_que_nao_funcionou: '', bloqueios: '', ideias: '', humor: 3,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const email = session?.user?.email || 'trindade.excalibur@gmail.com'
      setUserEmail(email)
      const res = await fetch(`/api/sdr/feedbacks?email=${encodeURIComponent(email)}`)
      const d = await res.json()
      setItems(d.items || [])
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    if (!form.o_que_funcionou && !form.o_que_nao_funcionou && !form.bloqueios && !form.ideias) return
    setSalvando(true)
    await fetch('/api/sdr/feedbacks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sdr_email: userEmail }),
    })
    setForm({ o_que_funcionou: '', o_que_nao_funcionou: '', bloqueios: '', ideias: '', humor: 3 })
    setSalvando(false)
    load()
  }

  const hoje = new Date().toISOString().split('T')[0]
  const feedbackHoje = items.find(f => f.data === hoje)

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', overflowX: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '16px 16px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, maxWidth: '100%' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>📝 Feedback diario</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Reflexao do dia para evolucao continua</p>
          </div>
          <Link href="/sdr" style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', fontSize: 12, textDecoration: 'none' }}>← Voltar para SDR</Link>
        </div>

        {/* Form do dia */}
        {!feedbackHoje ? (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Como foi o seu dia?</div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 6 }}>😄 Como voce se sente hoje?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {HUMORES.map(h => (
                    <button key={h.v} onClick={() => setForm({ ...form, humor: h.v })}
                      style={{ flex: 1, background: form.humor === h.v ? '#f59e0b15' : '#1f2937', border: `1px solid ${form.humor === h.v ? '#f59e0b' : '#374151'}`, borderRadius: 8, padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>{h.e}</div>
                      <div style={{ fontSize: 9, color: form.humor === h.v ? '#f59e0b' : '#6b7280', marginTop: 2 }}>{h.l}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#4ade80', display: 'block', marginBottom: 6, fontWeight: 600 }}>✅ O que funcionou hoje?</label>
                <textarea value={form.o_que_funcionou} onChange={e => setForm({ ...form, o_que_funcionou: e.target.value })}
                  placeholder="Coisas que deram certo, abordagens que funcionaram..." rows={3} style={inp} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#f87171', display: 'block', marginBottom: 6, fontWeight: 600 }}>❌ O que NAO funcionou?</label>
                <textarea value={form.o_que_nao_funcionou} onChange={e => setForm({ ...form, o_que_nao_funcionou: e.target.value })}
                  placeholder="Erros, abordagens fracassadas, retornos negativos..." rows={3} style={inp} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#fbbf24', display: 'block', marginBottom: 6, fontWeight: 600 }}>🚧 Bloqueios / dificuldades</label>
                <textarea value={form.bloqueios} onChange={e => setForm({ ...form, bloqueios: e.target.value })}
                  placeholder="O que esta te travando? Falta de informacao, ferramenta, treino..." rows={2} style={inp} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#a78bfa', display: 'block', marginBottom: 6, fontWeight: 600 }}>💡 Ideias / sugestoes</label>
                <textarea value={form.ideias} onChange={e => setForm({ ...form, ideias: e.target.value })}
                  placeholder="O que pode melhorar? Ideias para o time, processo, ferramentas..." rows={2} style={inp} />
              </div>

              <button onClick={salvar} disabled={salvando}
                style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
                {salvando ? 'Salvando...' : '💾 Salvar feedback do dia'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#22c55e10', border: '1px solid #22c55e30', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>✅ Feedback de hoje ja registrado</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Voltamos amanha para mais uma reflexao!</div>
          </div>
        )}

        {/* Historico */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📅 Historico de feedbacks ({items.length})</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📝</div>
              <div>Nenhum feedback registrado ainda</div>
            </div>
          ) : (
            items.map(f => {
              const humor = HUMORES.find(h => h.v === f.humor)
              return (
                <div key={f.id} style={{ padding: '14px 16px', borderBottom: '1px solid #1f293730' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{humor?.e || '😐'}</span>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <span style={{ fontSize: 9, color: '#4b5563' }}>{f.tipo}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 8 }}>
                    {f.o_que_funcionou && (
                      <div>
                        <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 700, marginBottom: 2 }}>✅ FUNCIONOU</div>
                        <div style={{ fontSize: 11, color: '#d1d5db' }}>{f.o_que_funcionou}</div>
                      </div>
                    )}
                    {f.o_que_nao_funcionou && (
                      <div>
                        <div style={{ fontSize: 9, color: '#f87171', fontWeight: 700, marginBottom: 2 }}>❌ NAO FUNCIONOU</div>
                        <div style={{ fontSize: 11, color: '#d1d5db' }}>{f.o_que_nao_funcionou}</div>
                      </div>
                    )}
                    {f.bloqueios && (
                      <div>
                        <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700, marginBottom: 2 }}>🚧 BLOQUEIOS</div>
                        <div style={{ fontSize: 11, color: '#d1d5db' }}>{f.bloqueios}</div>
                      </div>
                    )}
                    {f.ideias && (
                      <div>
                        <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 700, marginBottom: 2 }}>💡 IDEIAS</div>
                        <div style={{ fontSize: 11, color: '#d1d5db' }}>{f.ideias}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
