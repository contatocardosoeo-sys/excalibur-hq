'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function ImplantacaoDesign() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [rotina, setRotina] = useState({ inicio: '08:30', prod_inicio: '09:00', prod_fim: '12:00', rev_inicio: '13:30', rev_fim: '16:00', fim: '18:00' })

  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user?.email) setEmail(session.user.email) }) }, [])

  const salvarRotina = async () => {
    setSalvando(true)
    await fetch('/api/design/rotina', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: email, hora: rotina.prod_inicio, titulo: 'Produção pesada', duracao_min: 180, categoria: 'producao', ordem: 1 }) })
    await fetch('/api/design/rotina', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: email, hora: rotina.rev_inicio, titulo: 'Revisões', duracao_min: 150, categoria: 'revisao', ordem: 2 }) })
    setSalvando(false)
    setEtapa(2)
  }

  const criarDemanda = async () => {
    await fetch('/api/design/demandas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: 'Demanda de teste — onboarding', tipo: 'Arte para redes sociais', prioridade: 'baixa', solicitante_email: email, solicitante_nome: 'Onboarding', descricao: 'Demanda de teste para entender o fluxo.' }) })
    router.replace('/design?tour=1')
  }

  const input: React.CSSProperties = { width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, minHeight: 40 }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>⚔️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Configurar sua operação</h1>
        </div>

        {etapa === 1 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Rotina diária</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {([['inicio', 'Início do dia'], ['prod_inicio', 'Produção pesada'], ['prod_fim', 'Fim produção'], ['rev_inicio', 'Revisões'], ['rev_fim', 'Fim revisões'], ['fim', 'Fim do dia']] as const).map(([k, l]) => (
                <div key={k}><label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4 }}>{l}</label><input type="time" value={rotina[k]} onChange={e => setRotina({ ...rotina, [k]: e.target.value })} style={input} /></div>
              ))}
            </div>
            <button onClick={salvarRotina} disabled={salvando} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 48, opacity: salvando ? 0.5 : 1 }}>
              {salvando ? '⏳...' : 'Salvar rotina →'}
            </button>
          </div>
        )}

        {etapa === 2 && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 20 }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Criar demanda de teste</h2>
            <div style={{ background: '#0a0f1a', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Demanda de teste — onboarding</div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Arte para redes sociais · Baixa · 8 dias úteis</div>
            </div>
            <button onClick={criarDemanda} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', minHeight: 52 }}>🚀 Criar e entrar →</button>
          </div>
        )}
      </div>
    </div>
  )
}
