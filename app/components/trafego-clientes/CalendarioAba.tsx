'use client'

import { useState } from 'react'
import { limparNomeClinica } from '../../lib/trafego-clientes'

interface ClinicaCalendario {
  id: string
  nome: string
  nome_limpo: string
  ultima_otimizacao: string | null
  ciclo_criativo_dias: number
  status_trafego: string
  gestor_nome: string | null
}

interface Props {
  clinicas: ClinicaCalendario[]
  onRegistrar: (clinicaId: string) => void
  onRefresh: () => void
}

const ACOES_OTIM = [
  'Novo criativo',
  'Ajuste de lance',
  'Nova segmentação',
  'Teste A/B',
  'Ajuste de orçamento',
]

export default function CalendarioAba({ clinicas, onRefresh }: Props) {
  const [clinicaForm, setClinicaForm] = useState('')
  const [acoesForm, setAcoesForm] = useState<string[]>([])
  const [obsForm, setObsForm] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const hoje = new Date()

  const calcular = (c: ClinicaCalendario) => {
    if (!c.ultima_otimizacao) return { dias: null, status: 'nunca', proxima: null, label: 'Nunca otimizado' }
    const ult = new Date(c.ultima_otimizacao)
    const dias = Math.floor((hoje.getTime() - ult.getTime()) / 86400000)
    const proxima = new Date(ult)
    proxima.setDate(proxima.getDate() + (c.ciclo_criativo_dias || 14))
    const diasParaProxima = Math.floor((proxima.getTime() - hoje.getTime()) / 86400000)

    let status = 'em_dia'
    let label = '✅ Em dia'
    if (diasParaProxima < 0) { status = 'atrasado'; label = '🔴 Atrasado' }
    else if (diasParaProxima <= 3) { status = 'proximo'; label = '⚠️ Vence em ' + diasParaProxima + 'd' }

    return { dias, status, proxima: proxima.toISOString().split('T')[0], label }
  }

  const ordenadas = [...clinicas]
    .filter(c => c.status_trafego !== 'sem_gestor')
    .sort((a, b) => {
      const ca = calcular(a)
      const cb = calcular(b)
      const order: Record<string, number> = { atrasado: 0, proximo: 1, em_dia: 2, nunca: -1 }
      return (order[ca.status] ?? 99) - (order[cb.status] ?? 99)
    })

  const salvarOtim = async () => {
    if (!clinicaForm) { setMsg('❌ Selecione uma clínica'); return }
    if (acoesForm.length === 0) { setMsg('❌ Selecione ao menos 1 ação'); return }
    setSalvando(true); setMsg('')
    try {
      const r = await fetch('/api/trafego-clientes/otimizacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id: clinicaForm, acoes: acoesForm, observacao: obsForm }),
      }).then(r => r.json())
      if (r.success) {
        setMsg('✅ Otimização registrada')
        setClinicaForm(''); setAcoesForm([]); setObsForm('')
        onRefresh()
      } else setMsg('❌ ' + (r.error || 'erro'))
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setSalvando(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Form rápido */}
      <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 h-fit">
        <h3 className="text-white font-bold text-sm mb-3">⚙️ Registrar otimização</h3>

        <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Clínica</label>
        <select value={clinicaForm} onChange={e => setClinicaForm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white mb-3">
          <option value="">Selecione...</option>
          {clinicas.filter(c => c.status_trafego !== 'sem_gestor').map(c => (
            <option key={c.id} value={c.id}>{limparNomeClinica(c.nome)}</option>
          ))}
        </select>

        <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">O que foi feito</label>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ACOES_OTIM.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setAcoesForm(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
              className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${acoesForm.includes(a) ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700'}`}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">Observação</label>
        <textarea value={obsForm} onChange={e => setObsForm(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white mb-3" />

        {msg && <div className="text-[10px] text-gray-400 mb-2">{msg}</div>}

        <button onClick={salvarOtim} disabled={salvando} className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar otimização'}
        </button>
      </div>

      {/* Lista calendário */}
      <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-white font-bold text-sm">📅 Status de otimizações</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Ordenadas por urgência</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-800/40">
              <tr className="text-left text-[10px] uppercase text-gray-500">
                <th className="p-3">Clínica</th>
                <th className="p-3">Última otim.</th>
                <th className="p-3">Próxima</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map(c => {
                const calc = calcular(c)
                return (
                  <tr key={c.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="p-3 text-white font-medium">{limparNomeClinica(c.nome)}</td>
                    <td className="p-3 text-gray-400">{c.ultima_otimizacao || '—'} {calc.dias != null && <span className="text-[10px] text-gray-600">({calc.dias}d)</span>}</td>
                    <td className="p-3 text-gray-400">{calc.proxima || '—'}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-semibold ${calc.status === 'atrasado' ? 'text-red-400' : calc.status === 'proximo' ? 'text-amber-400' : calc.status === 'nunca' ? 'text-gray-500' : 'text-green-400'}`}>{calc.label}</span>
                    </td>
                  </tr>
                )
              })}
              {ordenadas.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhuma clínica com gestor</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
