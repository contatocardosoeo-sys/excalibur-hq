'use client'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

interface Workflow {
  id: string
  nome: string
  descricao: string
  trigger: string
  status: 'ativo' | 'inativo' | 'erro'
  ultimaExecucao: string | null
  execucoesHoje: number
  categoria: 'leads' | 'agendamentos' | 'financeiro' | 'pos-venda'
}

interface ExecucaoLog {
  id: string
  workflow: string
  status: 'sucesso' | 'erro' | 'pulado'
  timestamp: string
  detalhes: string
}

const WORKFLOWS: Workflow[] = [
  {
    id: '1',
    nome: 'Alerta Lead Sem Resposta (24h)',
    descricao: 'Verifica leads sem contato há 24h e cria alerta urgente',
    trigger: 'Schedule (a cada 1h)',
    status: 'ativo',
    ultimaExecucao: new Date(Date.now() - 1800000).toISOString(),
    execucoesHoje: 12,
    categoria: 'leads',
  },
  {
    id: '2',
    nome: 'Confirmação Agendamento D-1',
    descricao: 'Envia lembrete de confirmação para agendamentos do dia seguinte',
    trigger: 'Schedule (todo dia 9h)',
    status: 'ativo',
    ultimaExecucao: new Date(Date.now() - 43200000).toISOString(),
    execucoesHoje: 1,
    categoria: 'agendamentos',
  },
  {
    id: '3',
    nome: 'Follow-up Lead D+1',
    descricao: 'Identifica leads recebidos ontem sem contato e dispara follow-up',
    trigger: 'Schedule (todo dia 10h)',
    status: 'ativo',
    ultimaExecucao: new Date(Date.now() - 39600000).toISOString(),
    execucoesHoje: 1,
    categoria: 'leads',
  },
  {
    id: '4',
    nome: 'Proposta Expirada (7 dias)',
    descricao: 'Marca propostas pendentes há +7 dias como expiradas',
    trigger: 'Schedule (todo dia 8h)',
    status: 'ativo',
    ultimaExecucao: new Date(Date.now() - 46800000).toISOString(),
    execucoesHoje: 1,
    categoria: 'financeiro',
  },
  {
    id: '5',
    nome: 'Jornada Pós-Venda D0-D90',
    descricao: 'Dispara lembretes de retorno na jornada pós-venda',
    trigger: 'Webhook (evento lead-fechou)',
    status: 'ativo',
    ultimaExecucao: new Date(Date.now() - 86400000).toISOString(),
    execucoesHoje: 0,
    categoria: 'pos-venda',
  },
  {
    id: '6',
    nome: 'Régua Cobrança Asaas',
    descricao: 'Processa eventos de pagamento do Asaas e cria alertas',
    trigger: 'Webhook (Asaas events)',
    status: 'inativo',
    ultimaExecucao: null,
    execucoesHoje: 0,
    categoria: 'financeiro',
  },
]

const EXECUCOES: ExecucaoLog[] = [
  { id: '1', workflow: 'Alerta Lead Sem Resposta (24h)', status: 'sucesso', timestamp: new Date(Date.now() - 1800000).toISOString(), detalhes: '3 leads alertados' },
  { id: '2', workflow: 'Confirmação Agendamento D-1', status: 'sucesso', timestamp: new Date(Date.now() - 43200000).toISOString(), detalhes: '8 confirmações enviadas' },
  { id: '3', workflow: 'Follow-up Lead D+1', status: 'sucesso', timestamp: new Date(Date.now() - 39600000).toISOString(), detalhes: '5 follow-ups disparados' },
  { id: '4', workflow: 'Proposta Expirada (7 dias)', status: 'pulado', timestamp: new Date(Date.now() - 46800000).toISOString(), detalhes: 'Nenhuma proposta expirada' },
  { id: '5', workflow: 'Alerta Lead Sem Resposta (24h)', status: 'sucesso', timestamp: new Date(Date.now() - 5400000).toISOString(), detalhes: '1 lead alertado' },
  { id: '6', workflow: 'Alerta Lead Sem Resposta (24h)', status: 'erro', timestamp: new Date(Date.now() - 9000000).toISOString(), detalhes: 'Timeout na query Supabase' },
  { id: '7', workflow: 'Jornada Pós-Venda D0-D90', status: 'sucesso', timestamp: new Date(Date.now() - 86400000).toISOString(), detalhes: 'D7 lembrete para Maria S.' },
  { id: '8', workflow: 'Confirmação Agendamento D-1', status: 'sucesso', timestamp: new Date(Date.now() - 129600000).toISOString(), detalhes: '6 confirmações enviadas' },
]

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ativo: { label: 'Ativo', bg: 'bg-green-500/20', text: 'text-green-400' },
  inativo: { label: 'Inativo', bg: 'bg-gray-500/20', text: 'text-gray-400' },
  erro: { label: 'Erro', bg: 'bg-red-500/20', text: 'text-red-400' },
}

const EXEC_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  sucesso: { label: 'OK', bg: 'bg-green-500/20', text: 'text-green-400' },
  erro: { label: 'Erro', bg: 'bg-red-500/20', text: 'text-red-400' },
  pulado: { label: 'Skip', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
}

const CAT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  leads: { icon: '👥', label: 'Leads', color: 'text-blue-400' },
  agendamentos: { icon: '📅', label: 'Agenda', color: 'text-purple-400' },
  financeiro: { icon: '💰', label: 'Financeiro', color: 'text-amber-400' },
  'pos-venda': { icon: '🎯', label: 'Pós-Venda', color: 'text-green-400' },
}

function tempoRelativo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  const dias = Math.floor(hrs / 24)
  return `${dias}d atrás`
}

export default function AutomacoesPage() {
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')

  const workflowsFiltrados = filtroCategoria === 'todas'
    ? WORKFLOWS
    : WORKFLOWS.filter(w => w.categoria === filtroCategoria)

  const totalAtivos = WORKFLOWS.filter(w => w.status === 'ativo').length
  const totalExecucoesHoje = WORKFLOWS.reduce((s, w) => s + w.execucoesHoje, 0)
  const totalErros = EXECUCOES.filter(e => e.status === 'erro').length
  const taxaSucesso = EXECUCOES.length > 0
    ? Math.round((EXECUCOES.filter(e => e.status === 'sucesso').length / EXECUCOES.length) * 100)
    : 0

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-amber-500">⚡</span> Automações N8N
              </h1>
              <p className="text-gray-400 text-sm mt-1">Workflows automatizados conectados ao Excalibur</p>
            </div>
            <a
              href="https://cardosoeo.app.n8n.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-500 text-gray-950 rounded-xl text-sm font-semibold hover:bg-amber-400 transition flex items-center gap-2"
            >
              Abrir N8N <span>↗</span>
            </a>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Workflows Ativos', valor: `${totalAtivos}/${WORKFLOWS.length}`, icon: '⚡', cor: 'text-amber-400' },
              { label: 'Execuções Hoje', valor: totalExecucoesHoje.toString(), icon: '🔄', cor: 'text-blue-400' },
              { label: 'Taxa Sucesso', valor: `${taxaSucesso}%`, icon: '✅', cor: 'text-green-400' },
              { label: 'Erros', valor: totalErros.toString(), icon: '⚠️', cor: totalErros > 0 ? 'text-red-400' : 'text-green-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{kpi.label}</span>
                  <span className="text-lg">{kpi.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.cor}`}>{kpi.valor}</p>
              </div>
            ))}
          </div>

          {/* Filtros por categoria */}
          <div className="flex gap-2">
            {[
              { key: 'todas', label: 'Todas', icon: '📋' },
              ...Object.entries(CAT_CONFIG).map(([key, c]) => ({ key, label: c.label, icon: c.icon })),
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltroCategoria(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtroCategoria === f.key
                    ? 'bg-amber-500 text-gray-950'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Workflows Grid */}
          <div className="grid grid-cols-2 gap-4">
            {workflowsFiltrados.map((w) => {
              const cat = CAT_CONFIG[w.categoria]
              const st = STATUS_CONFIG[w.status]
              return (
                <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <h3 className="text-white font-semibold text-sm">{w.nome}</h3>
                        <p className="text-gray-500 text-xs">{w.descricao}</p>
                      </div>
                    </div>
                    <Badge className={`${st.bg} ${st.text} border-0 text-[10px]`}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-gray-500">
                      <span>🕐 {w.trigger}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{w.execucoesHoje} exec hoje</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400">{tempoRelativo(w.ultimaExecucao)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Log de Execuções */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="text-amber-500">📜</span> Log de Execuções
              </h2>
            </div>
            <div className="divide-y divide-gray-800">
              {EXECUCOES.map((exec) => {
                const st = EXEC_STATUS[exec.status]
                return (
                  <div key={exec.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/50 transition">
                    <div className="flex items-center gap-3">
                      <Badge className={`${st.bg} ${st.text} border-0 text-[10px] min-w-[40px] justify-center`}>{st.label}</Badge>
                      <div>
                        <p className="text-white text-sm">{exec.workflow}</p>
                        <p className="text-gray-500 text-xs">{exec.detalhes}</p>
                      </div>
                    </div>
                    <span className="text-gray-500 text-xs">{tempoRelativo(exec.timestamp)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Webhooks Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-amber-500">🔗</span> Webhooks Configurados
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { tabela: 'leads', evento: 'INSERT', destino: '/api/webhooks/supabase', descricao: 'Novo lead → N8N boas-vindas' },
                { tabela: 'leads', evento: 'UPDATE', destino: '/api/webhooks/supabase', descricao: 'Lead fechou → N8N pós-venda' },
                { tabela: 'agendamentos', evento: 'UPDATE', destino: '/api/webhooks/supabase', descricao: 'Status mudou → N8N notificação' },
              ].map((wh, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">{wh.evento}</Badge>
                    <span className="text-white text-sm font-mono">{wh.tabela}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{wh.descricao}</p>
                  <p className="text-gray-600 text-[10px] mt-1 font-mono">{wh.destino}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
