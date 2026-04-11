'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { parseCsv } from '../../../lib/csv-parse'
import { supabase } from '../../../lib/supabase'

type Row = {
  clinica_nome: string
  gestor_nome: string
  plataforma: string
  investimento_mensal: number
  meta_leads: number
  meta_cpl: number
  especialidade: string
}

type Clinica = { id: string; nome: string }
type Gestor = { id: string; nome: string }

export default function ImportarClinicasTrafegoPage() {
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<Row[]>([])
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      const [cl, g] = await Promise.all([
        supabase.from('clinicas').select('id, nome').eq('ativo', true),
        fetch('/api/trafego-clientes/gestores').then(r => r.json()),
      ])
      setClinicas(cl.data || [])
      setGestores(g.gestores || [])
    })()
  }, [])

  const processar = () => {
    const rows = parseCsv(texto)
    if (rows.length === 0) { setMsg('Cole ao menos 1 linha'); return }

    const header = rows[0]
    const hasHeader = header.some(h => /clinica|gestor|plataforma|investimento|meta/i.test(h))
    const dataRows = hasHeader ? rows.slice(1) : rows

    const parsed: Row[] = dataRows.map(r => ({
      clinica_nome: r[0] || '',
      gestor_nome: r[1] || '',
      plataforma: (r[2] || 'meta').toLowerCase(),
      investimento_mensal: Number((r[3] || '0').replace(/[^\d]/g, '')) || 0,
      meta_leads: Number(r[4] || 0) || 0,
      meta_cpl: Number((r[5] || '0').replace(/,/g, '.')) || 0,
      especialidade: (r[6] || 'geral').toLowerCase(),
    })).filter(x => x.clinica_nome)

    setPreview(parsed)
    setMsg(`${parsed.length} vínculos prontos`)
  }

  const importar = async () => {
    if (preview.length === 0) return
    setSalvando(true); setMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || 'unknown'

    let ok = 0, erros = 0
    for (const row of preview) {
      const clinica = clinicas.find(c => c.nome.toLowerCase().includes(row.clinica_nome.toLowerCase()) || row.clinica_nome.toLowerCase().includes(c.nome.toLowerCase()))
      if (!clinica) { erros++; continue }

      let gestorId: string | null = null
      if (row.gestor_nome) {
        const g = gestores.find(g => g.nome.toLowerCase().includes(row.gestor_nome.toLowerCase()))
        gestorId = g?.id || null
      }

      try {
        const r = await fetch('/api/trafego-clientes/vinculo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinica_id: clinica.id,
            gestor_id: gestorId,
            plataforma: row.plataforma,
            investimento_mensal: row.investimento_mensal,
            meta_leads: row.meta_leads,
            meta_cpl: row.meta_cpl,
            especialidade: row.especialidade,
            status: 'ativo',
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
        body: JSON.stringify({ user_email: userEmail, tipo: 'clinicas_trafego', quantidade: ok, payload_resumo: { total: preview.length, ok, erros } }),
      })
    } catch { /* */ }

    setMsg(`✅ ${ok} vínculos criados · ${erros} sem match`)
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
            <h1 className="text-white text-2xl font-bold mt-1">📣 Importar clínicas + gestores de tráfego</h1>
            <p className="text-gray-400 text-sm mt-1">Traz a Jéssica da planilha. Cada linha vincula uma clínica a um gestor com investimento/metas.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 mb-2">
              <strong className="text-white">Formato:</strong><br />
              <code className="bg-gray-800 px-2 py-1 rounded block mt-2">clinica_nome, gestor_nome, plataforma, investimento_mensal, meta_leads, meta_cpl, especialidade</code>
              <div className="text-[10px] text-gray-600 mt-2">
                plataforma: <code>meta</code> · <code>google</code> · <code>tiktok</code> · <code>multi</code><br />
                especialidade: <code>geral</code> · <code>implante</code> · <code>clareamento</code> · <code>ortodontia</code> · <code>emergencia</code>
              </div>
            </div>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={10}
              placeholder={`Clinica Sorriso, Rafael, meta, 2500, 30, 15, implante\nOdonto Plus, Amanda, google, 1800, 25, 18, geral`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={processar} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px]">👁️ Pré-visualizar</button>
              {preview.length > 0 && (
                <button onClick={importar} disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-50">
                  {salvando ? 'Importando...' : `Importar ${preview.length} ⚔️`}
                </button>
              )}
            </div>
            {msg && <div className="mt-3 p-2 rounded bg-gray-800 text-xs text-gray-300">{msg}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
