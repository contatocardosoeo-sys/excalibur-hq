'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

interface Clinica {
  id: string
  nome: string
  etapa: string
  dias_na_plataforma: number
  data_inicio: string
  score: number
  alertas_count: number
  ultima_acao: string | null
}

interface ProximaAcao {
  clinica_id: string
  clinica_nome: string
  motivo: string
  tipo: string
  alerta_id: string | null
}

function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}

export default function CSCockpit() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [proximas, setProximas] = useState<ProximaAcao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalClinica, setModalClinica] = useState<Clinica | null>(null)
  const [contatoTipo, setContatoTipo] = useState('mensagem')
  const [contatoDesc, setContatoDesc] = useState('')
  const [salvando, setSalvando] = useState(false)

  const load = useCallback(async () => {
    const semana = getWeekString(new Date())
    const hoje = new Date()

    const [clinicasRes, jornadaRes, adocaoRes, alertasRes] = await Promise.all([
      supabase.from('clinicas').select('id, nome'),
      supabase.from('jornada_clinica').select('clinica_id, etapa, dias_na_plataforma, data_inicio, notas, updated_at'),
      supabase.from('adocao_clinica').select('clinica_id, score').eq('semana', semana),
      supabase.from('alertas_clinica').select('id, clinica_id, tipo, titulo, nivel, resolvido, created_at').eq('resolvido', false),
    ])

    const cl = clinicasRes.data || []
    const jo = jornadaRes.data || []
    const ad = adocaoRes.data || []
    const al = alertasRes.data || []

    const result: Clinica[] = cl.map(c => {
      const j = jo.find(x => x.clinica_id === c.id)
      const a = ad.find(x => x.clinica_id === c.id)
      const alertasCount = al.filter(x => x.clinica_id === c.id).length
      return {
        id: c.id,
        nome: c.nome,
        etapa: j?.etapa ?? 'N/A',
        dias_na_plataforma: j?.dias_na_plataforma ?? 0,
        data_inicio: j?.data_inicio ?? '',
        score: a?.score ?? 0,
        alertas_count: alertasCount,
        ultima_acao: j?.updated_at ?? null,
      }
    }).sort((a, b) => a.score - b.score)

    setClinicas(result)

    // Gerar proximas acoes
    const acoes: ProximaAcao[] = []
    result.forEach(c => {
      const dias = c.dias_na_plataforma
      const inicio = c.data_inicio ? new Date(c.data_inicio) : null
      const diasDesdeInicio = inicio ? Math.floor((hoje.getTime() - inicio.getTime()) / 86400000) : 0

      if (c.score < 60) {
        const ultimaAcao = c.ultima_acao ? new Date(c.ultima_acao) : null
        const diasSemAcao = ultimaAcao ? Math.floor((hoje.getTime() - ultimaAcao.getTime()) / 86400000) : 999
        if (diasSemAcao >= 3) {
          acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: `Score ${c.score} — sem acao ha ${diasSemAcao} dias`, tipo: 'risco', alerta_id: null })
        }
      }
      if (dias <= 7 && diasDesdeInicio > 7) {
        acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: 'Travada no onboarding ha mais de 7 dias', tipo: 'onboarding', alerta_id: null })
      }
      if (Math.abs(dias - 15) <= 3 && dias < 15) {
        acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: 'Proximo do marco D15 — preparar reuniao', tipo: 'marco', alerta_id: null })
      }
      if (Math.abs(dias - 30) <= 3 && dias < 30) {
        acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: 'Proximo do marco D30 — avaliar resultados', tipo: 'marco', alerta_id: null })
      }
      // Alertas criticos
      al.filter(x => x.clinica_id === c.id && x.nivel === 3).forEach(a => {
        acoes.push({ clinica_id: c.id, clinica_nome: c.nome, motivo: a.titulo, tipo: 'critico', alerta_id: a.id })
      })
    })

    setProximas(acoes)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  const registrarContato = async () => {
    if (!modalClinica || !contatoDesc.trim()) return
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    await fetch('/api/cs/registrar-contato', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinica_id: modalClinica.id, tipo: contatoTipo, descricao: contatoDesc, cs_email: user?.email || '' }),
    })
    setModalClinica(null)
    setContatoDesc('')
    setSalvando(false)
    load()
  }

  const marcarFeito = async (acao: ProximaAcao) => {
    if (acao.alerta_id) {
      await supabase.from('alertas_clinica').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', acao.alerta_id)
    } else {
      await supabase.from('alertas_clinica').insert({
        clinica_id: acao.clinica_id, tipo: 'ACAO_CS', nivel: 1,
        titulo: `Acao CS realizada: ${acao.motivo}`, descricao: 'Marcado como feito pelo CS', resolvido: true, resolvido_em: new Date().toISOString(),
      })
    }
    load()
  }

  const totalAtivos = clinicas.length
  const emRisco = clinicas.filter(c => c.score < 60).length
  const semInteracao = clinicas.filter(c => {
    if (!c.ultima_acao) return true
    return (Date.now() - new Date(c.ultima_acao).getTime()) / 86400000 >= 5
  }).length
  const alertasCriticos = proximas.filter(a => a.tipo === 'critico').length

  const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'
  const etapaColor = (e: string) => {
    if (e.includes('D0') || e.includes('D1') || e.includes('D3') || e.includes('D5')) return '#a855f7'
    if (e.includes('D7') || e.includes('D15')) return '#f59e0b'
    if (e.includes('D30') || e.includes('D60') || e.includes('D90')) return '#22c55e'
    if (e === 'RISCO' || e === 'CHURN') return '#ef4444'
    return '#6b7280'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
            <p>Carregando cockpit CS...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Cockpit CS</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Visao acionavel de todas as clinicas — atualiza a cada 60s</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Clientes ativos', valor: totalAtivos, color: '#f59e0b' },
            { label: 'Em risco (< 60)', valor: emRisco, color: emRisco > 0 ? '#ef4444' : '#22c55e' },
            { label: 'Sem interacao 5+ dias', valor: semInteracao, color: semInteracao > 0 ? '#f97316' : '#22c55e' },
            { label: 'Alertas criticos', valor: alertasCriticos, color: alertasCriticos > 0 ? '#ef4444' : '#22c55e' },
          ].map(k => (
            <div key={k.label} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {/* Modal registrar contato */}
        {modalClinica && (
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Registrar contato — {modalClinica.nome}</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>Score: {modalClinica.score} | Etapa: {modalClinica.etapa}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['mensagem', 'ligacao', 'reuniao', 'ajuste'].map(t => (
                <button key={t} onClick={() => setContatoTipo(t)}
                  style={{ background: contatoTipo === t ? '#f59e0b' : '#1f2937', color: contatoTipo === t ? '#030712' : '#9ca3af', border: `1px solid ${contatoTipo === t ? '#f59e0b' : '#374151'}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: contatoTipo === t ? 600 : 400 }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <textarea value={contatoDesc} onChange={e => setContatoDesc(e.target.value)} placeholder="Descreva o contato realizado..."
              style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', minHeight: 80, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={registrarContato} disabled={salvando}
                style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
              <button onClick={() => { setModalClinica(null); setContatoDesc('') }}
                style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista acionavel */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Lista Acionavel</h2>
            <span style={{ fontSize: 11, color: '#6b7280' }}>{clinicas.length} clinicas</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Clinica', 'Etapa', 'Dias', 'Score', 'Alertas', 'Ultima acao', 'Acao'].map(h => (
                  <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #1f2937' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinicas.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1f293740' }}>
                  <td style={{ padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.nome}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: `${etapaColor(c.etapa)}20`, color: etapaColor(c.etapa), border: `1px solid ${etapaColor(c.etapa)}40`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                      {c.etapa.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 13, fontFamily: 'monospace' }}>{c.dias_na_plataforma}d</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: scoreColor(c.score), fontWeight: 700, fontSize: 14 }}>{c.score}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {c.alertas_count > 0 ? (
                      <span style={{ background: '#ef444420', color: '#ef4444', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>
                        {c.alertas_count}
                      </span>
                    ) : (
                      <span style={{ color: '#22c55e', fontSize: 11 }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>
                    {c.ultima_acao ? new Date(c.ultima_acao).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button onClick={() => setModalClinica(c)}
                      style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                      Registrar contato
                    </button>
                  </td>
                </tr>
              ))}
              {clinicas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhuma clinica cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Proximas acoes obrigatorias */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Proximas Acoes Obrigatorias</h2>
          </div>
          <div style={{ padding: proximas.length > 0 ? 0 : 20 }}>
            {proximas.length === 0 ? (
              <p style={{ color: '#22c55e', fontSize: 13, textAlign: 'center' }}>Tudo em dia! Nenhuma acao pendente.</p>
            ) : (
              proximas.map((a, i) => {
                const tipoColor = a.tipo === 'critico' ? '#ef4444' : a.tipo === 'risco' ? '#f97316' : a.tipo === 'onboarding' ? '#a855f7' : '#3b82f6'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < proximas.length - 1 ? '1px solid #1f293740' : 'none' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tipoColor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{a.clinica_nome}</span>
                      <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>{a.motivo}</span>
                    </div>
                    <button onClick={() => marcarFeito(a)}
                      style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                      Feito
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
