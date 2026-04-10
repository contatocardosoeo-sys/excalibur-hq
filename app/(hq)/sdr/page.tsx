'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

interface Metricas {
  metricas_dia: { data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; observacao: string | null } | null
  metricas_mes: Array<{ data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number }>
  acumulado: { leads: number; contatos: number; agendamentos: number; comparecimentos: number; vendas: number }
  taxas: { contato: number; agendamento: number; comparecimento: number; conversao: number }
  metas: { leads: number; agendamentos: number; comparecimentos: number; vendas: number }
}

const ETAPAS_ACL = [
  { key: 'A', label: 'Atracao', desc: 'Lead chega — confirmar interesse e qualificar', cor: '#3b82f6' },
  { key: 'C', label: 'Conexao', desc: 'Apresentar valor e gerar conexao real', cor: '#a855f7' },
  { key: 'L', label: 'Levantamento', desc: 'Levantar dores, contexto, decisor e momento', cor: '#22c55e' },
]

const ROTINA_DIA = [
  { hora: '08:30', titulo: 'Conferir leads novos do dia anterior' },
  { hora: '09:00', titulo: 'Bloco 1 — Contatos novos (atracao)' },
  { hora: '10:30', titulo: 'Pausa 15 min' },
  { hora: '10:45', titulo: 'Bloco 2 — Follow-ups + qualificacoes' },
  { hora: '12:00', titulo: 'Almoco' },
  { hora: '13:30', titulo: 'Bloco 3 — Confirmacao de agendamentos do dia seguinte' },
  { hora: '15:00', titulo: 'Bloco 4 — Reativacoes (lista fria)' },
  { hora: '16:30', titulo: 'Atualizar planilha + CRM' },
  { hora: '17:30', titulo: 'Feedback diario + planejamento amanha' },
]

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }
function corPct(p: number) { return p >= 80 ? '#4ade80' : p >= 50 ? '#fbbf24' : '#f87171' }

export default function SDRPage() {
  const [data, setData] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'overview' | 'rotina' | 'etapas' | 'historico'>('overview')
  const [userEmail, setUserEmail] = useState('trindade.excalibur@gmail.com')

  const [form, setForm] = useState({
    leads_recebidos: '', contatos_realizados: '', agendamentos: '',
    comparecimentos: '', vendas: '', observacao: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const email = session?.user?.email || 'trindade.excalibur@gmail.com'
      setUserEmail(email)

      const res = await fetch(`/api/sdr/metricas?email=${encodeURIComponent(email)}`)
      const d = await res.json()
      setData(d)

      if (d.metricas_dia) {
        setForm({
          leads_recebidos: String(d.metricas_dia.leads_recebidos || ''),
          contatos_realizados: String(d.metricas_dia.contatos_realizados || ''),
          agendamentos: String(d.metricas_dia.agendamentos || ''),
          comparecimentos: String(d.metricas_dia.comparecimentos || ''),
          vendas: String(d.metricas_dia.vendas || ''),
          observacao: d.metricas_dia.observacao || '',
        })
      }
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const salvarMetricas = async () => {
    setSalvando(true)
    await fetch('/api/sdr/metricas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sdr_email: userEmail }),
    })
    setSalvando(false)
    setEditando(false)
    load()
  }

  if (loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: 32 }}>
          <div style={{ height: 28, width: 200, background: '#111827', borderRadius: 8, animation: 'pulse 1.5s infinite', marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 90, animation: 'pulse 1.5s infinite' }} />)}
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      </div>
    )
  }

  const { acumulado, taxas, metas, metricas_mes } = data

  const KPI = ({ icon, label, atual, meta, cor }: { icon: string; label: string; atual: number; meta: number; cor: string }) => {
    const p = pct(atual, meta)
    return (
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>{fmt(atual)}</span>
          <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>/ {fmt(meta)}</span>
        </div>
        <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', background: corPct(p), width: `${Math.min(p, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: 9, color: corPct(p), marginTop: 4, fontWeight: 700 }}>{p}% da meta mensal</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxWidth: 1400 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>📞 SDR — Prospeccao</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Operacao diaria + metas + rotina + etapas ACL</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/sdr/feedbacks" style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, textDecoration: 'none' }}>📝 Feedbacks</Link>
            <button onClick={load} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
          </div>
        </div>

        {/* KPIs com metas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          <KPI icon="📥" label="Leads" atual={acumulado.leads} meta={metas.leads} cor="#60a5fa" />
          <KPI icon="📞" label="Contatos" atual={acumulado.contatos} meta={metas.leads} cor="#a78bfa" />
          <KPI icon="📅" label="Agendamentos" atual={acumulado.agendamentos} meta={metas.agendamentos} cor="#fbbf24" />
          <KPI icon="✅" label="Comparecimentos" atual={acumulado.comparecimentos} meta={metas.comparecimentos} cor="#fb923c" />
          <KPI icon="💰" label="Vendas" atual={acumulado.vendas} meta={metas.vendas} cor="#4ade80" />
        </div>

        {/* Taxas */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>📈 Taxas de conversao do mes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Lead → Contato', value: taxas.contato },
              { label: 'Contato → Agend.', value: taxas.agendamento },
              { label: 'Agend. → Comparec.', value: taxas.comparecimento },
              { label: 'Comparec. → Venda', value: taxas.conversao },
            ].map((t, i) => (
              <div key={i} style={{ background: '#0a0f1a', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: corPct(t.value), fontFamily: 'monospace' }}>{t.value}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#111827', borderRadius: 10, padding: 3 }}>
          {[
            { key: 'overview' as const, label: '📊 Lancar dia' },
            { key: 'rotina' as const, label: '⏰ Rotina' },
            { key: 'etapas' as const, label: '🎯 Etapas ACL' },
            { key: 'historico' as const, label: '📅 Historico' },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)}
              style={{ flex: 1, background: aba === t.key ? '#f59e0b' : 'transparent', color: aba === t.key ? '#030712' : '#6b7280', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: aba === t.key ? 700 : 500, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ABA OVERVIEW */}
        {aba === 'overview' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Metricas de hoje — {new Date().toLocaleDateString('pt-BR')}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Lance os numeros do dia ao final de cada bloco ou no fechamento</div>
              </div>
              {!editando && data.metricas_dia && (
                <button onClick={() => setEditando(true)} style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f630', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✏️ Editar</button>
              )}
            </div>

            {!editando && data.metricas_dia ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    { l: '📥 Leads', v: data.metricas_dia.leads_recebidos },
                    { l: '📞 Contatos', v: data.metricas_dia.contatos_realizados },
                    { l: '📅 Agendamentos', v: data.metricas_dia.agendamentos },
                    { l: '✅ Comparecimentos', v: data.metricas_dia.comparecimentos },
                    { l: '💰 Vendas', v: data.metricas_dia.vendas },
                  ].map((m, i) => (
                    <div key={i} style={{ background: '#0a0f1a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{m.l}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>{fmt(m.v)}</div>
                    </div>
                  ))}
                </div>
                {data.metricas_dia.observacao && (
                  <div style={{ background: '#0a0f1a', borderRadius: 8, padding: 12, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                    💬 {data.metricas_dia.observacao}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    { k: 'leads_recebidos', l: '📥 Leads recebidos' },
                    { k: 'contatos_realizados', l: '📞 Contatos feitos' },
                    { k: 'agendamentos', l: '📅 Agendamentos' },
                    { k: 'comparecimentos', l: '✅ Comparecimentos' },
                    { k: 'vendas', l: '💰 Vendas' },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.l}</label>
                      <input type="number" value={form[f.k as keyof typeof form]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                        style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 16, outline: 'none', textAlign: 'center', fontWeight: 700 }} />
                    </div>
                  ))}
                </div>
                <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="Observacoes do dia (opcional)..."
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 12, color: '#fff', fontSize: 12, outline: 'none', minHeight: 60, marginBottom: 12, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={salvarMetricas} disabled={salvando}
                    style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
                    {salvando ? 'Salvando...' : '💾 Salvar metricas do dia'}
                  </button>
                  {editando && (
                    <button onClick={() => { setEditando(false); load() }}
                      style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ABA ROTINA */}
        {aba === 'rotina' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>⏰ Rotina diaria do SDR</div>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>Estrutura de blocos de trabalho — siga o fluxo para maximizar contatos qualificados</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROTINA_DIA.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#0a0f1a', borderRadius: 8, border: '1px solid #1f293750', borderLeft: '3px solid #f59e0b' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', minWidth: 50 }}>{r.hora}</span>
                  <span style={{ fontSize: 12, color: '#fff' }}>{r.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA ETAPAS */}
        {aba === 'etapas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {ETAPAS_ACL.map(e => (
              <div key={e.key} style={{ background: '#111827', border: `1px solid ${e.cor}30`, borderRadius: 12, padding: 20, borderTop: `3px solid ${e.cor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: e.cor + '20', color: e.cor, width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>{e.key}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{e.label}</div>
                    <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>etapa {e.key}</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{e.desc}</p>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8 }}>📋 Como aplicar a metodologia ACL</div>
              <ul style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
                <li><strong style={{ color: '#60a5fa' }}>A — Atracao:</strong> primeiro contato. Confirme nome, interesse real e disponibilidade.</li>
                <li><strong style={{ color: '#a78bfa' }}>C — Conexao:</strong> apresente Excalibur, gere conexao humana, tire objecoes iniciais.</li>
                <li><strong style={{ color: '#4ade80' }}>L — Levantamento:</strong> investigue dor, contexto, decisor e momento. Qualifique para passar ao closer.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ABA HISTORICO */}
        {aba === 'historico' && (
          <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📅 Historico do mes — {metricas_mes.length} dias lancados</span>
            </div>
            {metricas_mes.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📊</div>
                <div>Nenhuma metrica lancada ainda este mes</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Data', 'Leads', 'Contatos', 'Agend.', 'Comparec.', 'Vendas'].map(h => (
                    <th key={h} style={{ color: '#4b5563', fontSize: 9, fontWeight: 600, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...metricas_mes].reverse().map(m => (
                    <tr key={m.data} style={{ borderBottom: '1px solid #1f293730' }}>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px', color: '#60a5fa', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.leads_recebidos}</td>
                      <td style={{ padding: '10px 14px', color: '#a78bfa', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.contatos_realizados}</td>
                      <td style={{ padding: '10px 14px', color: '#fbbf24', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.agendamentos}</td>
                      <td style={{ padding: '10px 14px', color: '#fb923c', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.comparecimentos}</td>
                      <td style={{ padding: '10px 14px', color: '#4ade80', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.vendas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
