'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type Missao = {
  id: string
  missao_key: string
  missao_label: string
  concluida: boolean
  concluida_em: string | null
  pontos: number
}

type MissoesResp = {
  missoes: Missao[]
  total: number
  concluidas: number
  pontos: number
  total_pontos: number
  pct: number
  nivel: number
  streak: number
  diasAtivo: number
  mediaConclPct: number
  mensagem: string
  tom: 'provocativo' | 'firme' | 'urgente' | 'neutro'
}

const TOM_CORES = {
  provocativo: { bg: '#f59e0b10', border: '#f59e0b60', text: '#f59e0b', emoji: '🔥' },
  firme: { bg: '#3b82f610', border: '#3b82f660', text: '#3b82f6', emoji: '💪' },
  urgente: { bg: '#ef444410', border: '#ef444460', text: '#ef4444', emoji: '⚠️' },
  neutro: { bg: '#11182700', border: '#1f2937', text: '#9ca3af', emoji: '🎯' },
}

export default function MissoesDiarias() {
  const [data, setData] = useState<MissoesResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const carregar = useCallback(async () => {
    if (!email) return
    try {
      const r = await fetch(`/api/missoes?email=${encodeURIComponent(email)}&role=${role}`, { cache: 'no-store' })
      const j = await r.json()
      setData(j)
    } catch {
      /* */
    }
    setLoading(false)
  }, [email, role])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) return
      setEmail(session.user.email)
      const { data: u } = await supabase
        .from('usuarios_internos')
        .select('role, roles')
        .eq('email', session.user.email)
        .single()
      if (u) setRole(u.roles?.[0] || u.role || 'admin')
    })()
  }, [])

  useEffect(() => {
    if (email && role) carregar()
  }, [email, role, carregar])

  const toggle = async (id: string, atual: boolean) => {
    if (!data) return
    setData(prev => prev ? {
      ...prev,
      missoes: prev.missoes.map(m => m.id === id ? { ...m, concluida: !atual } : m),
    } : prev)
    await fetch('/api/missoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, concluida: !atual }),
    })
    // Registrar evento comportamental (tempo/produtividade)
    fetch('/api/comportamento/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: email,
        role,
        tipo: 'missao_concluida',
        acao: !atual ? 'concluir' : 'desfazer',
        pagina: '/missoes',
        contexto: { missao_id: id },
      }),
    }).catch(() => {})
    setTimeout(carregar, 500)
  }

  if (loading || !data || data.missoes.length === 0) return null

  const { missoes, nivel, streak, mensagem, tom, pontos, total_pontos } = data
  const concluidas = missoes.filter(m => m.concluida).length
  const total = missoes.length
  const pct = Math.round((concluidas / total) * 100)
  const todasCompletas = concluidas === total
  const cores = TOM_CORES[tom]

  return (
    <div
      style={{
        background: todasCompletas ? '#22c55e08' : cores.bg,
        border: `1px solid ${todasCompletas ? '#22c55e40' : cores.border}`,
        borderRadius: 14,
        padding: collapsed ? '10px 14px' : 14,
        transition: 'all 0.2s',
      }}
    >
      {/* Header clicável */}
      <button
        data-touch-exempt
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          minHeight: 36,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{todasCompletas ? '🏆' : cores.emoji}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: todasCompletas ? '#22c55e' : cores.text }}>
              Missões · Nv.{nivel}
              {streak > 0 && <span style={{ marginLeft: 6, fontSize: 9, background: '#f59e0b20', color: '#f59e0b', padding: '1px 5px', borderRadius: 4 }}>🔥{streak}d</span>}
            </div>
            <div style={{ fontSize: 9, color: '#6b7280' }}>
              {concluidas}/{total} · {pontos}/{total_pontos}pts
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 50, height: 4, background: '#1f2937', borderRadius: 2 }}>
            <div
              style={{
                width: `${pct}%`,
                height: 4,
                borderRadius: 2,
                background: pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? '#22c55e' : '#fff', fontFamily: 'monospace' }}>
            {pct}%
          </span>
          <span style={{ fontSize: 9, color: '#6b7280' }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ marginTop: 10 }}>
          {/* Mensagem dinâmica do motor */}
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: cores.bg,
              border: `1px solid ${cores.border}`,
              fontSize: 11,
              color: cores.text,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {mensagem}
          </div>

          {/* Lista de missões */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {missoes.map(m => {
              const isBonus = m.missao_label.includes('🚀') || m.missao_label.includes('💎')
              return (
                <button
                  key={m.id}
                  data-touch-exempt
                  onClick={() => toggle(m.id, m.concluida)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: m.concluida ? '#22c55e08' : isBonus ? '#f59e0b08' : '#0a0f1a',
                    border: `1px solid ${m.concluida ? '#22c55e30' : isBonus ? '#f59e0b30' : '#1f2937'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: 38,
                    width: '100%',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>
                    {m.concluida ? '✅' : '⬜'}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: m.concluida ? '#22c55e' : isBonus ? '#f59e0b' : '#d1d5db',
                      textDecoration: m.concluida ? 'line-through' : 'none',
                      fontWeight: isBonus ? 700 : m.concluida ? 400 : 500,
                    }}
                  >
                    {m.missao_label}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: m.concluida ? '#22c55e' : isBonus ? '#f59e0b' : '#6b7280',
                      flexShrink: 0,
                    }}
                  >
                    +{m.pontos}
                  </span>
                </button>
              )
            })}
          </div>

          {todasCompletas && (
            <div style={{
              textAlign: 'center',
              padding: '6px 10px',
              background: '#22c55e10',
              borderRadius: 8,
              fontSize: 11,
              color: '#22c55e',
              fontWeight: 700,
              marginTop: 6,
            }}>
              🏆 {streak >= 3 ? `Streak de ${streak} dias! Imparável!` : 'Todas concluídas!'} +{pontos}pts
            </div>
          )}
        </div>
      )}
    </div>
  )
}
