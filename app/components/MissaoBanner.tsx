'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Missao = { id: string; missao_label: string; pontos: number }

export default function MissaoBanner() {
  const [missao, setMissao] = useState<Missao | null>(null)
  const [email, setEmail] = useState('')
  const [concluindo, setConcluindo] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const e = session?.user?.email
      if (!e) return
      setEmail(e)
      const r = await fetch(`/api/missoes/pendentes?email=${encodeURIComponent(e)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ missoes: [] }))
      if (r.missoes?.[0]) setMissao(r.missoes[0])
    })()
  }, [])

  if (!missao) return null

  const concluir = async () => {
    setConcluindo(true)
    await fetch('/api/missoes/concluir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: email, missaoId: missao.id }),
    })
    setMissao(null)
  }

  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(245,158,11,0.08)',
        borderBottom: '1px solid rgba(245,158,11,0.25)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 16 }}>⚡</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>
          Missão: {missao.missao_label}
        </span>
        <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 8 }}>+{missao.pontos}pts</span>
      </div>
      <button
        onClick={concluir}
        disabled={concluindo}
        style={{
          background: 'rgba(29,158,117,0.2)',
          border: '1px solid rgba(29,158,117,0.4)',
          color: '#22c55e',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          cursor: 'pointer',
          fontWeight: 600,
          minHeight: 32,
          flexShrink: 0,
        }}
      >
        {concluindo ? '...' : '✓ Concluir'}
      </button>
    </div>
  )
}
