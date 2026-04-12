'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImplantacaoSDR() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [status, setStatus] = useState<'idle' | 'testando' | 'ok' | 'erro'>('idle')
  const [webhookUrl, setWebhookUrl] = useState('')

  const testar = async () => {
    setStatus('testando')
    const r = await fetch('/api/wascript').then(r => r.json()).catch(() => ({ ok: false }))
    setStatus(r.ok || r.token_ativo ? 'ok' : 'erro')
  }

  const pular = () => router.replace('/sdr?tour=1')

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>⚔️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Configurar operação SDR</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>3 etapas antes de operar</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: n < etapa ? '#22c55e' : n === etapa ? '#f59e0b' : '#1f2937', color: n <= etapa ? '#030712' : '#6b7280' }}>
                  {n < etapa ? '✓' : n}
                </div>
                {n < 3 && <div style={{ width: 20, height: 2, background: '#1f2937' }} />}
              </div>
            ))}
          </div>
        </div>

        {etapa === 1 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>1. Conectar WhatsApp Web + Waseller</h2>
            <ol style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.8, paddingLeft: 20, marginBottom: 16 }}>
              <li>Abra <strong style={{ color: '#fff' }}>web.whatsapp.com</strong></li>
              <li>Extensão <strong style={{ color: '#fff' }}>Waseller</strong> deve estar ativa (ícone verde)</li>
            </ol>
            <button onClick={testar} disabled={status === 'testando'} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, opacity: status === 'testando' ? 0.5 : 1, minHeight: 48 }}>
              {status === 'testando' ? '⏳ Testando...' : '🔗 Testar conexão'}
            </button>
            {status === 'ok' && <div style={{ background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 10, padding: 12, textAlign: 'center', color: '#22c55e', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>✅ WhatsApp Web detectado!</div>}
            {status === 'erro' && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: 12, color: '#ef4444', fontSize: 13, marginBottom: 10 }}>❌ Não detectado. Abra web.whatsapp.com e tente novamente.</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={pular} style={{ flex: 1, background: '#1f2937', color: '#6b7280', border: '1px solid #374151', borderRadius: 10, padding: 10, fontSize: 12, cursor: 'pointer', minHeight: 44 }}>Configurar depois</button>
              <button onClick={() => setEtapa(2)} disabled={status !== 'ok'} style={{ flex: 2, background: status === 'ok' ? '#22c55e' : '#1f2937', color: status === 'ok' ? '#fff' : '#6b7280', border: 'none', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: status === 'ok' ? 'pointer' : 'not-allowed', minHeight: 44 }}>Próxima etapa →</button>
            </div>
          </div>
        )}

        {etapa === 2 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>2. Configurar webhook Waseller</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>No painel Waseller, configure a URL:</p>
            <div style={{ background: '#0a0f1a', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: '#f59e0b', marginBottom: 12, wordBreak: 'break-all' as const }}>https://excaliburhq.com.br/api/webhooks/waseller</div>
            <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>Token:</p>
            <div style={{ background: '#0a0f1a', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 10, color: '#6b7280', marginBottom: 16, wordBreak: 'break-all' as const }}>b6d353d7c22e11e85f48ae502a55199b1c3e0cd988412e694f991b2e0a9e9730</div>
            <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="Cole a URL configurada aqui..." style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, marginBottom: 12, minHeight: 44 }} />
            <button onClick={() => setEtapa(3)} disabled={!webhookUrl.includes('excaliburhq')} style={{ width: '100%', background: webhookUrl.includes('excaliburhq') ? '#22c55e' : '#1f2937', color: webhookUrl.includes('excaliburhq') ? '#fff' : '#6b7280', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: webhookUrl.includes('excaliburhq') ? 'pointer' : 'not-allowed', minHeight: 48 }}>Confirmar →</button>
          </div>
        )}

        {etapa === 3 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>3. Pronto!</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>Sua operação está configurada. O WhatsApp vai sincronizar automaticamente com o HQ.</p>
            <button onClick={() => router.replace('/sdr?tour=1')} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', minHeight: 52 }}>🚀 Entrar no sistema →</button>
          </div>
        )}
      </div>
    </div>
  )
}
