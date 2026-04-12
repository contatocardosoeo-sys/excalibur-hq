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

export default function MissoesDiarias() {
  const [missoes, setMissoes] = useState<Missao[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const carregar = useCallback(async () => {
    if (!email) return
    try {
      const r = await fetch(`/api/missoes?email=${encodeURIComponent(email)}&role=${role}`, { cache: 'no-store' })
      const j = await r.json()
      setMissoes(j.missoes || [])
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
    setMissoes(prev => prev.map(m => m.id === id ? { ...m, concluida: !atual } : m))
    await fetch('/api/missoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, concluida: !atual }),
    })
  }

  if (loading || missoes.length === 0) return null

  const concluidas = missoes.filter(m => m.concluida).length
  const total = missoes.length
  const pct = Math.round((concluidas / total) * 100)
  const pontos = missoes.filter(m => m.concluida).reduce((s, m) => s + m.pontos, 0)
  const totalPontos = missoes.reduce((s, m) => s + m.pontos, 0)
  const todasCompletas = concluidas === total

  return (
    <div
      style={{
        background: todasCompletas ? '#22c55e10' : '#111827',
        border: `1px solid ${todasCompletas ? '#22c55e40' : '#1f2937'}`,
        borderRadius: 14,
        padding: collapsed ? '10px 16px' : 16,
        marginBottom: 16,
        transition: 'all 0.2s',
      }}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{todasCompletas ? '🏆' : '🎯'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: todasCompletas ? '#22c55e' : '#f59e0b' }}>
            Missões do dia
          </span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            {concluidas}/{total} · {pontos}/{totalPontos} pts
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mini progress bar */}
          <div style={{ width: 60, height: 4, background: '#1f2937', borderRadius: 2 }}>
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
          <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#22c55e' : '#fff' }}>
            {pct}%
          </span>
          <span style={{ fontSize: 10, color: '#6b7280' }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {missoes.map(m => (
            <button
              key={m.id}
              data-touch-exempt
              onClick={() => toggle(m.id, m.concluida)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: m.concluida ? '#22c55e10' : '#0a0f1a',
                border: `1px solid ${m.concluida ? '#22c55e30' : '#1f2937'}`,
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 44,
                width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>
                {m.concluida ? '✅' : '⬜'}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: m.concluida ? '#22c55e' : '#d1d5db',
                  textDecoration: m.concluida ? 'line-through' : 'none',
                  fontWeight: m.concluida ? 400 : 500,
                }}
              >
                {m.missao_label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: m.concluida ? '#22c55e' : '#f59e0b',
                  background: m.concluida ? '#22c55e15' : '#f59e0b15',
                  padding: '2px 6px',
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              >
                +{m.pontos}pt
              </span>
            </button>
          ))}

          {todasCompletas && (
            <div
              style={{
                textAlign: 'center',
                padding: '8px 12px',
                background: '#22c55e15',
                borderRadius: 8,
                fontSize: 12,
                color: '#22c55e',
                fontWeight: 700,
              }}
            >
              🏆 Todas as missões do dia concluídas! +{pontos} pontos
            </div>
          )}
        </div>
      )}
    </div>
  )
}
