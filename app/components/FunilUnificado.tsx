'use client'

import { useEffect, useState } from 'react'
import { FUNIL_ATIVO, RECEITA_METAS, META_ATIVA, progressoPct, corProgresso } from '../lib/config'

type Real = {
  leads: number
  agendamentos: number
  reunioes: number
  fechamentos: number
  receita: number
}

const fmtR = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function FunilUnificado() {
  const [real, setReal] = useState<Real | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [sdrRes, comRes, finRes] = await Promise.all([
          fetch('/api/sdr/metricas?periodo=mes').then(r => r.json()),
          fetch('/api/comercial/stats').then(r => r.json()),
          fetch('/api/financeiro/resumo').then(r => r.json()),
        ])

        setReal({
          leads: Number(sdrRes?.acumulado_mes?.leads || sdrRes?.acumulado?.leads || 0),
          agendamentos: Number(sdrRes?.acumulado_mes?.agendamentos || sdrRes?.acumulado?.agendamentos || 0),
          reunioes: Number(comRes?.reunioes || 0),
          fechamentos: Number(comRes?.fechamentos || 0),
          receita: Number(finRes?.recebido || comRes?.mrr_gerado || 0),
        })
      } catch { /* */ }
    })()
  }, [])

  if (!real) return <div className="mx-4 md:mx-6 mb-6 bg-gray-900 border border-gray-800 rounded-xl h-56 animate-pulse" />

  const metas = FUNIL_ATIVO.mensal
  const metaReceita = RECEITA_METAS[META_ATIVA]

  type Etapa = { label: string; emoji: string; real: number; meta: number; formatter?: (v: number) => string }
  const etapas: Etapa[] = [
    { label: 'Leads', emoji: '📥', real: real.leads, meta: metas.leads },
    { label: 'Agendamentos', emoji: '📅', real: real.agendamentos, meta: metas.agendamentos },
    { label: 'Reuniões', emoji: '🤝', real: real.reunioes, meta: metas.comparecimentos },
    { label: 'Fechamentos', emoji: '💰', real: real.fechamentos, meta: metas.vendas },
    { label: 'Receita', emoji: '🎯', real: real.receita, meta: metaReceita, formatter: fmtR },
  ]

  return (
    <div className="mx-4 md:mx-6 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
            🎯 Funil do mês — real vs meta {META_ATIVA}
          </span>
          <div className="text-[10px] text-gray-500 mt-0.5">Meta alvo: {fmtR(metaReceita)} · ticket R$ 2.000</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {etapas.map(et => {
          const pct = progressoPct(et.real, et.meta)
          const cor = corProgresso(pct)
          const valorReal = et.formatter ? et.formatter(et.real) : et.real.toString()
          const valorMeta = et.formatter ? et.formatter(et.meta) : et.meta.toString()
          return (
            <div key={et.label} className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <span>{et.emoji}</span>
                <span className="text-[10px] uppercase text-gray-500 font-bold">{et.label}</span>
              </div>
              <div className="text-xl font-bold text-white tabular-nums">{valorReal}</div>
              <div className="text-[10px] text-gray-500">meta: {valorMeta}</div>
              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
              </div>
              <div className="text-[10px] mt-1 font-bold" style={{ color: cor }}>{pct}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
