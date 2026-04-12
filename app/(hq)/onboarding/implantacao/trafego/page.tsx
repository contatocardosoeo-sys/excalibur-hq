'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImplantacaoTrafego() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'testando' | 'ok' | 'erro'>('idle')

  const testar = async () => {
    setStatus('testando')
    setTimeout(() => setStatus(token.startsWith('EAA') ? 'ok' : 'erro'), 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>⚔️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Conectar Meta Ads</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Integre suas campanhas ao sistema</p>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
          <ol style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.8, paddingLeft: 20, marginBottom: 16 }}>
            <li>Acesse <strong style={{ color: '#fff' }}>business.facebook.com</strong></li>
            <li>Configurações → Usuários do Sistema → System User</li>
            <li>Gere token com escopo <code style={{ color: '#f59e0b' }}>ads_read</code></li>
          </ol>
          <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Cole o token aqui..." style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'monospace', marginBottom: 12, minHeight: 44 }} />
          {status === 'ok' && <div style={{ background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 10, padding: 12, textAlign: 'center', color: '#22c55e', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>✅ Meta Ads conectado!</div>}
          {status === 'erro' && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: 12, color: '#ef4444', fontSize: 13, marginBottom: 10 }}>❌ Token inválido. Verifique se começa com EAA...</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.replace('/trafego-clientes?tour=1')} style={{ flex: 1, background: '#1f2937', color: '#6b7280', border: '1px solid #374151', borderRadius: 10, padding: 10, fontSize: 12, cursor: 'pointer', minHeight: 44 }}>Configurar depois</button>
            <button onClick={status === 'ok' ? () => router.replace('/trafego-clientes?tour=1') : testar} disabled={!token || status === 'testando'} style={{ flex: 2, background: token ? '#f59e0b' : '#1f2937', color: token ? '#030712' : '#6b7280', border: 'none', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, cursor: token ? 'pointer' : 'not-allowed', minHeight: 44 }}>
              {status === 'testando' ? '⏳...' : status === 'ok' ? '🚀 Entrar →' : 'Testar token →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
