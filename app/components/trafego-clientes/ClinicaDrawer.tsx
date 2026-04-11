'use client'

import { useEffect, useState } from 'react'
import { fmtReais, badgeCpl, nivelScore, limparNomeClinica, CPL_POR_ESPECIALIDADE, type Especialidade, avaliarTempoResposta } from '../../lib/trafego-clientes'
import Sparkline from './Sparkline'

interface Props {
  clinicaId: string
  onClose: () => void
}

type Historico = {
  clinica: { id: string; nome: string; fase: string; cs_responsavel: string; mrr: number } | null
  vinculo: {
    plataforma: string
    especialidade: string | null
    investimento_mensal: number
    meta_cpl: number
    meta_leads: number
    status: string
    ultima_otimizacao: string | null
    gestores_trafego: { nome: string; whatsapp: string | null; email: string | null } | null
  } | null
  metricas: Array<{ data: string; leads: number; investimento: number; cpl: number; agendamentos: number; comparecimentos: number; fechamentos: number; receita_gerada: number; tempo_resposta_min: number | null; oferta_rodando: string | null }>
  ultimosLancamentos: Array<{ data: string; leads: number; investimento: number; cpl: number; oferta_rodando: string | null; tempo_resposta_min: number | null }>
  otimizacoes: Array<{ id: string; data: string; acoes: string[]; observacao: string | null }>
  alertas: Array<{ id: string; titulo: string; descricao: string; prioridade: string }>
}

const ACOES_OTIM = [
  'Novo criativo',
  'Ajuste de lance',
  'Nova segmentação',
  'Teste A/B',
  'Ajuste de orçamento',
  'Nova copy',
  'Pausou criativo ruim',
]

export default function ClinicaDrawer({ clinicaId, onClose }: Props) {
  const [data, setData] = useState<Historico | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOtim, setShowOtim] = useState(false)
  const [otimAcoes, setOtimAcoes] = useState<string[]>([])
  const [otimObs, setOtimObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/trafego-clientes/historico?clinica_id=${clinicaId}`).then(r => r.json())
      setData(r)
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [clinicaId])

  const salvarOtim = async () => {
    if (otimAcoes.length === 0) { setMsg('❌ Selecione ao menos 1 ação'); return }
    setSalvando(true)
    setMsg('')
    try {
      const r = await fetch('/api/trafego-clientes/otimizacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id: clinicaId, acoes: otimAcoes, observacao: otimObs }),
      }).then(r => r.json())
      if (r.success) {
        setMsg('✅ Otimização registrada')
        setOtimAcoes([])
        setOtimObs('')
        setShowOtim(false)
        await carregar()
      } else {
        setMsg('❌ ' + (r.error || 'Erro'))
      }
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'Erro'))
    }
    setSalvando(false)
  }

  const cplMes = data?.metricas.length ? Math.round((data.metricas.reduce((s, m) => s + Number(m.investimento || 0), 0) / Math.max(1, data.metricas.reduce((s, m) => s + Number(m.leads || 0), 0))) * 100) / 100 : 0
  const sparkData = (data?.metricas || []).map(m => Number(m.cpl || 0))
  const especialidade = data?.vinculo?.especialidade as Especialidade | undefined
  const espInfo = especialidade ? CPL_POR_ESPECIALIDADE[especialidade] : null
  const cplBadge = badgeCpl(cplMes)

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full md:w-[560px] max-w-full bg-gray-950 border-l border-gray-800 overflow-y-auto">
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-base truncate">{limparNomeClinica(data?.clinica?.nome) || 'Carregando...'}</h2>
            <p className="text-gray-500 text-[10px]">{data?.clinica?.fase || ''} · {data?.vinculo?.gestores_trafego?.nome || 'sem gestor'}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar drawer" title="Fechar" className="min-w-[44px] min-h-[44px] md:w-9 md:h-9 md:min-w-0 md:min-h-0 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white">✕</button>
        </div>

        {loading && <div className="p-6 text-center text-gray-500 text-sm">Carregando...</div>}

        {!loading && data && (
          <div className="p-4 space-y-4">
            {/* Header de status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-[9px] uppercase text-gray-500">CPL do mês</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-amber-400 font-bold text-lg">{fmtReais(cplMes)}</div>
                  <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${cplBadge.classe}`}>{cplBadge.emoji} {cplBadge.label}</span>
                </div>
                <div className="mt-1"><Sparkline data={sparkData} width={120} /></div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-[9px] uppercase text-gray-500">Leads (30d)</div>
                <div className="text-white font-bold text-lg mt-1">{data.metricas.reduce((s, m) => s + Number(m.leads || 0), 0)}</div>
                <div className="text-[10px] text-gray-600">Inv: {fmtReais(data.metricas.reduce((s, m) => s + Number(m.investimento || 0), 0))}</div>
              </div>
            </div>

            {/* Especialidade */}
            {espInfo && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-[9px] uppercase text-gray-500 font-semibold mb-1">Especialidade</div>
                <div className="text-white text-sm">{espInfo.emoji} {espInfo.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">CPL ideal: R$ {espInfo.min}–{espInfo.max}</div>
              </div>
            )}

            {/* Funil */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-[9px] uppercase text-gray-500 font-semibold mb-2">Funil 30 dias</div>
              {(() => {
                const t = data.metricas
                const leads = t.reduce((s, m) => s + Number(m.leads || 0), 0)
                const agend = t.reduce((s, m) => s + Number(m.agendamentos || 0), 0)
                const comp = t.reduce((s, m) => s + Number(m.comparecimentos || 0), 0)
                const fech = t.reduce((s, m) => s + Number(m.fechamentos || 0), 0)
                const rec = t.reduce((s, m) => s + Number(m.receita_gerada || 0), 0)
                const inv = t.reduce((s, m) => s + Number(m.investimento || 0), 0)
                const pa = leads > 0 ? Math.round((agend / leads) * 100) : 0
                const pc = agend > 0 ? Math.round((comp / agend) * 100) : 0
                const pf = comp > 0 ? Math.round((fech / comp) * 100) : 0
                const roi = inv > 0 ? Math.round((rec / inv) * 100) : 0
                return (
                  <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                    <div className="bg-gray-800/40 rounded p-1.5"><div className="text-white font-bold text-sm">{leads}</div><div className="text-gray-600">Leads</div></div>
                    <div className="bg-gray-800/40 rounded p-1.5"><div className="text-blue-400 font-bold text-sm">{agend}</div><div className="text-gray-600">Agend.</div><div className="text-blue-400/60">{pa}%</div></div>
                    <div className="bg-gray-800/40 rounded p-1.5"><div className="text-amber-400 font-bold text-sm">{comp}</div><div className="text-gray-600">Comp.</div><div className="text-amber-400/60">{pc}%</div></div>
                    <div className="bg-gray-800/40 rounded p-1.5"><div className="text-green-400 font-bold text-sm">{fech}</div><div className="text-gray-600">Fech.</div><div className="text-green-400/60">{pf}%</div></div>
                    <div className="bg-gray-800/40 rounded p-1.5"><div className={`font-bold text-sm ${roi >= 100 ? 'text-green-400' : 'text-red-400'}`}>{roi}%</div><div className="text-gray-600">ROI</div></div>
                  </div>
                )
              })()}
            </div>

            {/* Alertas */}
            {data.alertas.length > 0 && (
              <div>
                <div className="text-[10px] uppercase text-gray-500 font-semibold mb-2">🚨 Alertas abertos</div>
                <div className="space-y-1.5">
                  {data.alertas.map(a => (
                    <div key={a.id} className={`p-2 rounded-lg border text-xs ${a.prioridade === 'critica' ? 'bg-red-500/10 border-red-500/40' : a.prioridade === 'alta' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-gray-800/40 border-gray-700'}`}>
                      <div className="font-bold text-white">{a.titulo}</div>
                      <div className="text-gray-400 text-[10px]">{a.descricao}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimos lançamentos */}
            <div>
              <div className="text-[10px] uppercase text-gray-500 font-semibold mb-2">📋 Últimos 7 lançamentos</div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-800/40">
                    <tr className="text-left text-gray-500 uppercase">
                      <th className="p-2">Data</th>
                      <th className="p-2 text-right">Leads</th>
                      <th className="p-2 text-right">Inv</th>
                      <th className="p-2 text-right">CPL</th>
                      <th className="p-2">Resp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ultimosLancamentos.length === 0 && (
                      <tr><td colSpan={5} className="p-3 text-center text-gray-600">Sem lançamentos</td></tr>
                    )}
                    {data.ultimosLancamentos.map((m, i) => {
                      const tr = avaliarTempoResposta(m.tempo_resposta_min)
                      return (
                        <tr key={i} className="border-t border-gray-800">
                          <td className="p-2 text-gray-400">{m.data.slice(5)}</td>
                          <td className="p-2 text-right text-white">{m.leads}</td>
                          <td className="p-2 text-right text-gray-400">{fmtReais(Number(m.investimento || 0))}</td>
                          <td className="p-2 text-right text-amber-400">{fmtReais(Number(m.cpl || 0))}</td>
                          <td className={`p-2 ${tr.cor}`}>{m.tempo_resposta_min ? `${m.tempo_resposta_min}min` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Otimizações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">⚙️ Otimizações</div>
                <button onClick={() => setShowOtim(!showOtim)} className="text-[10px] text-amber-400 hover:text-amber-300">+ Registrar</button>
              </div>

              {showOtim && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3 mb-3">
                  <div className="text-[10px] text-gray-400 mb-2">O que foi feito:</div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {ACOES_OTIM.map(a => (
                      <button
                        key={a}
                        onClick={() => setOtimAcoes(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${otimAcoes.includes(a) ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={otimObs}
                    onChange={e => setOtimObs(e.target.value)}
                    placeholder="Observação (opcional)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-white"
                    rows={2}
                  />
                  {msg && <div className="mt-2 text-[10px] text-gray-400">{msg}</div>}
                  <button onClick={salvarOtim} disabled={salvando} className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-50">
                    {salvando ? 'Salvando...' : 'Salvar otimização'}
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                {data.otimizacoes.length === 0 && <div className="text-[11px] text-gray-600 italic">Nenhuma otimização registrada ainda</div>}
                {data.otimizacoes.map(o => (
                  <div key={o.id} className="bg-gray-900 border border-gray-800 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-gray-500">{o.data}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(o.acoes || []).map((a, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px]">{a}</span>
                      ))}
                    </div>
                    {o.observacao && <div className="text-[10px] text-gray-400 mt-1">{o.observacao}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Gestor */}
            {data.vinculo?.gestores_trafego && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-[9px] uppercase text-gray-500 font-semibold mb-1">Gestor responsável</div>
                <div className="text-white text-sm">{data.vinculo.gestores_trafego.nome}</div>
                <div className="text-[10px] text-gray-500">{data.vinculo.gestores_trafego.email || '—'}</div>
                {data.vinculo.gestores_trafego.whatsapp && (
                  <a
                    href={`https://wa.me/55${data.vinculo.gestores_trafego.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    className="mt-2 inline-block px-3 py-1.5 rounded bg-green-500/20 text-green-400 text-[10px] font-semibold border border-green-500/40 hover:bg-green-500/30"
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
