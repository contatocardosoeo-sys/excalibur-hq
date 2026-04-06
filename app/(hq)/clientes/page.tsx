'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'

interface Clinica { id: string; nome: string; responsavel: string | null; email: string; telefone: string | null; plano: string; status: string; created_at: string }

const PLANO_COR: Record<string, string> = {
  starter: 'bg-gray-800 text-gray-400',
  pro: 'bg-amber-500/20 text-amber-400',
  enterprise: 'bg-purple-500/20 text-purple-400',
}

export default function ClientesPage() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('clinicas').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setClinicas(data as Clinica[]); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Clientes (Clínicas)</h1>
            <p className="text-gray-400 text-sm mt-1">{clinicas.length} clínicas cadastradas</p>
          </div>
        </div>

        {loading ? <p className="text-gray-500 text-center py-20">Carregando...</p> : clinicas.length === 0 ? (
          <p className="text-gray-500 text-center py-20">Nenhuma clínica cadastrada</p>
        ) : (
          <div className="space-y-3">
            {clinicas.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 hover:border-amber-600/40 rounded-xl p-5 transition flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-xl">🏥</div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{c.nome}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{c.responsavel || 'Sem responsável'} · {c.email}</p>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${PLANO_COR[c.plano] || PLANO_COR.starter}`}>{c.plano}</span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${c.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
