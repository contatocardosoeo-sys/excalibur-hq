'use client'

import { useEffect, useState } from 'react'

type Lead = {
  waseller_id: string
  nome: string | null
  clinica: string | null
  cidade: string | null
  etapa_atual: string | null
  etapa_hq: string
  updated_at: string
  valor_contrato: number | null
  ao_vivo: boolean
  ha_minutos: number
}

const EMOJI: Record<string, string> = {
  lead: '📥',
  contato: '💬',
  qualificado: '✅',
  agendamento: '📅',
  comparecimento: '🤝',
  venda: '💰',
  perdido: '❌',
}

function tempoRelativo(min: number): string {
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function CrmAoVivo() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [aoVivo, setAoVivo] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const carregar = async () => {
      try {
        const r = await fetch('/api/sdr/crm-live', { cache: 'no-store' })
        const j = await r.json()
        if (cancelled) return
        setLeads(j.leads || [])
        setAoVivo(!!j.ao_vivo)
      } catch {
        /* */
      }
      setLoading(false)
    }
    carregar()
    const i = setInterval(carregar, 30_000)
    return () => {
      cancelled = true
      clearInterval(i)
    }
  }, [])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-bold flex items-center gap-2">
          📡 CRM ao vivo (Waseller)
          {aoVivo && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 border border-red-500/40 rounded-full px-2 py-0.5 animate-pulse">
              🔴 AO VIVO
            </span>
          )}
        </h3>
        <span className="text-[10px] text-gray-600">atualiza a cada 30s</span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Carregando...</p>
      ) : leads.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum lead sincronizado ainda. Configure o webhook no Waseller.</p>
      ) : (
        <ul className="space-y-2">
          {leads.map(l => (
            <li
              key={l.waseller_id}
              className="flex items-start justify-between gap-2 bg-gray-950 border border-gray-800 rounded-lg p-2.5"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-base">{EMOJI[l.etapa_hq] || '📋'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">
                    {l.nome || l.waseller_id}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {l.clinica || '—'} {l.cidade ? `· ${l.cidade}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400 capitalize">{l.etapa_hq}</p>
                <p className="text-[9px] text-gray-600">há {tempoRelativo(l.ha_minutos)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
