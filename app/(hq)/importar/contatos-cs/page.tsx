'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { parseCsv } from '../../../lib/csv-parse'
import { supabase } from '../../../lib/supabase'

type ContatoRow = { clinica_nome: string; tipo: string; descricao: string; data: string }
type Clinica = { id: string; nome: string }

const TIPOS = ['whatsapp', 'ligacao', 'reuniao', 'email', 'outro']

export default function ImportarContatosCSPage() {
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<ContatoRow[]>([])
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('clinicas').select('id, nome').eq('ativo', true).then(r => setClinicas(r.data || []))
  }, [])

  const processar = () => {
    const rows = parseCsv(texto)
    if (rows.length === 0) { setMsg('Cole ao menos 1 linha'); return }

    const header = rows[0]
    const hasHeader = header.some(h => /clinica|tipo|descricao|data/i.test(h))
    const dataRows = hasHeader ? rows.slice(1) : rows

    const parsed: ContatoRow[] = dataRows.map(r => ({
      clinica_nome: r[0] || '',
      tipo: TIPOS.includes(r[1]?.toLowerCase()) ? r[1].toLowerCase() : 'whatsapp',
      descricao: r[2] || '',
      data: r[3] || new Date().toISOString().split('T')[0],
    })).filter(c => c.clinica_nome && c.descricao)

    setPreview(parsed)
    setMsg(`${parsed.length} contatos prontos — ${parsed.filter(c => !clinicas.find(cl => cl.nome.toLowerCase().includes(c.clinica_nome.toLowerCase()) || c.clinica_nome.toLowerCase().includes(cl.nome.toLowerCase()))).length} sem match de clínica`)
  }

  const importar = async () => {
    if (preview.length === 0) return
    setSalvando(true); setMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || 'unknown'

    let ok = 0, erros = 0
    for (const c of preview) {
      const clinica = clinicas.find(cl => cl.nome.toLowerCase().includes(c.clinica_nome.toLowerCase()) || c.clinica_nome.toLowerCase().includes(cl.nome.toLowerCase()))
      if (!clinica) { erros++; continue }

      try {
        const r = await fetch('/api/cs/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinica_id: clinica.id,
            clinica_nome: clinica.nome,
            tipo: c.tipo,
            descricao: c.descricao + ' [importado]',
            responsavel: userEmail,
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
        body: JSON.stringify({ user_email: userEmail, tipo: 'contatos_cs', quantidade: ok, payload_resumo: { total: preview.length, ok, erros } }),
      })
    } catch { /* */ }

    setMsg(`✅ ${ok} contatos registrados · ${erros} sem match ou erro`)
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
            <h1 className="text-white text-2xl font-bold mt-1">🎯 Importar contatos CS</h1>
            <p className="text-gray-400 text-sm mt-1">Histórico de interações com clínicas — traz tudo que está no seu WhatsApp e caderneta.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 mb-2">
              <strong className="text-white">Formato:</strong><br />
              <code className="bg-gray-800 px-2 py-1 rounded block mt-2">clinica_nome, tipo, descricao, data</code>
              <div className="text-[10px] text-gray-600 mt-2">
                tipo: <code>whatsapp</code> · <code>ligacao</code> · <code>reuniao</code> · <code>email</code> · <code>outro</code>
              </div>
            </div>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={10}
              placeholder={`Clinica Sorriso, whatsapp, Cliente reclamou do CPL alto esta semana, 2026-04-10\nOdonto Plus, reuniao, Revisão do mês mostrou queda de 20% em leads, 2026-04-09`}
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
