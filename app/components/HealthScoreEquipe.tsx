'use client'

import { useEffect, useState } from 'react'

type Fator = { label: string; valor: string; peso: number; score: number; ok: boolean }
type Colab = {
  email: string
  nome: string
  role: string
  score: number
  nivel: 'critico' | 'atencao' | 'bom' | 'excelente'
  fatores: Fator[]
  recomendacoes: string[]
  executou_hoje: boolean
  dias_ativo_7d: number
}

type Resumo = {
  total: number
  score_medio: number
  excelentes: number
  bons: number
  atencao: number
  criticos: number
}

const ROLE_EMOJI: Record<string, string> = {
  admin: '👑',
  coo: '🧠',
  cs: '🎯',
  sdr: '📞',
  closer: '💼',
  head_traffic: '📣',
  editor_video: '🎬',
  designer: '🎨',
  cmo: '📊',
  financeiro: '💰',
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'CEO',
  coo: 'COO',
  cs: 'CS',
  sdr: 'SDR',
  closer: 'Closer',
  head_traffic: 'Head Traffic',
  editor_video: 'Editor Vídeo',
  designer: 'Designer',
}

const NIVEL_COR: Record<string, { bg: string; text: string; border: string; emoji: string; label: string }> = {
  excelente: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', emoji: '🟢', label: 'Excelente' },
  bom:       { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/40',    emoji: '🔵', label: 'Bom' },
  atencao:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/40',   emoji: '🟡', label: 'Atenção' },
  critico:   { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/40',     emoji: '🔴', label: 'Crítico' },
}

export default function HealthScoreEquipe() {
  const [colabs, setColabs] = useState<Colab[]>([])
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/colaboradores/health').then(r => r.json())
        setColabs(r.colaboradores || [])
        setResumo(r.resumo || null)
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="bg-gray-900 border border-gray-800 rounded-xl h-40 animate-pulse mb-6" />

  const corScore = (s: number) => s >= 85 ? '#22c55e' : s >= 65 ? '#60a5fa' : s >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div className="mb-6">
      {/* Resumo geral */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Score médio</div>
            <div className="text-3xl font-bold mt-1" style={{ color: corScore(resumo.score_medio) }}>{resumo.score_medio}</div>
            <div className="text-[10px] text-gray-600 mt-1">equipe toda</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-[10px] uppercase text-gray-500 font-bold">🟢 Excelentes</div>
            <div className="text-3xl font-bold text-emerald-400 mt-1">{resumo.excelentes}</div>
            <div className="text-[10px] text-gray-600 mt-1">score ≥ 85</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-[10px] uppercase text-gray-500 font-bold">🔵 Bons</div>
            <div className="text-3xl font-bold text-blue-400 mt-1">{resumo.bons}</div>
            <div className="text-[10px] text-gray-600 mt-1">65-84</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-[10px] uppercase text-gray-500 font-bold">🟡 Atenção</div>
            <div className="text-3xl font-bold text-amber-400 mt-1">{resumo.atencao}</div>
            <div className="text-[10px] text-gray-600 mt-1">40-64</div>
          </div>
          <div className={`bg-gray-900 border rounded-xl p-4 ${resumo.criticos > 0 ? 'border-red-800/60' : 'border-gray-800'}`}>
            <div className="text-[10px] uppercase text-gray-500 font-bold">🔴 Críticos</div>
            <div className={`text-3xl font-bold mt-1 ${resumo.criticos > 0 ? 'text-red-400' : 'text-gray-500'}`}>{resumo.criticos}</div>
            <div className="text-[10px] text-gray-600 mt-1">&lt; 40 · 1:1 hoje</div>
          </div>
        </div>
      )}

      {/* Cards por colaborador */}
      <div className="mb-2 text-xs text-gray-400 font-bold uppercase tracking-wider">🏥 Health score por colaborador</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {colabs.map(c => {
          const isOpen = expandido === c.email
          const nivelStyle = NIVEL_COR[c.nivel]
          return (
            <div key={c.email} className={`bg-gray-900 border rounded-xl p-4 transition-all ${nivelStyle.border}`}>
              <button onClick={() => setExpandido(isOpen ? null : c.email)} className="w-full text-left">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{ROLE_EMOJI[c.role] || '👤'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm">{c.nome}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {ROLE_LABEL[c.role] || c.role}
                      {c.executou_hoje && <span className="ml-2 text-green-400">✓ ativo hoje</span>}
                      {!c.executou_hoje && <span className="ml-2 text-gray-600">— inativo hoje</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold tabular-nums" style={{ color: corScore(c.score) }}>{c.score}</div>
                    <div className={`text-[9px] uppercase font-bold ${nivelStyle.text}`}>{nivelStyle.emoji} {nivelStyle.label}</div>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${Math.min(c.score, 100)}%`, background: corScore(c.score) }} />
                </div>

                <div className="mt-2 text-[10px] text-gray-500 text-center">
                  {isOpen ? '▲ esconder detalhes' : '▼ ver fatores do score'}
                </div>
              </button>

              {/* Expandido: fatores + recomendações */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                  {c.fatores.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={f.ok ? 'text-green-400' : 'text-gray-500'}>{f.ok ? '✓' : '○'}</span>
                        <span className="text-gray-300 truncate">{f.label}</span>
                      </div>
                      <span className="text-gray-400 tabular-nums shrink-0">{f.valor}</span>
                      <span className={`text-[10px] tabular-nums shrink-0 w-12 text-right ${f.ok ? 'text-green-400' : 'text-gray-600'}`}>{f.score}/{f.peso}pts</span>
                    </div>
                  ))}

                  {c.recomendacoes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-[10px] uppercase text-amber-400 font-bold mb-1">Recomendações</div>
                      {c.recomendacoes.map((r, i) => (
                        <div key={i} className="text-[11px] text-gray-400 mb-0.5">→ {r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {colabs.length === 0 && <div className="col-span-2 text-center text-gray-500 text-sm py-8">Nenhum colaborador encontrado</div>}
      </div>
    </div>
  )
}
