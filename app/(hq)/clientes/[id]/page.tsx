'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

type Clinica = {
  id: string
  nome: string
  cnpj: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  instagram: string | null
  responsavel: string | null
  cidade: string | null
  estado: string | null
  especialidade: string | null
  segmento: string | null
  plano: string | null
  valor_contrato: number | null
  data_inicio: string | null
  ativo: boolean | null
  status: string | null
  status_cliente: string | null
  aviso_previo_inicio: string | null
  cs_responsavel: string | null
  fase: string | null
  subfase: string | null
  status_execucao: string | null
  num_salas: number | null
  num_crc: number | null
  num_recepcao: number | null
  num_avaliador: number | null
  num_orcamentista: number | null
  profissional_multipapel: string | null
  faturamento_medio: number | null
  investimento_trafego: number | null
  mrr: number | null
  ticket_medio: number | null
  ticket: number | null
  roi: number | null
  meta_faturamento: number | null
  meta_leads: number | null
  adocao_crm: boolean | null
  adocao_responde_leads: boolean | null
  adocao_assiste_aulas: boolean | null
  adocao_planilha: boolean | null
  adocao_script: boolean | null
  adocao_reunioes: boolean | null
  score_total: number | null
  score_adocao: number | null
  score_operacao: number | null
  score_resultado: number | null
  notas_cs: string | null
  problema_detectado: string | null
  proxima_acao: string | null
  crm_ativo: boolean | null
  campanha_ativa: boolean | null
  leads_semana: number | null
  dias_sem_venda: number | null
  foco: string | null
}

type PerfilData = {
  clinica: Clinica
  jornada: { etapa?: string; dias_na_plataforma?: number } | null
  adocao: { score?: number; classificacao?: string } | null
  alertas: Array<{ id: string; titulo: string; descricao: string; nivel: number; created_at: string }>
  aviso_previo_dias_restantes: number | null
}

function fmtBRL(v: string | number | null | undefined) {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(v: string | number | null | undefined) {
  if (!v) return '—'
  const s = typeof v === 'number' ? String(v) : v
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
}

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [dados, setDados] = useState<PerfilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState(false)
  const [form, setForm] = useState<Partial<Clinica>>({})
  const [isAdmin, setIsAdmin] = useState(false)

  const carregar = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await fetch(`/api/clientes/${id}`)
    if (res.ok) {
      const data = await res.json()
      setDados(data)
      setForm(data.clinica)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        const { data: u } = await supabase.from('usuarios_internos').select('roles, role').eq('email', session.user.email).single()
        const roles: string[] = (u?.roles && Array.isArray(u.roles) && u.roles.length > 0) ? u.roles : [u?.role || '']
        setIsAdmin(roles.includes('admin'))
      }
    })()
  }, [])

  const salvar = async () => {
    setSalvando(true)
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await carregar()
      setEditando(false)
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Erro ao salvar: ' + (err.error || 'desconhecido'))
    }
    setSalvando(false)
  }

  const deletar = async () => {
    if (!confirm(`Deletar permanentemente a clinica "${dados?.clinica.nome}"? Todos os dados relacionados (jornada, tarefas, alertas, funil) serao apagados. Esta acao nao pode ser desfeita.`)) return
    setDeletando(true)
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/clientes')
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Erro ao deletar: ' + (err.error || 'desconhecido'))
      setDeletando(false)
    }
  }

  const ativarAvisoPrevio = async () => {
    if (!confirm('Marcar cliente em AVISO PRÉVIO (30 dias para saída)?')) return
    const hoje = new Date().toISOString().split('T')[0]
    await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aviso_previo_inicio: hoje, status_cliente: 'aviso_previo' }),
    })
    await carregar()
  }

  const cancelarAvisoPrevio = async () => {
    if (!confirm('Cancelar aviso prévio? Cliente voltará ao status ativo.')) return
    await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aviso_previo_inicio: null, status_cliente: 'ativo' }),
    })
    await carregar()
  }

  if (loading || !dados) {
    return (
      <div className="min-h-screen bg-gray-950 flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="h-8 w-64 bg-gray-800 rounded mb-6 animate-pulse" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map(i => <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  const c = dados.clinica
  const avisoAtivo = dados.aviso_previo_dias_restantes != null
  const avisoDias = dados.aviso_previo_dias_restantes ?? 0

  const setField = <K extends keyof Clinica>(k: K, v: Clinica[K]) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <button onClick={() => router.push('/clientes')} className="text-gray-500 text-sm mb-4 hover:text-amber-400 transition">
          ← Voltar para clientes
        </button>

        {/* Header + ações */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-white text-2xl font-bold">{c.nome}</h1>
                {avisoAtivo && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/40 rounded-full px-3 py-1 text-xs font-bold uppercase animate-pulse">
                    ⚠️ AVISO PRÉVIO · {avisoDias > 0 ? `${avisoDias}d restantes` : 'EXPIRADO'}
                  </span>
                )}
                {c.status_cliente && !avisoAtivo && (
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 rounded-full px-3 py-1 text-[11px]">
                    {c.status_cliente}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                <span>CS: <span className="text-white">{c.cs_responsavel || '—'}</span></span>
                {dados.jornada?.etapa && <span>Etapa: <span className="text-amber-400">{dados.jornada.etapa.replace(/_/g, ' ')}</span></span>}
                {dados.jornada?.dias_na_plataforma != null && <span>Dia: <span className="text-white">{dados.jornada.dias_na_plataforma}</span></span>}
                {dados.adocao?.score != null && <span>Health Score: <span className="text-white font-bold">{dados.adocao.score}</span></span>}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => router.push(`/jornada/${id}`)}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg px-4 py-2 text-sm font-medium transition">
                📋 Ver jornada
              </button>
              {!editando ? (
                <button onClick={() => setEditando(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition flex items-center gap-2">
                  ✏️ Editar
                </button>
              ) : (
                <>
                  <button onClick={salvar} disabled={salvando}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50">
                    {salvando ? 'Salvando...' : '💾 Salvar'}
                  </button>
                  <button onClick={() => { setEditando(false); setForm(c) }}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition">
                    Cancelar
                  </button>
                </>
              )}
              {!avisoAtivo ? (
                <button onClick={ativarAvisoPrevio}
                  className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg px-4 py-2 text-sm font-medium transition">
                  ⚠️ Aviso prévio
                </button>
              ) : (
                <button onClick={cancelarAvisoPrevio}
                  className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 text-sm font-medium transition">
                  ✅ Cancelar aviso
                </button>
              )}
              {isAdmin && (
                <button onClick={deletar} disabled={deletando}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50">
                  {deletando ? 'Deletando...' : '🗑️ Deletar'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alertas ativos */}
        {dados.alertas.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="text-red-400 text-xs font-bold uppercase mb-2">⚠️ {dados.alertas.length} Alerta{dados.alertas.length > 1 ? 's' : ''} ativo{dados.alertas.length > 1 ? 's' : ''}</div>
            <ul className="space-y-1">
              {dados.alertas.map(a => (
                <li key={a.id} className="text-red-200 text-sm">• {a.titulo || a.descricao}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Seções de informações */}
        <div className="grid grid-cols-2 gap-6">
          {/* Identificação */}
          <Secao titulo="Identificação">
            <Campo label="Nome" valor={form.nome} editando={editando} onChange={v => setField('nome', v)} />
            <Campo label="CNPJ" valor={form.cnpj} editando={editando} onChange={v => setField('cnpj', v)} />
            <Campo label="Responsável" valor={form.responsavel} editando={editando} onChange={v => setField('responsavel', v)} />
            <Campo label="E-mail" valor={form.email} editando={editando} onChange={v => setField('email', v)} />
            <Campo label="Telefone" valor={form.telefone} editando={editando} onChange={v => setField('telefone', v)} />
            <Campo label="WhatsApp" valor={form.whatsapp} editando={editando} onChange={v => setField('whatsapp', v)} />
            <Campo label="Instagram" valor={form.instagram} editando={editando} onChange={v => setField('instagram', v)} />
          </Secao>

          {/* Localização */}
          <Secao titulo="Localização & Perfil">
            <Campo label="Cidade" valor={form.cidade} editando={editando} onChange={v => setField('cidade', v)} />
            <Campo label="Estado" valor={form.estado} editando={editando} onChange={v => setField('estado', v)} />
            <Campo label="Especialidade" valor={form.especialidade} editando={editando} onChange={v => setField('especialidade', v)} />
            <Campo label="Segmento" valor={form.segmento} editando={editando} onChange={v => setField('segmento', v)} />
            <Campo label="Foco" valor={form.foco} editando={editando} onChange={v => setField('foco', v)} />
          </Secao>

          {/* Contrato */}
          <Secao titulo="Contrato & Plano">
            <Campo label="Plano" valor={form.plano} editando={editando} onChange={v => setField('plano', v)} />
            <Campo label="Valor contrato" valor={form.valor_contrato} tipo="number" editando={editando} onChange={v => setField('valor_contrato', v === '' ? null : Number(v))} formatador={fmtBRL} />
            <Campo label="Data início" valor={form.data_inicio} tipo="date" editando={editando} onChange={v => setField('data_inicio', v || null)} formatador={fmtDate} />
            <Campo label="Aviso prévio início" valor={form.aviso_previo_inicio} tipo="date" editando={editando} onChange={v => setField('aviso_previo_inicio', v || null)} formatador={fmtDate} />
            <Campo label="Status cliente" valor={form.status_cliente} editando={editando} onChange={v => setField('status_cliente', v)} />
            <Campo label="CS responsável" valor={form.cs_responsavel} editando={editando} onChange={v => setField('cs_responsavel', v)} />
          </Secao>

          {/* Estrutura */}
          <Secao titulo="Estrutura da clínica">
            <Campo label="Nº salas" valor={form.num_salas} tipo="number" editando={editando} onChange={v => setField('num_salas', v === '' ? null : Number(v))} />
            <Campo label="Nº CRC" valor={form.num_crc} tipo="number" editando={editando} onChange={v => setField('num_crc', v === '' ? null : Number(v))} />
            <Campo label="Nº recepção" valor={form.num_recepcao} tipo="number" editando={editando} onChange={v => setField('num_recepcao', v === '' ? null : Number(v))} />
            <Campo label="Nº avaliador" valor={form.num_avaliador} tipo="number" editando={editando} onChange={v => setField('num_avaliador', v === '' ? null : Number(v))} />
            <Campo label="Nº orçamentista" valor={form.num_orcamentista} tipo="number" editando={editando} onChange={v => setField('num_orcamentista', v === '' ? null : Number(v))} />
            <Campo label="Profissional multipapel" valor={form.profissional_multipapel} editando={editando} onChange={v => setField('profissional_multipapel', v)} />
          </Secao>

          {/* Financeiro */}
          <Secao titulo="Financeiro & Metas">
            <Campo label="MRR" valor={form.mrr} tipo="number" editando={editando} onChange={v => setField('mrr', v === '' ? null : Number(v))} formatador={fmtBRL} />
            <Campo label="Faturamento médio" valor={form.faturamento_medio} tipo="number" editando={editando} onChange={v => setField('faturamento_medio', v === '' ? null : Number(v))} formatador={fmtBRL} />
            <Campo label="Investimento tráfego" valor={form.investimento_trafego} tipo="number" editando={editando} onChange={v => setField('investimento_trafego', v === '' ? null : Number(v))} formatador={fmtBRL} />
            <Campo label="Ticket médio" valor={form.ticket_medio} tipo="number" editando={editando} onChange={v => setField('ticket_medio', v === '' ? null : Number(v))} formatador={fmtBRL} />
            <Campo label="ROI" valor={form.roi} tipo="number" editando={editando} onChange={v => setField('roi', v === '' ? null : Number(v))} />
            <Campo label="Meta faturamento" valor={form.meta_faturamento} tipo="number" editando={editando} onChange={v => setField('meta_faturamento', v === '' ? null : Number(v))} formatador={fmtBRL} />
            <Campo label="Meta leads" valor={form.meta_leads} tipo="number" editando={editando} onChange={v => setField('meta_leads', v === '' ? null : Number(v))} />
          </Secao>

          {/* Adoção */}
          <Secao titulo="Adoção do sistema">
            <CampoBool label="CRM ativo" valor={form.crm_ativo} editando={editando} onChange={v => setField('crm_ativo', v)} />
            <CampoBool label="Campanha ativa" valor={form.campanha_ativa} editando={editando} onChange={v => setField('campanha_ativa', v)} />
            <CampoBool label="Adota CRM" valor={form.adocao_crm} editando={editando} onChange={v => setField('adocao_crm', v)} />
            <CampoBool label="Responde leads" valor={form.adocao_responde_leads} editando={editando} onChange={v => setField('adocao_responde_leads', v)} />
            <CampoBool label="Assiste aulas" valor={form.adocao_assiste_aulas} editando={editando} onChange={v => setField('adocao_assiste_aulas', v)} />
            <CampoBool label="Preenche planilha" valor={form.adocao_planilha} editando={editando} onChange={v => setField('adocao_planilha', v)} />
            <CampoBool label="Usa script" valor={form.adocao_script} editando={editando} onChange={v => setField('adocao_script', v)} />
            <CampoBool label="Participa das reuniões" valor={form.adocao_reunioes} editando={editando} onChange={v => setField('adocao_reunioes', v)} />
          </Secao>

          {/* Observações */}
          <div className="col-span-2">
            <Secao titulo="Observações CS">
              <CampoArea label="Notas CS" valor={form.notas_cs} editando={editando} onChange={v => setField('notas_cs', v)} />
              <CampoArea label="Problema detectado" valor={form.problema_detectado} editando={editando} onChange={v => setField('problema_detectado', v)} />
              <CampoArea label="Próxima ação" valor={form.proxima_acao} editando={editando} onChange={v => setField('proxima_acao', v)} />
            </Secao>
          </div>
        </div>
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">{titulo}</div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

type CampoValor = string | number | null | undefined
type CampoProps = {
  label: string
  valor: CampoValor
  editando: boolean
  tipo?: 'text' | 'number' | 'date'
  onChange: (v: string) => void
  formatador?: (v: CampoValor) => string
}

function Campo({ label, valor, editando, tipo = 'text', onChange, formatador }: CampoProps) {
  const display = formatador ? formatador(valor) : (valor ?? '—')
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 text-xs flex-shrink-0 pt-1">{label}</span>
      {editando ? (
        <input
          type={tipo}
          value={valor ?? ''}
          onChange={e => onChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs flex-1 max-w-xs focus:outline-none focus:border-amber-500/50"
        />
      ) : (
        <span className="text-white text-xs text-right break-words">{display}</span>
      )}
    </div>
  )
}

function CampoBool({ label, valor, editando, onChange }: { label: string; valor: boolean | null | undefined; editando: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500 text-xs">{label}</span>
      {editando ? (
        <input type="checkbox" checked={!!valor} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-amber-500" />
      ) : (
        <span className={valor ? 'text-green-400' : 'text-gray-600'}>{valor ? '✓ Sim' : '— Não'}</span>
      )}
    </div>
  )
}

function CampoArea({ label, valor, editando, onChange }: { label: string; valor: string | null | undefined; editando: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      {editando ? (
        <textarea
          value={valor ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/50"
        />
      ) : (
        <div className="text-white text-xs whitespace-pre-wrap">{valor || '—'}</div>
      )}
    </div>
  )
}
