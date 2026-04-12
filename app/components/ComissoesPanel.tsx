'use client'

import { useEffect, useState } from 'react'

type Comissao = {
  id: string
  colaborador_email: string
  colaborador_nome: string | null
  role: 'closer' | 'sdr'
  tipo: 'venda' | 'agendamento' | 'comparecimento'
  valor: number
  data_evento: string
  lead_nome: string | null
  status: 'pendente' | 'aprovado' | 'pago' | 'cancelado'
}

type BonusEquipe = {
  patamar: number
  fechamentos_mes: number
  total_bonus: number
  distribuicao: { closer: number; sdr: number }
}

type Stats = { total: number; pendente: number; aprovado: number; pago: number; qtd: number }

type ComissoesResp = {
  mes: number
  ano: number
  comissoes: Comissao[]
  closer: Stats
  sdr: Stats
  total: number
  bonus_equipe: BonusEquipe[]
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

type Props = {
  /** visão: closer, sdr, ou admin (tudo) */
  visao?: 'closer' | 'sdr' | 'admin'
  /** quando true, mostra cards completos (comercial/sdr); quando false, versão compacta (ceo/coo) */
  compacto?: boolean
  /** título customizado */
  titulo?: string
}

export default function ComissoesPanel({ visao = 'admin', compacto = false, titulo }: Props) {
  const [data, setData] = useState<ComissoesResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      const qs = new URLSearchParams()
      if (visao === 'closer') qs.set('role', 'closer')
      if (visao === 'sdr') qs.set('role', 'sdr')
      const r = await fetch('/api/comissoes?' + qs.toString())
      const j = await r.json()
      setData(j)
      setLoading(false)
    }
    carregar()
  }, [visao])

  if (loading || !data) {
    return <div className="text-xs text-gray-500">Carregando comissões...</div>
  }

  const stats = visao === 'closer' ? data.closer : visao === 'sdr' ? data.sdr : null
  const historico = data.comissoes
  const vendas = historico.filter(c => c.tipo === 'venda' && c.role === 'closer').length
  const metaPatamar1 = 45
  const metaPatamar2 = 63

  // Modo compacto (CEO/COO card)
  if (compacto) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-[10px] uppercase text-gray-500 font-semibold mb-3">
          {titulo || '💰 Comissões do mês'}
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Guilherme (Closer)</span>
            <span className="text-white font-medium">{fmtBRL(data.closer.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Trindade (SDR)</span>
            <span className="text-white font-medium">{fmtBRL(data.sdr.total)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
            <span className="text-gray-300 font-semibold">Total</span>
            <span className="text-emerald-400 font-bold">{fmtBRL(data.total)}</span>
          </div>
          {data.bonus_equipe.length > 0 && (
            <div className="mt-2 bg-amber-950/20 border border-amber-700/30 rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-amber-400 font-semibold">
                🏆 Bônus equipe: {fmtBRL(data.bonus_equipe.reduce((s, b) => s + Number(b.total_bonus), 0))}
              </p>
            </div>
          )}
          <a
            href="/admin/comissoes"
            className="block text-center text-[11px] text-amber-400 hover:text-amber-300 mt-2"
          >
            ⚙️ Ajustar regras →
          </a>
        </div>
      </div>
    )
  }

  // Modo closer (/comercial) com projeção + bônus
  if (visao === 'closer' && stats) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4">
            <p className="text-[10px] uppercase text-emerald-400 font-semibold">💰 Ganho do mês</p>
            <p className="text-white text-2xl font-bold mt-1">{fmtBRL(stats.total)}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {vendas} vendas · pendente {fmtBRL(stats.pendente)}
            </p>
          </div>
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-[10px] uppercase text-amber-400 font-semibold">📈 Projeção</p>
            <p className="text-white text-2xl font-bold mt-1">
              {fmtBRL(Math.round(stats.total * 3))}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">se manter ritmo até fim do mês</p>
          </div>
          <div
            className={`rounded-2xl p-4 border ${
              vendas >= metaPatamar2
                ? 'bg-amber-950/30 border-amber-500/30'
                : vendas >= metaPatamar1
                  ? 'bg-blue-950/30 border-blue-500/30'
                  : 'bg-gray-900 border-gray-800'
            }`}
          >
            <p className="text-[10px] uppercase text-gray-400 font-semibold">🏆 Bônus equipe</p>
            {vendas >= metaPatamar2 ? (
              <>
                <p className="text-amber-400 text-2xl font-bold mt-1">🚀 R$1.000</p>
                <p className="text-[10px] text-amber-400/70">supermeta atingida</p>
              </>
            ) : vendas >= metaPatamar1 ? (
              <>
                <p className="text-blue-400 text-2xl font-bold mt-1">⭐ R$500</p>
                <p className="text-[10px] text-blue-400/70">meta alvo atingida</p>
              </>
            ) : (
              <>
                <p className="text-gray-300 text-sm mt-1">
                  Faltam <span className="text-white font-bold text-lg">{metaPatamar1 - vendas}</span> vendas
                </p>
                <p className="text-[10px] text-gray-500">pra bônus R$500</p>
                <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min(100, (vendas / metaPatamar1) * 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <Historico historico={historico} />
      </div>
    )
  }

  // Modo SDR (/sdr)
  if (visao === 'sdr' && stats) {
    const agend = historico.filter(c => c.tipo === 'agendamento').length
    const comp = historico.filter(c => c.tipo === 'comparecimento').length
    const vendasSDR = historico.filter(c => c.tipo === 'venda').length
    return (
      <div>
        <div className="bg-gray-900 border border-amber-700/30 rounded-2xl p-4 mb-4">
          <p className="text-xs text-amber-400 font-semibold mb-3">💡 Como suas comissões funcionam</p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-gray-950 rounded-lg p-3">
              <div className="text-xl">📅</div>
              <div className="text-white font-bold">R$8</div>
              <div className="text-gray-500">por agendamento</div>
            </div>
            <div className="bg-gray-950 rounded-lg p-3">
              <div className="text-xl">🤝</div>
              <div className="text-white font-bold">+R$12</div>
              <div className="text-gray-500">se compareceu</div>
              <div className="text-emerald-400 text-[10px]">= R$20 total/reunião</div>
            </div>
            <div className="bg-gray-950 rounded-lg p-3">
              <div className="text-xl">💰</div>
              <div className="text-white font-bold">+R$40</div>
              <div className="text-gray-500">se fechou</div>
              <div className="text-emerald-400 text-[10px]">= R$60 total/conversão</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400">Ganho este mês</p>
            <p className="text-emerald-400 text-2xl font-bold mt-1">{fmtBRL(stats.total)}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {agend}×R$8 + {comp}×R$12 + {vendasSDR}×R$40
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400">Se bater a meta</p>
            <p className="text-amber-400 text-2xl font-bold mt-1">R$7.560</p>
            <p className="text-[10px] text-gray-500 mt-1">315 agend + 210 reuniões + 63 vendas</p>
          </div>
        </div>

        <Historico historico={historico} />
      </div>
    )
  }

  // Admin/financeiro (visão completa)
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-950/20 border border-emerald-700/30 rounded-xl p-4">
          <p className="text-xs text-emerald-400 font-semibold">Guilherme (Closer)</p>
          <p className="text-white text-xl font-bold">{fmtBRL(data.closer.total)}</p>
          <p className="text-[10px] text-gray-500 mt-1">
            pendente {fmtBRL(data.closer.pendente)} · pago {fmtBRL(data.closer.pago)}
          </p>
        </div>
        <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4">
          <p className="text-xs text-amber-400 font-semibold">Trindade (SDR)</p>
          <p className="text-white text-xl font-bold">{fmtBRL(data.sdr.total)}</p>
          <p className="text-[10px] text-gray-500 mt-1">
            pendente {fmtBRL(data.sdr.pendente)} · pago {fmtBRL(data.sdr.pago)}
          </p>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-sm text-gray-400">Total a pagar (pendentes)</span>
        <span className="text-lg font-bold text-white">
          {fmtBRL(data.closer.pendente + data.sdr.pendente)}
        </span>
      </div>
      {data.bonus_equipe.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-700/30 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-amber-400 font-semibold">🏆 Bônus de equipe desbloqueado</p>
          {data.bonus_equipe.map((b, i) => (
            <p key={i} className="text-[11px] text-gray-400 mt-1">
              Patamar {b.patamar}: {fmtBRL(Number(b.total_bonus))} ({b.fechamentos_mes} fechamentos)
            </p>
          ))}
        </div>
      )}
      <Historico historico={historico} />
    </div>
  )
}

function Historico({ historico }: { historico: Comissao[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <p className="text-xs font-semibold text-white">Histórico do mês</p>
        <span className="text-[10px] text-gray-500">{historico.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="text-left text-[10px] uppercase text-gray-500 border-b border-gray-800">
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2 text-right">Valor</th>
              <th className="px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {historico.slice(0, 30).map(c => (
              <tr key={c.id} className="border-b border-gray-800/60">
                <td className="px-4 py-2 text-gray-500">
                  {new Date(c.data_evento).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-2">
                  {c.tipo === 'venda' ? '💰 Venda' : c.tipo === 'comparecimento' ? '🤝 Reunião' : '📅 Agend.'}
                </td>
                <td className="px-4 py-2">{c.lead_nome || '—'}</td>
                <td className="px-4 py-2 text-right font-semibold text-emerald-400">
                  {fmtBRL(Number(c.valor))}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.status === 'pago'
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : c.status === 'aprovado'
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {historico.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Sem lançamentos ainda neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
