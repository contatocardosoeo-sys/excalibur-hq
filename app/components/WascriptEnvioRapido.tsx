'use client'

import { useEffect, useState } from 'react'

type Health = {
  ok: boolean
  token_ativo?: boolean
  total_etiquetas?: number
  erro?: string
}

type Toast = { id: number; texto: string; ok: boolean }

const MSG_TIPOS: Array<{
  tipo: 'confirmacao' | 'lembrete' | 'pos_reuniao' | 'no_show'
  label: string
  emoji: string
  cor: string
}> = [
  { tipo: 'confirmacao', label: 'Confirmar reunião', emoji: '📅', cor: '#60a5fa' },
  { tipo: 'lembrete', label: 'Lembrete', emoji: '🔔', cor: '#fbbf24' },
  { tipo: 'pos_reuniao', label: 'Pós-reunião', emoji: '✅', cor: '#22c55e' },
  { tipo: 'no_show', label: 'No-show', emoji: '😔', cor: '#ef4444' },
]

export default function WascriptEnvioRapido() {
  const [health, setHealth] = useState<Health | null>(null)
  const [telefone, setTelefone] = useState('')
  const [mensagemCustom, setMensagemCustom] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    fetch('/api/wascript', { cache: 'no-store' })
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, erro: 'sem conexão' }))
  }, [])

  const addToast = (texto: string, ok: boolean) => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, texto, ok }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }

  const enviarPadrao = async (tipo: (typeof MSG_TIPOS)[number]['tipo']) => {
    if (!telefone.trim()) {
      addToast('Informe o telefone primeiro', false)
      return
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/wascript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'enviar_msg_padrao', telefone, tipo }),
      })
      const d = await r.json()
      addToast(d.success ? `✓ ${tipo} enviado pra ${telefone}` : `❌ ${d.message || 'falhou'}`, !!d.success)
    } catch (e) {
      addToast(`❌ ${e instanceof Error ? e.message : 'erro'}`, false)
    }
    setEnviando(false)
  }

  const enviarCustom = async () => {
    if (!telefone.trim() || !mensagemCustom.trim()) {
      addToast('Informe telefone e mensagem', false)
      return
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/wascript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'enviar_texto', telefone, mensagem: mensagemCustom }),
      })
      const d = await r.json()
      if (d.success) {
        addToast(`✓ Enviado pra ${telefone}`, true)
        setMensagemCustom('')
      } else {
        addToast(`❌ ${d.message || 'falhou'}`, false)
      }
    } catch (e) {
      addToast(`❌ ${e instanceof Error ? e.message : 'erro'}`, false)
    }
    setEnviando(false)
  }

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Header com status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            📱 Envio rápido WhatsApp
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
            {health === null && 'verificando conexão...'}
            {health?.ok && <span style={{ color: '#22c55e' }}>🟢 Wascript conectado · {health.total_etiquetas} etiquetas</span>}
            {health && !health.ok && <span style={{ color: '#ef4444' }}>❌ {health.erro || 'desconectado'}</span>}
          </div>
        </div>
      </div>

      {/* Input telefone */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
          Telefone (DDD + número)
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
          placeholder="48999015419"
          style={{
            width: '100%',
            marginTop: 4,
            background: '#0a0f1a',
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#fff',
            fontSize: 14,
            fontFamily: 'monospace',
            minHeight: 44,
            outline: 'none',
          }}
        />
      </div>

      {/* Botões de mensagem rápida */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6, marginBottom: 12 }}>
        {MSG_TIPOS.map(m => (
          <button
            key={m.tipo}
            data-touch-exempt
            onClick={() => enviarPadrao(m.tipo)}
            disabled={enviando || !health?.ok}
            style={{
              minHeight: 44,
              background: `${m.cor}15`,
              border: `1px solid ${m.cor}40`,
              color: m.cor,
              borderRadius: 10,
              padding: '8px 12px',
              cursor: enviando || !health?.ok ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              opacity: enviando || !health?.ok ? 0.5 : 1,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mensagem custom */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
          Mensagem personalizada
        </label>
        <textarea
          value={mensagemCustom}
          onChange={e => setMensagemCustom(e.target.value)}
          placeholder="Escreva uma mensagem..."
          rows={2}
          style={{
            width: '100%',
            marginTop: 4,
            background: '#0a0f1a',
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#fff',
            fontSize: 13,
            resize: 'vertical',
            minHeight: 60,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>
      <button
        data-touch-exempt
        onClick={enviarCustom}
        disabled={enviando || !health?.ok || !mensagemCustom.trim()}
        style={{
          minHeight: 44,
          width: '100%',
          background: '#f59e0b',
          color: '#030712',
          border: 'none',
          borderRadius: 10,
          padding: '10px 14px',
          cursor: enviando || !health?.ok || !mensagemCustom.trim() ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 700,
          opacity: enviando || !health?.ok || !mensagemCustom.trim() ? 0.4 : 1,
        }}
      >
        {enviando ? '⏳ Enviando...' : '📤 Enviar mensagem personalizada'}
      </button>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                background: t.ok ? '#22c55e15' : '#ef444415',
                border: `1px solid ${t.ok ? '#22c55e40' : '#ef444440'}`,
                color: t.ok ? '#22c55e' : '#ef4444',
                fontWeight: 600,
              }}
            >
              {t.texto}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
