'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ImplantacaoCOO() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 540, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>⚔️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Sua operação, Luana</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Confirme as informações antes de operar</p>
        </div>

        {etapa === 1 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Metas — abril 2026</h2>
            {[
              { label: 'Agendamentos SDR', valor: '264/mês (12/dia)', ok: true },
              { label: 'Fechamentos Closer', valor: '45 vendas/mês', ok: true },
              { label: 'Meta receita', valor: 'R$90.000/mês', ok: true },
              { label: 'MRR atual', valor: 'R$84.800', ok: false },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1f293740' }}>
                <span>{m.ok ? '✅' : '🟡'}</span>
                <div style={{ flex: 1 }}><div style={{ color: '#d1d5db', fontSize: 13 }}>{m.label}</div><div style={{ color: '#6b7280', fontSize: 11 }}>{m.valor}</div></div>
              </div>
            ))}
            <button onClick={() => setEtapa(2)} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 16, minHeight: 48 }}>Metas confirmadas →</button>
          </div>
        )}

        {etapa === 2 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Comissionamento</h2>
            {[
              { cargo: 'SDR — Trindade', val: 'R$8 agend + R$12 compar + R$40 venda' },
              { cargo: 'Closer — Guilherme/Cardoso', val: '5% da 1ª mensalidade' },
              { cargo: 'Bônus equipe (45 vendas)', val: '+R$500 Closer / +R$300 SDR' },
              { cargo: 'Bônus equipe (63 vendas)', val: '+R$1.000 Closer / +R$600 SDR' },
            ].map((c, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1f293740' }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.cargo}</div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{c.val}</div>
              </div>
            ))}
            <button onClick={() => router.replace('/coo?tour=1')} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 16, minHeight: 52 }}>🚀 Confirmar e entrar →</button>
          </div>
        )}
      </div>
    </div>
  )
}
