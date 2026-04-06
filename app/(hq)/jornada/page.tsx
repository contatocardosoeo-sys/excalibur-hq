'use client'

import Sidebar from '../../components/Sidebar'

const ETAPAS_JORNADA = [
  { etapa: 'D0 — Ativação', desc: 'Conta criada, primeiro login', cor: 'border-blue-500/50 bg-blue-500/5' },
  { etapa: 'D1 — Setup', desc: 'Configurar clínica, importar pacientes', cor: 'border-blue-500/50 bg-blue-500/5' },
  { etapa: 'D3 — Primeiro Lead', desc: 'Lead cadastrado no CRM', cor: 'border-amber-500/50 bg-amber-500/5' },
  { etapa: 'D7 — Engajamento', desc: 'Usando CRM + Agenda ativamente', cor: 'border-amber-500/50 bg-amber-500/5' },
  { etapa: 'D14 — Extensão', desc: 'Extensão Chrome instalada e ativa', cor: 'border-purple-500/50 bg-purple-500/5' },
  { etapa: 'D30 — Retenção', desc: 'Proposta criada, receita gerada', cor: 'border-green-500/50 bg-green-500/5' },
  { etapa: 'D60 — Expansão', desc: 'Convidou segundo atendente', cor: 'border-green-500/50 bg-green-500/5' },
  { etapa: 'D90 — Advocacia', desc: 'Indicou outra clínica', cor: 'border-green-500/50 bg-green-500/5' },
]

export default function JornadaPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-white text-2xl font-bold mb-1">Jornada do Cliente</h1>
        <p className="text-gray-400 text-sm mb-6">Onboarding D0 → D90 de cada clínica</p>

        <div className="space-y-3">
          {ETAPAS_JORNADA.map((e, i) => (
            <div key={e.etapa} className={`border rounded-xl p-5 flex items-center gap-4 ${e.cor}`}>
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">{i + 1}</div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{e.etapa}</p>
                <p className="text-gray-400 text-xs mt-0.5">{e.desc}</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-gray-800 text-gray-500 font-medium">Template</span>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400 text-sm">Jornada personalizada por clínica em breve</p>
          <p className="text-gray-600 text-xs mt-1">Cada clínica terá seu progresso D0-D90 rastreado aqui</p>
        </div>
      </div>
    </div>
  )
}
