'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { parseCsv } from '../../../lib/csv-parse'
import { supabase } from '../../../lib/supabase'

type DealRow = { nome_clinica: string; plano: string; mrr_proposto: number; status: string; data_reuniao?: string; observacoes?: string }

const STATUS_VALIDOS = ['reuniao_agendada', 'proposta_enviada', 'fechado', 'perdido']

export default function ImportarPipelinePage() {
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<DealRow[]>([])
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const processar = () => {
    const rows = parseCsv(texto)
    if (rows.length === 0) { setMsg('Cole ao menos 1 linha'); return }

    const header = rows[0]
    const hasHeader = header.some(h => /nome|clinica|plano|mrr|status/i.test(h))
    const dataRows = hasHeader ? rows.slice(1) : rows

    const parsed: DealRow[] = dataRows.map(r => ({
      nome_clinica: r[0] || '',
      plano: r[1] || 'Completo',
      mrr_proposto: Number((r[2] || '0').replace(/[^\d]/g, '')) || 0,
      status: STATUS_VALIDOS.includes(r[3]) ? r[3] : 'reuniao_agendada',
      data_reuniao: r[4] || undefined,
      observacoes: r[5] || '',
    })).filter(d => d.nome_clinica)

    setPreview(parsed)
    setMsg(`${parsed.length} deals prontos pra importar`)
  }

  const importar = async () => {
    if (preview.length === 0) return
    setSalvando(true); setMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || 'unknown'

    let ok = 0, erros = 0
    for (const deal of preview) {
      try {
        const r = await fetch('/api/comercial/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome_clinica: deal.nome_clinica,
            plano: deal.plano,
            mrr_proposto: deal.mrr_proposto,
            status: deal.status,
            data_reuniao: deal.data_reuniao || null,
            observacoes: (deal.observacoes || '') + ' [importado]',
          }),
        })
        if (r.ok) ok++
        else erros++
      } catch { erros++ }
    }

    try {
      await fetch('/api/migracao/importacao-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, tipo: 'pipeline', quantidade: ok, payload_resumo: { total: preview.length, ok, erros } }),
      })
    } catch { /* */ }

    setMsg(`✅ ${ok} deals importados · ${erros} erros`)
    setPreview([])
    setTexto('')
    setSalvando(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/importar" className="text-xs text-amber-400 hover:text-amber-300">← Importar</Link>
            <h1 className="text-white text-2xl font-bold mt-1">💼 Importar pipeline comercial</h1>
            <p className="text-gray-400 text-sm mt-1">Traga todos os deals abertos que estão na sua cabeça ou planilha.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 mb-2">
              <strong className="text-white">Formato:</strong><br />
              <code className="bg-gray-800 px-2 py-1 rounded block mt-2">nome_clinica, plano, mrr_proposto, status, data_reuniao, observacoes</code>
              <div className="text-[10px] text-gray-600 mt-2">
                status válidos: <code>reuniao_agendada</code> · <code>proposta_enviada</code> · <code>fechado</code> · <code>perdido</code>
              </div>
            </div>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={10}
              placeholder={`Clinica Sorriso, Completo, 3500, reuniao_agendada, 2026-04-15, Dono quer reunião na clinica\nOdonto Plus, Completo, 3000, proposta_enviada, 2026-04-12, Proposta enviada por email`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={processar} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px]">👁️ Pré-visualizar</button>
              {preview.length > 0 && (
                <button onClick={importar} disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-50">
                  {salvando ? 'Importando...' : `Importar ${preview.length} deals ⚔️`}
                </button>
              )}
            </div>
            {msg && <div className="mt-3 p-2 rounded bg-gray-800 text-xs text-gray-300">{msg}</div>}
          </div>

          {preview.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800/40">
                  <tr className="text-left text-[10px] uppercase text-gray-500">
                    <th className="p-2">Clínica</th>
                    <th className="p-2">Plano</th>
                    <th className="p-2 text-right">MRR</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Data reunião</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((d, i) => (
                    <tr key={i} className="border-t border-gray-800">
                      <td className="p-2 text-white">{d.nome_clinica}</td>
                      <td className="p-2 text-gray-400">{d.plano}</td>
                      <td className="p-2 text-right text-amber-400">R$ {d.mrr_proposto.toLocaleString('pt-BR')}</td>
                      <td className="p-2 text-gray-400 text-[10px]">{d.status}</td>
                      <td className="p-2 text-gray-500 font-mono text-[10px]">{d.data_reuniao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
