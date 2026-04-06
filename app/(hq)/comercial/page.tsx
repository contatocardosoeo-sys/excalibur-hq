'use client'

import Sidebar from '../../components/Sidebar'

const PIPELINE = [
  { etapa: 'Prospect', clientes: ['Clínica Sorriso', 'Odonto Center'], cor: 'border-gray-700' },
  { etapa: 'Demonstração', clientes: ['Dr. Pedro Lima'], cor: 'border-blue-700/50' },
  { etapa: 'Proposta', clientes: ['Clínica VidaBem'], cor: 'border-amber-500/50' },
  { etapa: 'Negociação', clientes: [], cor: 'border-purple-700/50' },
  { etapa: 'Fechado', clientes: ['Clínica Demo'], cor: 'border-green-700/50' },
]

export default function ComercialPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-white text-2xl font-bold mb-1">Pipeline Comercial</h1>
        <p className="text-gray-400 text-sm mb-6">Vendas B2B — clínicas em negociação</p>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {PIPELINE.map(p => (
            <div key={p.etapa} className={`bg-gray-900 border rounded-xl p-4 ${p.cor}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{p.etapa}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-semibold">{p.clientes.length}</span>
              </div>
              <div className="space-y-2">
                {p.clientes.map(c => (
                  <div key={c} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">{c}</p>
                    <p className="text-gray-500 text-xs mt-1">R$497/mês</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">CAC</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">R$350</p>
            <p className="text-gray-600 text-xs mt-1">custo por aquisição</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">LTV</p>
            <p className="text-2xl font-bold text-green-400 mt-1">R$5.964</p>
            <p className="text-gray-600 text-xs mt-1">12 meses × R$497</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">LTV/CAC</p>
            <p className="text-2xl font-bold text-green-400 mt-1">17x</p>
            <p className="text-gray-600 text-xs mt-1">excelente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
