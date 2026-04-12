'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ImplantacaoCloser() {
  const router = useRouter()
  const [pipeline, setPipeline] = useState<Array<{ id: string; nome_clinica: string; status: string; mrr_proposto: number }>>([])
  const [validacoes, setValidacoes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/comercial/pipeline').then(r => r.json()).then(d => setPipeline(d.pipeline || []))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>⚔️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Validar pipeline</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Confirme que os leads são reais ({pipeline.length} no pipeline)</p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
          {pipeline.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Nenhum lead ainda. Você vai adicionar conforme reuniões chegarem.</p>}
          {pipeline.map(card => (
            <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#0a0f1a', borderRadius: 10, marginBottom: 6, border: '1px solid #1f2937' }}>
              <input type="checkbox" checked={validacoes[card.id] || false} onChange={e => setValidacoes({ ...validacoes, [card.id]: e.target.checked })} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{card.nome_clinica || 'Lead'}</div>
                <div style={{ color: '#6b7280', fontSize: 11 }}>{card.status} · R${Number(card.mrr_proposto || 0).toLocaleString('pt-BR')}</div>
              </div>
              <span style={{ fontSize: 11, color: validacoes[card.id] ? '#22c55e' : '#6b7280' }}>{validacoes[card.id] ? '✅' : '⬜'}</span>
            </div>
          ))}
          <button onClick={() => router.replace('/comercial?tour=1')} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 16, minHeight: 52 }}>
            ✅ Entrar no sistema →
          </button>
        </div>
      </div>
    </div>
  )
}
