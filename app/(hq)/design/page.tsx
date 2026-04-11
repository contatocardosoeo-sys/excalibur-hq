'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

type Demanda = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  solicitante_email: string
  solicitante_nome: string | null
  responsavel_email: string | null
  responsavel_nome: string | null
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  status: 'recebida' | 'em_andamento' | 'revisao' | 'ajustes' | 'concluida' | 'cancelada'
  prazo_desejado: string | null
  data_entrega: string | null
  referencias: string[] | null
  feedback: string | null
  nota_qualidade: number | null
  tempo_estimado_horas: number | null
  criado_em: string
}

type Stats = {
  total: number
  por_status: Record<string, number>
  por_prioridade: Record<string, number>
  atrasadas: number
  hoje: number
  concluidas_hoje: number
}

type RotinaItem = {
  id: string
  ordem: number
  hora: string
  titulo: string
  descricao: string | null
  duracao_min: number | null
  categoria: string | null
}

const TIPOS: Record<string, { emoji: string; label: string }> = {
  video_curto:   { emoji: '🎬', label: 'Vídeo curto' },
  video_longo:   { emoji: '🎞️', label: 'Vídeo longo' },
  reel:          { emoji: '📱', label: 'Reel / Short' },
  arte_ads:      { emoji: '💰', label: 'Arte Ads' },
  post_feed:     { emoji: '📷', label: 'Post feed' },
  story:         { emoji: '⚡', label: 'Story' },
  banner:        { emoji: '🖼️', label: 'Banner' },
  logo:          { emoji: '🎨', label: 'Logo / Identidade' },
  apresentacao:  { emoji: '📊', label: 'Apresentação' },
  outro:         { emoji: '✨', label: 'Outro' },
}

const STATUS_COL = [
  { key: 'recebida',    label: 'Recebida',    emoji: '📥', cor: '#3b82f6' },
  { key: 'em_andamento', label: 'Em andamento', emoji: '⚙️', cor: '#f59e0b' },
  { key: 'revisao',     label: 'Revisão',     emoji: '👀', cor: '#a855f7' },
  { key: 'ajustes',     label: 'Ajustes',     emoji: '✏️', cor: '#ec4899' },
  { key: 'concluida',   label: 'Concluída',   emoji: '✅', cor: '#22c55e' },
] as const

const PRIORIDADE_COR: Record<string, string> = {
  urgente: 'bg-red-500/15 text-red-400 border-red-500/40',
  alta: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  media: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  baixa: 'bg-gray-500/15 text-gray-400 border-gray-600',
}

export default function DesignPage() {
  const [userRole, setUserRole] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userNome, setUserNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [rotina, setRotina] = useState<RotinaItem[]>([])
  const [aba, setAba] = useState<'kanban' | 'rotina' | 'nova'>('kanban')
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('')

  // Form nova demanda
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'video_curto',
    responsavel_email: 'juan.excalibur@gmail.com',
    prioridade: 'media',
    prazo_desejado: '',
    referencias: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return
      setUserEmail(user.email)
      const { data: interno } = await supabase.from('usuarios_internos').select('role, nome').eq('email', user.email).single()
      setUserRole(interno?.role || '')
      setUserNome(interno?.nome || '')

      // Responsável default no form: se é Juan, ele mesmo; se Vinicius, ele mesmo; senão Juan
      if (interno?.role === 'editor_video') {
        setForm(f => ({ ...f, responsavel_email: 'juan.excalibur@gmail.com' }))
      } else if (interno?.role === 'designer') {
        setForm(f => ({ ...f, responsavel_email: 'vinicius.excalibur@gmail.com' }))
      }

      // Se é Juan ou Vinicius, por padrão só vê suas próprias demandas
      if (interno?.role === 'editor_video' || interno?.role === 'designer') {
        setFiltroResponsavel(user.email)
      }

      const resp = interno?.role === 'editor_video' ? 'juan.excalibur@gmail.com'
        : interno?.role === 'designer' ? 'vinicius.excalibur@gmail.com' : null

      const params = new URLSearchParams()
      if (resp) params.set('responsavel', resp)

      const [dres, rres] = await Promise.all([
        fetch(`/api/design/demandas${params.toString() ? '?' + params : ''}`).then(r => r.json()),
        resp ? fetch(`/api/design/rotina?email=${resp}`).then(r => r.json()) : Promise.resolve({ rotina: [] }),
      ])
      setDemandas(dres.demandas || [])
      setStats(dres.stats || null)
      setRotina(rres.rotina || [])
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const criarDemanda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) { setMsg('❌ Título obrigatório'); return }
    setSalvando(true); setMsg('')
    try {
      const refs = form.referencias.split('\n').map(r => r.trim()).filter(Boolean)
      const responsavel_nome = form.responsavel_email === 'juan.excalibur@gmail.com' ? 'Juan'
        : form.responsavel_email === 'vinicius.excalibur@gmail.com' ? 'Vinicius' : null
      const r = await fetch('/api/design/demandas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          tipo: form.tipo,
          solicitante_email: userEmail,
          solicitante_nome: userNome,
          responsavel_email: form.responsavel_email,
          responsavel_nome,
          prioridade: form.prioridade,
          prazo_desejado: form.prazo_desejado || null,
          referencias: refs.length > 0 ? refs : null,
        }),
      }).then(r => r.json())
      if (r.success) {
        setMsg('✅ Demanda criada')
        setForm({ titulo: '', descricao: '', tipo: 'video_curto', responsavel_email: 'juan.excalibur@gmail.com', prioridade: 'media', prazo_desejado: '', referencias: '' })
        await carregar()
        setTimeout(() => { setAba('kanban'); setMsg('') }, 1500)
      } else {
        setMsg('❌ ' + (r.error || 'erro'))
      }
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setSalvando(false)
  }

  const moverDemanda = async (id: string, novoStatus: string) => {
    await fetch('/api/design/demandas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: novoStatus }),
    })
    await carregar()
  }

  const isJuan = userRole === 'editor_video'
  const isVini = userRole === 'designer'
  const isCriativo = isJuan || isVini
  const nomeUsuario = userNome || userEmail.split('@')[0]

  const demandasFiltradas = filtroResponsavel
    ? demandas.filter(d => d.responsavel_email === filtroResponsavel)
    : demandas

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold">
              🎨 Design & Vídeo
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {isCriativo
                ? `Olá, ${nomeUsuario.split(' ')[0]}. ${stats?.hoje || 0} demandas pra hoje · ${stats?.atrasadas || 0} atrasadas`
                : `Demandas de vídeo e design · solicite ou acompanhe`}
            </p>
          </div>
          <button
            onClick={() => setAba('nova')}
            className="bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl px-4 py-2 text-xs font-bold min-h-[44px] transition whitespace-nowrap"
          >
            + Nova demanda
          </button>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Abertas</div>
              <div className="text-white text-2xl font-bold mt-1">
                {(stats.por_status.recebida || 0) + (stats.por_status.em_andamento || 0) + (stats.por_status.revisao || 0) + (stats.por_status.ajustes || 0)}
              </div>
            </div>
            <div className={`bg-gray-900 border rounded-xl p-4 ${stats.atrasadas > 0 ? 'border-red-800/60' : 'border-gray-800'}`}>
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Atrasadas</div>
              <div className={`text-2xl font-bold mt-1 ${stats.atrasadas > 0 ? 'text-red-400' : 'text-gray-500'}`}>{stats.atrasadas}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Pra hoje</div>
              <div className="text-amber-400 text-2xl font-bold mt-1">{stats.hoje}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">🚨 Urgente</div>
              <div className="text-red-400 text-2xl font-bold mt-1">{stats.por_prioridade.urgente || 0}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Entregues hoje</div>
              <div className="text-green-400 text-2xl font-bold mt-1">{stats.concluidas_hoje}</div>
            </div>
          </div>
        )}

        {/* Abas */}
        <div className="border-b border-gray-800 mb-5 flex gap-1 overflow-x-auto">
          {[
            { id: 'kanban', label: '📋 Kanban' },
            ...(isCriativo ? [{ id: 'rotina', label: '⏰ Minha rotina' }] : []),
            { id: 'nova', label: '+ Nova demanda' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setAba(t.id as 'kanban' | 'rotina' | 'nova')}
              className={`px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap border-b-2 ${aba === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtro responsável (só quem não é criativo) */}
        {!isCriativo && aba === 'kanban' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroResponsavel('')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition min-h-[40px] ${!filtroResponsavel ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltroResponsavel('juan.excalibur@gmail.com')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition min-h-[40px] ${filtroResponsavel === 'juan.excalibur@gmail.com' ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}
            >
              🎬 Juan (vídeo)
            </button>
            <button
              onClick={() => setFiltroResponsavel('vinicius.excalibur@gmail.com')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition min-h-[40px] ${filtroResponsavel === 'vinicius.excalibur@gmail.com' ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}
            >
              🎨 Vinicius (design)
            </button>
          </div>
        )}

        {/* ABA KANBAN */}
        {aba === 'kanban' && (
          <div className="overflow-x-auto -mx-4 px-4 pb-4 md:mx-0 md:px-0">
            <div className="flex gap-3 min-w-[900px]">
              {STATUS_COL.map(col => {
                const items = demandasFiltradas.filter(d => d.status === col.key)
                return (
                  <div key={col.key} style={{ flex: '0 0 220px' }}>
                    <div className="rounded-lg border px-3 py-2 mb-2" style={{ background: col.cor + '15', borderColor: col.cor + '40' }}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold" style={{ color: col.cor }}>{col.emoji} {col.label}</div>
                        <div className="text-sm font-bold text-white">{items.length}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.length === 0 ? (
                        <div className="text-center text-gray-700 text-[10px] py-4 border border-dashed border-gray-800 rounded-lg">Vazio</div>
                      ) : items.map(d => {
                        const tipo = TIPOS[d.tipo] || TIPOS.outro
                        const atrasada = d.prazo_desejado && d.prazo_desejado < new Date().toISOString().split('T')[0] && !['concluida', 'cancelada'].includes(d.status)
                        const proxIdx = STATUS_COL.findIndex(s => s.key === d.status) + 1
                        const proxStatus = STATUS_COL[proxIdx]?.key
                        return (
                          <div key={d.id} className={`bg-gray-900 border rounded-lg p-3 ${atrasada ? 'border-red-500/40' : 'border-gray-800'}`}>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <div className="text-xs font-semibold text-white line-clamp-2 min-w-0 flex-1">{tipo.emoji} {d.titulo}</div>
                              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${PRIORIDADE_COR[d.prioridade] || PRIORIDADE_COR.media}`}>
                                {d.prioridade === 'urgente' ? '🚨' : d.prioridade.slice(0, 3).toUpperCase()}
                              </span>
                            </div>
                            {d.descricao && <div className="text-[10px] text-gray-500 mb-1 line-clamp-2">{d.descricao}</div>}
                            <div className="text-[9px] text-gray-600">
                              por {d.solicitante_nome || d.solicitante_email.split('@')[0]}
                              {d.responsavel_nome && <> · {d.responsavel_nome}</>}
                            </div>
                            {d.prazo_desejado && (
                              <div className={`text-[9px] mt-1 ${atrasada ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                                {atrasada ? '🔴' : '📅'} {d.prazo_desejado}
                              </div>
                            )}
                            {isCriativo && proxStatus && d.status !== 'concluida' && d.status !== 'cancelada' && (
                              <div className="flex gap-1 mt-2">
                                <button
                                  onClick={() => moverDemanda(d.id, proxStatus)}
                                  className="flex-1 text-[9px] py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
                                >
                                  → {STATUS_COL[proxIdx].label}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ABA ROTINA */}
        {aba === 'rotina' && isCriativo && (
          <div className="max-w-2xl">
            <div className="mb-4">
              <h2 className="text-white font-bold text-sm">⏰ Sua rotina do dia</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ajustável a qualquer momento — esse é o ritmo que você controla</p>
            </div>
            <div className="space-y-2">
              {rotina.map(r => {
                const corCat = r.categoria === 'deep_work' ? 'border-amber-500/40 bg-amber-500/5'
                  : r.categoria === 'break' ? 'border-green-500/40 bg-green-500/5'
                  : 'border-gray-800 bg-gray-900'
                return (
                  <div key={r.id} className={`border rounded-xl p-4 flex items-start gap-3 ${corCat}`}>
                    <div className="text-amber-400 font-mono font-bold text-sm w-14 shrink-0">{r.hora}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm">{r.titulo}</div>
                      {r.descricao && <div className="text-xs text-gray-400 mt-0.5">{r.descricao}</div>}
                      {r.duracao_min && <div className="text-[10px] text-gray-600 mt-1">{r.duracao_min} min · {r.categoria}</div>}
                    </div>
                  </div>
                )
              })}
              {rotina.length === 0 && <div className="text-center text-gray-500 text-sm py-8">Sem rotina cadastrada</div>}
            </div>
          </div>
        )}

        {/* ABA NOVA DEMANDA */}
        {aba === 'nova' && (
          <form onSubmit={criarDemanda} className="max-w-2xl bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-bold">Nova demanda criativa</h2>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">Título *</label>
              <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Reel motivacional 15s pra Meta Ads"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Tipo *</label>
                <select value={form.tipo} onChange={e => {
                  setForm({
                    ...form,
                    tipo: e.target.value,
                    responsavel_email: ['video_curto', 'video_longo', 'reel'].includes(e.target.value) ? 'juan.excalibur@gmail.com' : 'vinicius.excalibur@gmail.com',
                  })
                }} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white">
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Responsável *</label>
                <select value={form.responsavel_email} onChange={e => setForm({ ...form, responsavel_email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white">
                  <option value="juan.excalibur@gmail.com">🎬 Juan (vídeo)</option>
                  <option value="vinicius.excalibur@gmail.com">🎨 Vinicius (design)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Prioridade</label>
                <select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white">
                  <option value="baixa">🟢 Baixa</option>
                  <option value="media">🟡 Média</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Prazo desejado</label>
                <input type="date" value={form.prazo_desejado} onChange={e => setForm({ ...form, prazo_desejado: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">Descrição / Briefing *</label>
              <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={4}
                placeholder="O que precisa? Para que clínica/campanha? Duração? Formato? Texto principal?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" required />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">Referências (1 URL por linha)</label>
              <textarea value={form.referencias} onChange={e => setForm({ ...form, referencias: e.target.value })} rows={3}
                placeholder="https://instagram.com/p/...&#10;https://drive.google.com/..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-xs text-white font-mono" />
            </div>

            {msg && <div className="p-2 rounded bg-gray-800 text-xs text-gray-300">{msg}</div>}

            <button type="submit" disabled={salvando}
              className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-3 text-sm font-bold min-h-[44px] disabled:opacity-60">
              {salvando ? 'Criando...' : 'Criar demanda ⚔️'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
