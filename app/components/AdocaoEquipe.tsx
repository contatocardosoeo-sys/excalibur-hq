'use client'

import { useEffect, useState } from 'react'

interface Colaborador {
  nome: string
  role: string
  emoji: string
  executou_hoje: boolean
  acao_esperada: string
  presenca?: { status: string; sala_atual?: string; ultimo_ping?: string } | null
}

export default function AdocaoEquipe() {
  const [dados, setDados] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => {
      fetch('/api/ceo/adocao-equipe')
        .then(r => r.json())
        .then(d => {
          setDados(d.colaboradores || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
    load()
    const iv = setInterval(load, 30_000) // refresh a cada 30s
    return () => clearInterval(iv)
  }, [])

  const executaram = dados.filter(c => c.executou_hoje).length
  const total = dados.length
  const pct = total > 0 ? Math.round((executaram / total) * 100) : 0

  return (
    <div className="mx-4 md:mx-6 mb-6">
      {/* Header do painel */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Adoção da equipe hoje
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className={`text-lg font-bold ${pct === 100 ? 'text-green-400' : pct >= 66 ? 'text-amber-400' : 'text-red-400'}`}>
          {executaram}/{total}
          <span className="text-xs font-normal text-gray-500 ml-1">executaram</span>
        </div>
      </div>

      {/* Barra de progresso geral */}
      <div className="h-1.5 bg-gray-800 rounded-full mb-4">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            pct === 100 ? 'bg-green-500' : pct >= 66 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Cards dos colaboradores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-800/50 rounded-xl h-20 border border-gray-700/50" />
          ))
        ) : dados.map(c => {
          const online = c.presenca && c.presenca.status === 'online'
          const away = c.presenca && c.presenca.status === 'away'
          return (
            <div
              key={c.role}
              className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${
                c.executou_hoje
                  ? 'bg-green-950/20 border-green-800/40'
                  : 'bg-red-950/20 border-red-800/40'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  c.executou_hoje ? 'bg-green-900/50' : 'bg-red-900/30'
                }`}>
                  {c.emoji}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                  online ? 'bg-green-500' : away ? 'bg-amber-500' : 'bg-gray-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">{c.nome}</span>
                  {c.executou_hoje
                    ? <span className="text-xs text-green-400 font-bold">✅ feito</span>
                    : <span className="text-xs text-red-400 font-bold">⚠ pendente</span>}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {c.executou_hoje
                    ? `Executou hoje${c.presenca?.sala_atual ? ' · ' + c.presenca.sala_atual : ''}`
                    : c.acao_esperada}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Alerta se ninguém executou */}
      {!loading && executaram === 0 && total > 0 && (
        <div className="mt-3 p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <span>🚨</span>
          <span>Nenhum colaborador registrou atividade hoje. Verifique se o onboarding foi concluído.</span>
        </div>
      )}
    </div>
  )
}
