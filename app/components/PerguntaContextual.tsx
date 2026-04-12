'use client'

import { useEffect, useState } from 'react'

type Pergunta = {
  id: string
  gatilho: string
  pergunta: string
  opcoes: Array<{ label: string; valor: string }> | null
}

export default function PerguntaContextual({ userEmail, pagina }: { userEmail: string; pagina: string }) {
  const [pergunta, setPergunta] = useState<Pergunta | null>(null)
  const [respondendo, setRespondendo] = useState(false)
  const [respostaLivre, setRespostaLivre] = useState('')
  const [mostrou, setMostrou] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!userEmail || mostrou) return
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/feedback?email=${encodeURIComponent(userEmail)}`, { cache: 'no-store' })
        const j = await r.json()
        if (j.pergunta) {
          setPergunta(j.pergunta)
          setVisible(true)
          setMostrou(true)
        }
      } catch {
        /* */
      }
    }, 8000) // aparece após 8s na página
    return () => clearTimeout(timer)
  }, [userEmail, pagina, mostrou])

  const responder = async (valor: string) => {
    if (!pergunta) return
    setRespondendo(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pergunta_id: pergunta.id,
        user_email: userEmail,
        resposta: valor,
        resposta_livre: respostaLivre || null,
      }),
    })
    setVisible(false)
    setPergunta(null)
  }

  const dispensar = async () => {
    if (!pergunta) return
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pergunta_id: pergunta.id,
        user_email: userEmail,
        acao: 'dispensar',
      }),
    })
    setVisible(false)
    setPergunta(null)
  }

  if (!visible || !pergunta) return null

  const opcoes = pergunta.opcoes || [
    { label: 'Sim, fácil', valor: 'facil' },
    { label: 'Tive dificuldade', valor: 'dificil' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 55,
        width: 320,
        maxWidth: 'calc(100vw - 32px)',
        background: '#111827',
        border: '1px solid #f59e0b40',
        borderRadius: 14,
        padding: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      <button
        data-touch-exempt
        onClick={dispensar}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          color: '#6b7280',
          cursor: 'pointer',
          fontSize: 14,
          minHeight: 28,
        }}
      >
        ✕
      </button>

      <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        💡 Pergunta rápida
      </div>

      <p style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>
        {pergunta.pergunta}
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {opcoes.map((o, i) => (
          <button
            key={i}
            onClick={() => responder(o.valor)}
            disabled={respondendo}
            style={{
              flex: 1,
              minHeight: 40,
              minWidth: 100,
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#d1d5db',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 12px',
              opacity: respondendo ? 0.5 : 1,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={respostaLivre}
        onChange={e => setRespostaLivre(e.target.value)}
        placeholder="Ou escreva algo..."
        style={{
          width: '100%',
          background: '#0a0f1a',
          border: '1px solid #1f2937',
          borderRadius: 8,
          padding: '8px 10px',
          color: '#fff',
          fontSize: 11,
          minHeight: 36,
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && respostaLivre.trim()) responder(respostaLivre)
        }}
      />
    </div>
  )
}
