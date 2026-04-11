'use client'

import { useEffect, useState } from 'react'
import { fmtReais, badgeCpl } from '../../lib/trafego-clientes'

type Relatorio = {
  periodo: { tipo: string; inicio: string; fim: string }
  totais: {
    leads: number
    investimento: number
    cplMedio: number
    agendamentos: number
    comparecimentos: number
    fechamentos: number
    receita: number
    roi: number
  }
  comparativo: {
    cpl: { atual: number; anterior: number; delta: number }
    leads: { atual: number; anterior: number; delta: number }
  }
  melhores: Array<{ nome: string; cpl: number; leads: number; investimento: number }>
  piores: Array<{ nome: string; cpl: number; leads: number; investimento: number }>
  alertasAtivos: number
  otimizacoes: number
}

export default function RelatorioAba() {
  const [periodo, setPeriodo] = useState<'atual' | 'passada' | 'mes'>('atual')
  const [data, setData] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trafego-clientes/relatorio-semanal?periodo=${periodo}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [periodo])

  const gerarTextoWhatsApp = () => {
    if (!data) return ''
    const t = data.totais
    const c = data.comparativo
    const lines = [
      `📊 *Relatório de Tráfego*`,
      `📅 ${data.periodo.inicio} → ${data.periodo.fim}`,
      ``,
      `*Resumo:*`,
      `• Leads: ${t.leads} ${c.leads.delta !== 0 ? `(${c.leads.delta > 0 ? '+' : ''}${c.leads.delta}% vs período anterior)` : ''}`,
      `• Investimento: ${fmtReais(t.investimento)}`,
      `• CPL médio: ${fmtReais(t.cplMedio)} ${c.cpl.delta !== 0 ? `(${c.cpl.delta > 0 ? '+' : ''}${c.cpl.delta}%)` : ''}`,
      `• Agendamentos: ${t.agendamentos}`,
      `• Comparecimentos: ${t.comparecimentos}`,
      `• Fechamentos: ${t.fechamentos}`,
      `• Receita gerada: ${fmtReais(t.receita)}`,
      `• ROI: ${t.roi}%`,
      ``,
      `*Top 3 melhores CPL:*`,
      ...data.melhores.map((m, i) => `${i + 1}. ${m.nome} — ${fmtReais(m.cpl)}`),
      ``,
      `*Top 3 piores CPL:*`,
      ...data.piores.map((m, i) => `${i + 1}. ${m.nome} — ${fmtReais(m.cpl)}`),
      ``,
      `🚨 ${data.alertasAtivos} alertas ativos`,
      `⚙️ ${data.otimizacoes} otimizações registradas`,
    ]
    return lines.join('\n')
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(gerarTextoWhatsApp())
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* */ }
  }

  if (loading) return <div className="text-center py-8 text-gray-500 text-sm">Carregando relatório...</div>
  if (!data) return <div className="text-center py-8 text-gray-500 text-sm">Sem dados</div>

  const cplBadge = badgeCpl(data.totais.cplMedio)

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'atual', label: 'Semana atual' },
          { id: 'passada', label: 'Semana passada' },
          { id: 'mes', label: 'Mês atual' },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id as 'atual' | 'passada' | 'mes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${periodo === p.id ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-500">{data.periodo.inicio} → {data.periodo.fim}</span>
      </div>

      {/* Botões export */}
      <div className="flex flex-wrap gap-2">
        <button onClick={copiar} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/40 rounded-lg px-3 py-2 text-xs font-semibold transition min-h-[36px]">
          {copiado ? '✅ Copiado!' : '💬 Copiar para WhatsApp'}
        </button>
        <button onClick={() => window.print()} className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg px-3 py-2 text-xs font-semibold transition min-h-[36px]">
          🖨 Gerar PDF (imprimir)
        </button>
      </div>

      {/* Card resumo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6">
        <h3 className="text-white font-bold mb-4">📊 Resumo do período</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-800/40 rounded-lg p-3">
            <div className="text-[9px] uppercase text-gray-500">Leads</div>
            <div className="text-white font-bold text-xl mt-1">{data.totais.leads}</div>
            {data.comparativo.leads.delta !== 0 && (
              <div className={`text-[10px] mt-1 ${data.comparativo.leads.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.comparativo.leads.delta > 0 ? '▲' : '▼'} {Math.abs(data.comparativo.leads.delta)}%
              </div>
            )}
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3">
            <div className="text-[9px] uppercase text-gray-500">CPL médio</div>
            <div className="text-amber-400 font-bold text-xl mt-1">{fmtReais(data.totais.cplMedio)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className={`px-1 py-0.5 rounded border text-[9px] font-semibold ${cplBadge.classe}`}>{cplBadge.emoji}</span>
              {data.comparativo.cpl.delta !== 0 && (
                <span className={`text-[10px] ${data.comparativo.cpl.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {data.comparativo.cpl.delta > 0 ? '▲' : '▼'} {Math.abs(data.comparativo.cpl.delta)}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3">
            <div className="text-[9px] uppercase text-gray-500">Investimento</div>
            <div className="text-white font-bold text-base mt-1">{fmtReais(data.totais.investimento)}</div>
          </div>
          <div className="bg-gray-800/40 rounded-lg p-3">
            <div className="text-[9px] uppercase text-gray-500">ROI</div>
            <div className={`font-bold text-xl mt-1 ${data.totais.roi >= 100 ? 'text-green-400' : 'text-red-400'}`}>{data.totais.roi}%</div>
          </div>
        </div>

        {/* Funil */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
            <div className="text-blue-400 font-bold text-lg">{data.totais.agendamentos}</div>
            <div className="text-[10px] text-gray-500">Agendamentos</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
            <div className="text-amber-400 font-bold text-lg">{data.totais.comparecimentos}</div>
            <div className="text-[10px] text-gray-500">Comparecimentos</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
            <div className="text-green-400 font-bold text-lg">{data.totais.fechamentos}</div>
            <div className="text-[10px] text-gray-500">Fechamentos</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2">
            <div className="text-emerald-400 font-bold text-lg">{fmtReais(data.totais.receita)}</div>
            <div className="text-[10px] text-gray-500">Receita</div>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h4 className="text-white font-bold text-sm mb-3">🏆 Top 3 melhores</h4>
          {data.melhores.length === 0 ? <p className="text-[11px] text-gray-500">Sem dados</p> : (
            <div className="space-y-2">
              {data.melhores.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-800/40 rounded">
                  <span className="text-xs text-gray-200 truncate"><span className="text-amber-400 font-bold mr-2">{i + 1}º</span>{m.nome}</span>
                  <span className="text-green-400 font-bold text-xs">{fmtReais(m.cpl)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h4 className="text-white font-bold text-sm mb-3">⚠️ Top 3 piores</h4>
          {data.piores.length === 0 ? <p className="text-[11px] text-gray-500">Sem dados</p> : (
            <div className="space-y-2">
              {data.piores.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-800/40 rounded">
                  <span className="text-xs text-gray-200 truncate"><span className="text-red-400 font-bold mr-2">{i + 1}º</span>{m.nome}</span>
                  <span className="text-red-400 font-bold text-xs">{fmtReais(m.cpl)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
