'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log do erro pra comportamento_eventos (se endpoint existir)
    fetch('/api/comportamento/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: 'sistema',
        tipo: 'erro_aplicacao',
        pagina: typeof window !== 'undefined' ? window.location.pathname : '',
        acao: error.message?.slice(0, 200),
        contexto: { digest: error.digest, stack: error.stack?.slice(0, 500) },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#030712',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Algo deu errado
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Um erro inesperado aconteceu. O time técnico já foi notificado.
          Tente recarregar a página.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              background: '#f59e0b',
              color: '#030712',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            🔄 Tentar novamente
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              background: '#1f2937',
              color: '#9ca3af',
              border: '1px solid #374151',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              cursor: 'pointer',
              minHeight: 48,
            }}
          >
            Voltar ao início
          </button>
        </div>
        {error.digest && (
          <p style={{ color: '#374151', fontSize: 10, marginTop: 16, fontFamily: 'monospace' }}>
            ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
