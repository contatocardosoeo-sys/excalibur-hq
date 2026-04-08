'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

const SUPABASE_URL = 'https://hluhlsnodndpskrkbjuw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWhsc25vZG5kcHNrcmtianV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM1MDg3MCwiZXhwIjoyMDkwOTI2ODcwfQ.3gbnB8elQR1f1FOn5hshpF5Vdn4ZEureW3QHQmrws_o'

interface Lead { id: string; phone: string; nome: string | null; etapa: string; etiqueta: string | null; ultimo_contato: string }

const CORES: Record<string, { bg: string; text: string }> = {
  SDR: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  CLOSER: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  PROPOSTA: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  FECHADO: { bg: 'bg-green-500/20', text: 'text-green-400' },
  PERDIDO: { bg: 'bg-red-500/20', text: 'text-red-400' },
  RECEPCAO: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  AGENDAMENTO: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  CONFIRMACAO: { bg: 'bg-green-500/20', text: 'text-green-400' },
}

const ETAPAS = ['RECEPCAO', 'SDR', 'AGENDAMENTO', 'CONFIRMACAO', 'FECHADO', 'PERDIDO']

function tempoRel(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

async function fetchSupa(table: string, params: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  })
  return res.ok ? res.json() : []
}

export default function CRMWhatsAppHQPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [etapaFiltro, setEtapaFiltro] = useState('')
  const [leadAberto, setLeadAberto] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = `select=*&order=ultimo_contato.desc&limit=200${etapaFiltro ? `&etapa=eq.${etapaFiltro}` : ''}`
    const data = await fetchSupa('whatsapp_leads', params)
    setLeads(data)
    setLoading(false)
  }, [etapaFiltro])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { const t = setInterval(carregar, 15000); return () => clearInterval(t) }, [carregar])

  async function enviar(lead: Lead) {
    if (!mensagem.trim() || enviando) return
    setEnviando(true)
    try {
      await fetch('/api/wascript/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id: '21e95ba0-8f06-4062-85f0-1b9da496be52', phone: lead.phone, tipo: 'texto', mensagem }),
      })
      setMensagem('')
      setLeadAberto(null)
    } catch { /* */ }
    setEnviando(false)
  }

  const filtrados = leads.filter(l => !busca || l.phone.includes(busca) || (l.nome || '').toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2"><span className="text-amber-500">💬</span> CRM WhatsApp — Interno</h1>
              <p className="text-gray-400 text-sm mt-1">Pipeline SDR/Closer — {leads.length} leads | Auto-refresh 15s</p>
            </div>
            <button onClick={carregar} className="px-4 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl hover:border-amber-500/50 transition">🔄 Atualizar</button>
          </div>

          {/* Etapas */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setEtapaFiltro('')} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition ${!etapaFiltro ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400'}`}>
              Todos ({leads.length})
            </button>
            {ETAPAS.map(e => {
              const count = leads.filter(l => l.etapa === e).length
              if (count === 0 && e !== 'SDR') return null
              const c = CORES[e] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }
              return (
                <button key={e} onClick={() => setEtapaFiltro(etapaFiltro === e ? '' : e)} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition ${etapaFiltro === e ? 'bg-amber-500 text-gray-950' : `${c.bg} ${c.text}`}`}>
                  {e} ({count})
                </button>
              )
            })}
          </div>

          {/* Busca */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
            <input type="text" placeholder="Buscar nome ou telefone..." value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Lista */}
          {loading ? <div className="text-center text-gray-500 py-12 animate-pulse">Carregando...</div> :
            filtrados.length === 0 ? <div className="text-center py-16"><p className="text-4xl mb-3">📭</p><p className="text-gray-400">Nenhum lead encontrado.</p></div> :
            <div className="space-y-2">
              {filtrados.map(lead => {
                const c = CORES[lead.etapa] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }
                const isOpen = leadAberto === lead.id
                return (
                  <div key={lead.id} className={`bg-gray-900 border ${isOpen ? 'border-amber-500/30' : 'border-gray-800'} rounded-2xl p-4 transition hover:border-gray-700`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm">{lead.nome || 'Sem nome'}</span>
                          <span className="text-gray-500 text-xs">{lead.phone}</span>
                          <Badge className={`${c.bg} ${c.text} border-0 text-[10px]`}>{lead.etapa}</Badge>
                          {lead.etiqueta && <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-lg">{lead.etiqueta}</span>}
                        </div>
                        <p className="text-gray-500 text-[10px] mt-1">{tempoRel(lead.ultimo_contato)}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setLeadAberto(isOpen ? null : lead.id)} className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg hover:border-amber-500/50 transition">💬</button>
                        <button onClick={() => window.open(`https://wa.me/${lead.phone}`, '_blank')} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-lg hover:bg-green-500/20 transition">📱</button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
                        <input type="text" placeholder={`Mensagem para ${lead.nome || lead.phone}...`} value={mensagem}
                          onChange={e => setMensagem(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar(lead)}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                        <button onClick={() => enviar(lead)} disabled={enviando || !mensagem.trim()}
                          className="px-4 py-2 bg-amber-500 text-gray-950 rounded-lg text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition shrink-0">
                          {enviando ? '...' : 'Enviar'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          }
        </div>
      </main>
    </div>
  )
}
