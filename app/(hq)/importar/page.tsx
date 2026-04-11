'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

const OPCOES = [
  { role: 'sdr',          href: '/importar/leads',           emoji: '📞', titulo: 'Leads', sub: 'Cole do WhatsApp, planilha, qualquer lugar' },
  { role: 'closer',       href: '/importar/pipeline',        emoji: '💼', titulo: 'Pipeline comercial', sub: 'Deals abertos e negociações em andamento' },
  { role: 'head_traffic', href: '/importar/clinicas-trafego', emoji: '📣', titulo: 'Clínicas + gestores', sub: 'Os 48 clientes com seus gestores, investimento, metas' },
  { role: 'cs',           href: '/importar/contatos-cs',     emoji: '🎯', titulo: 'Histórico de contatos', sub: 'Últimos contatos e ações com cada clínica' },
]

export default function ImportarHubPage() {
  const [role, setRole] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: interno } = await supabase.from('usuarios_internos').select('role').eq('email', user.email).single()
        setRole(interno?.role || '')
      }
    })()
  }, [])

  const recomendado = OPCOES.find(o => o.role === role)

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/migracao" className="text-xs text-amber-400 hover:text-amber-300">← Migração</Link>
            <h1 className="text-white text-2xl md:text-3xl font-bold mt-1">📥 Importar dados</h1>
            <p className="text-gray-400 text-sm mt-1">Traga pra dentro do HQ tudo que está fora. Sem medo — é onde precisa estar.</p>
          </div>

          {recomendado && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl">
              <div className="text-[10px] uppercase text-amber-400 font-bold mb-1">Recomendado pra você ({role})</div>
              <Link href={recomendado.href} className="flex items-center gap-3 hover:text-amber-300">
                <span className="text-3xl">{recomendado.emoji}</span>
                <div>
                  <div className="text-white font-bold text-base">{recomendado.titulo}</div>
                  <div className="text-xs text-gray-400">{recomendado.sub}</div>
                </div>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OPCOES.map(o => (
              <Link key={o.href} href={o.href} className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-5 transition group">
                <div className="text-3xl mb-2">{o.emoji}</div>
                <div className="text-white font-bold text-base group-hover:text-amber-400">{o.titulo}</div>
                <div className="text-xs text-gray-500 mt-1">{o.sub}</div>
              </Link>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-400">
            <strong className="text-white">Como funciona:</strong> cada importador aceita <code className="bg-gray-800 px-1 rounded">colar CSV, TSV (Excel) ou texto simples</code>. Faz preview, você confirma, e os dados vão pro banco com log de auditoria.
          </div>
        </div>
      </div>
    </div>
  )
}
