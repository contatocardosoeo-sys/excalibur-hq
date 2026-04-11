'use client'

import Sidebar from '../../components/Sidebar'

export default function VisaoGeralPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-auto min-w-0">
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 md:gap-6 text-center px-4">
          <div className="text-7xl">📊</div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Visão Geral</h1>
            <p className="text-gray-400 max-w-md text-sm leading-relaxed">
              Painel consolidado com visão 360° do negócio. Em breve:
              todos os setores em uma única tela — SDR, Comercial,
              CS, Financeiro e Tráfego unificados.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Em desenvolvimento</span>
          </div>
        </div>
      </div>
    </div>
  )
}
