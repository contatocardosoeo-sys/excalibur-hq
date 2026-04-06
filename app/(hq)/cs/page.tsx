'use client'

import Sidebar from '../../components/Sidebar'

export default function CSPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-white text-2xl font-bold mb-1">Customer Success</h1>
        <p className="text-gray-400 text-sm mb-6">Monitoramento e suporte aos clientes</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Kpi label="Health Score" valor="68%" cor="text-amber-400" />
          <Kpi label="Churn Risk" valor="2" cor="text-red-400" />
          <Kpi label="Tickets Abertos" valor="0" cor="text-green-400" />
          <Kpi label="NPS" valor="72" cor="text-green-400" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
          <h3 className="text-white font-semibold text-sm mb-3">Alertas de Churn</h3>
          <div className="space-y-2">
            <div className="bg-red-500/10 border border-red-700/40 rounded-lg p-4 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Nenhum alerta ativo</p>
                <p className="text-gray-500 text-xs">Todos os clientes com health score saudável</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Playbook CS</h3>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex gap-2"><span className="text-amber-400 font-bold">1.</span> Health Score abaixo de 50% → contato imediato</div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold">2.</span> Sem login há 7 dias → email automático</div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold">3.</span> Sem lead há 14 dias → ligação do CS</div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold">4.</span> D30 sem proposta → reunião de revisão</div>
            <div className="flex gap-2"><span className="text-amber-400 font-bold">5.</span> NPS abaixo de 7 → ação corretiva</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${cor}`}>{valor}</p>
    </div>
  )
}
