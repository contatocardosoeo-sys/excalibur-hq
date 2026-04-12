'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const ETAPAS = ['D0', 'D7', 'D15', 'D30', 'D60', 'D90']
const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const FOCOS = ['Ortodontia', 'Implantodontia', 'Odontologia Geral', 'Estética Dental', 'Periodontia', 'Multiespecialidade']

type Cliente = {
  id: string; nome: string; cidade: string | null; estado: string | null
  whatsapp: string | null; data_inicio: string | null; plano: string | null
  valor_contrato: number | null; responsavel: string | null; score_total: number | null
  fase: string | null; foco: string | null; status: string; preenchido_por_nome: string | null
  preenchido_em_data: string | null
}

export default function ImplantacaoCS() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [progresso, setProgresso] = useState({ total: 48, concluidos: 0, percentual: 0, liberado: false, pendentes: 0 })
  const [aberto, setAberto] = useState<Cliente | null>(null)
  const [filtro, setFiltro] = useState('pendentes')
  const [busca, setBusca] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        supabase.from('usuarios_internos').select('nome').eq('email', session.user.email).single().then(({ data }) => setUserName(data?.nome?.split(' ')[0] || ''))
      }
    })
  }, [])

  const carregar = async () => {
    const r = await fetch('/api/onboarding/base-clientes', { cache: 'no-store' }).then(r => r.json())
    setClientes(r.clientes || [])
    setProgresso(r.progresso || { total: 48, concluidos: 0, percentual: 0, liberado: false, pendentes: 0 })
    if (r.progresso?.liberado) router.replace('/cs?tour=1')
  }

  useEffect(() => { carregar(); const i = setInterval(carregar, 5000); return () => clearInterval(i) }, [])

  const abrirCliente = (c: Cliente) => {
    setAberto(c)
    setForm({
      data_inicio_real: c.data_inicio?.slice(0, 10) || '',
      etapa_atual: c.fase || 'D0',
      plano: c.plano || '',
      valor_contrato: c.valor_contrato || 0,
      cidade: c.cidade || '',
      estado: c.estado || '',
      whatsapp: c.whatsapp || '',
      responsavel: c.responsavel || '',
      foco: c.foco || '',
      score_inicial: c.score_total || 50,
      situacao_atual: '',
      maior_desafio: '',
      proxima_acao: '',
      canal_preferido: 'WhatsApp',
    })
  }

  const salvar = async () => {
    if (!aberto) return
    setSalvando(true)
    await fetch('/api/onboarding/base-clientes/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: aberto.id,
        preenchidoPor: userEmail,
        preenchidoPorNome: userName,
        data_inicio_real: form.data_inicio_real,
        etapa_atual: form.etapa_atual,
        plano: form.plano,
        valor_contrato: form.valor_contrato,
        cidade: form.cidade,
        estado: form.estado,
        whatsapp_responsavel: form.whatsapp,
        nome_responsavel: form.responsavel,
        foco_principal: form.foco,
        score_inicial: form.score_inicial,
        situacao_atual: form.situacao_atual,
        maior_desafio: form.maior_desafio,
        proxima_acao: form.proxima_acao,
        canal_preferido: form.canal_preferido,
      }),
    })
    setSalvando(false)
    setAberto(null)
    carregar()
  }

  const filtrados = clientes
    .filter(c => filtro === 'todos' ? true : filtro === 'pendentes' ? c.status === 'pendente' : c.status === 'concluido')
    .filter(c => !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()))

  const input: React.CSSProperties = { width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, minHeight: 40 }
  const label: React.CSSProperties = { display: 'block', fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', padding: '24px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Atualizar base de clientes</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Preencha os dados reais de cada cliente antes de operar. Você e a Luana podem dividir.</p>
        </div>

        {/* Progresso */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            <span>Progresso</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{progresso.concluidos}/{progresso.total} ({progresso.percentual}%)</span>
          </div>
          <div style={{ height: 6, background: '#1f2937', borderRadius: 3 }}>
            <div style={{ height: 6, width: `${progresso.percentual}%`, background: '#22c55e', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...input, flex: 1 }} />
          {['pendentes', 'concluidos', 'todos'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, cursor: 'pointer', background: filtro === f ? '#f59e0b20' : '#111827', border: `1px solid ${filtro === f ? '#f59e0b' : '#1f2937'}`, color: filtro === f ? '#f59e0b' : '#6b7280', textTransform: 'capitalize' as const, minHeight: 40 }}>
              {f}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map(c => (
            <div key={c.id} style={{ background: '#111827', border: `1px solid ${c.status === 'concluido' ? '#22c55e30' : '#1f2937'}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{c.status === 'concluido' ? '✅' : '⬜'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>
                  {c.status === 'concluido' ? `por ${c.preenchido_por_nome} em ${c.preenchido_em_data}` : `Score: ${c.score_total || '?'} · ${c.cidade || '?'}`}
                </div>
              </div>
              {c.status !== 'concluido' && (
                <button onClick={() => abrirCliente(c)} style={{ background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}>
                  Preencher →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {aberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={e => e.target === e.currentTarget && setAberto(null)}>
          <div style={{ background: '#111827', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 20, border: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Atualizar</div>
                <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{aberto.nome}</h2>
              </div>
              <button onClick={() => setAberto(null)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Seção 1 */}
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #1f2937' }}>1. Dados básicos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div><label style={label}>Data início *</label><input type="date" value={String(form.data_inicio_real || '')} onChange={e => setForm({ ...form, data_inicio_real: e.target.value })} style={input} /></div>
              <div><label style={label}>Etapa</label><select value={String(form.etapa_atual)} onChange={e => setForm({ ...form, etapa_atual: e.target.value })} style={input}>{ETAPAS.map(e => <option key={e}>{e}</option>)}</select></div>
              <div><label style={label}>Plano</label><input value={String(form.plano || '')} onChange={e => setForm({ ...form, plano: e.target.value })} style={input} /></div>
              <div><label style={label}>Valor contrato</label><input type="number" value={Number(form.valor_contrato || 0)} onChange={e => setForm({ ...form, valor_contrato: Number(e.target.value) })} style={input} /></div>
            </div>

            {/* Seção 2 */}
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #1f2937' }}>2. Dados faltantes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div><label style={label}>Cidade *</label><input value={String(form.cidade || '')} onChange={e => setForm({ ...form, cidade: e.target.value })} style={input} /></div>
              <div><label style={label}>Estado</label><select value={String(form.estado || '')} onChange={e => setForm({ ...form, estado: e.target.value })} style={input}><option value="">-</option>{ESTADOS.map(e => <option key={e}>{e}</option>)}</select></div>
              <div><label style={label}>WhatsApp *</label><input value={String(form.whatsapp || '')} onChange={e => setForm({ ...form, whatsapp: e.target.value })} style={input} placeholder="(48) 99999-9999" /></div>
              <div><label style={label}>Responsável</label><input value={String(form.responsavel || '')} onChange={e => setForm({ ...form, responsavel: e.target.value })} style={input} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={label}>Foco</label><select value={String(form.foco || '')} onChange={e => setForm({ ...form, foco: e.target.value })} style={input}><option value="">-</option>{FOCOS.map(f => <option key={f}>{f}</option>)}</select></div>
            </div>

            {/* Seção 3 */}
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #1f2937' }}>3. Avaliação CS</div>
            <div style={{ marginBottom: 8 }}>
              <label style={label}>Score inicial: {form.score_inicial}</label>
              <input type="range" min={0} max={100} value={Number(form.score_inicial)} onChange={e => setForm({ ...form, score_inicial: Number(e.target.value) })} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 8 }}><label style={label}>Situação atual *</label><textarea value={String(form.situacao_atual || '')} onChange={e => setForm({ ...form, situacao_atual: e.target.value })} style={{ ...input, minHeight: 60 }} /></div>
            <div style={{ marginBottom: 8 }}><label style={label}>Maior desafio</label><textarea value={String(form.maior_desafio || '')} onChange={e => setForm({ ...form, maior_desafio: e.target.value })} style={{ ...input, minHeight: 50 }} /></div>
            <div style={{ marginBottom: 16 }}><label style={label}>Próxima ação *</label><textarea value={String(form.proxima_acao || '')} onChange={e => setForm({ ...form, proxima_acao: e.target.value })} style={{ ...input, minHeight: 50 }} /></div>

            <button onClick={salvar} disabled={salvando || !form.cidade || !form.whatsapp || !form.situacao_atual || !form.proxima_acao} style={{ width: '100%', background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 800, cursor: 'pointer', minHeight: 48, opacity: salvando ? 0.5 : 1 }}>
              {salvando ? '⏳ Salvando...' : 'Salvar e ir para o próximo →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
