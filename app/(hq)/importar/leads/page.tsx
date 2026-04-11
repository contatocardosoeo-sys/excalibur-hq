'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { parseCsv } from '../../../lib/csv-parse'
import { supabase } from '../../../lib/supabase'

type LeadRow = { nome: string; whatsapp: string; origem: string; etapa: string; obs?: string }

export default function ImportarLeadsPage() {
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<LeadRow[]>([])
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const processar = () => {
    const rows = parseCsv(texto)
    if (rows.length === 0) { setMsg('Cole ao menos 1 linha'); return }

    // Ignora primeira linha se parecer header
    const header = rows[0]
    const hasHeader = header.some(h => /nome|telefone|whatsapp|lead|origem/i.test(h))
    const dataRows = hasHeader ? rows.slice(1) : rows

    const parsed: LeadRow[] = dataRows.map(r => ({
      nome: r[0] || '',
      whatsapp: (r[1] || '').replace(/\D/g, ''),
      origem: r[2] || 'manual',
      etapa: r[3] || 'Recepcao',
      obs: r[4] || '',
    })).filter(l => l.nome)

    setPreview(parsed)
    setMsg(`${parsed.length} leads prontos pra importar`)
  }

  const importar = async () => {
    if (preview.length === 0) return
    setSalvando(true)
    setMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || 'unknown'

    let ok = 0
    let erros = 0
    for (const lead of preview) {
      try {
        const r = await fetch('/api/sdr/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: lead.nome,
            telefone: lead.whatsapp,
            origem: lead.origem,
            etapa: lead.etapa,
            observacao: lead.obs,
            importado: true,
          }),
        })
        if (r.ok) ok++
        else erros++
      } catch {
        erros++
      }
    }

    // Log de importação
    try {
      await fetch('/api/migracao/importacao-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, tipo: 'leads', quantidade: ok, payload_resumo: { total: preview.length, ok, erros } }),
      })
    } catch { /* */ }

    setMsg(`✅ ${ok} leads importados · ${erros > 0 ? `${erros} erros` : 'sem erros'}`)
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
            <h1 className="text-white text-2xl font-bold mt-1">📞 Importar leads</h1>
            <p className="text-gray-400 text-sm mt-1">Cole qualquer formato: planilha, CSV do WhatsApp, texto simples.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-400 mb-2">
              <strong className="text-white">Formato aceito:</strong> CSV / TSV (Excel) com colunas na ordem:<br />
              <code className="bg-gray-800 px-2 py-1 rounded block mt-2">nome, whatsapp, origem, etapa, observação</code>
              <span className="text-[10px] text-gray-600 mt-2 block">Primeira linha pode ser header ou dado. Aceita ; , ou tab.</span>
            </div>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={10}
              placeholder={`Maria Silva\t11999887766\tInstagram\tRecepcao\tInteressada em implante\nJoão Santos\t11888776655\tGoogle\tQualificacao`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={processar} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px]">
                👁️ Pré-visualizar
              </button>
              {preview.length > 0 && (
                <button onClick={importar} disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-50">
                  {salvando ? 'Importando...' : `Importar ${preview.length} leads ⚔️`}
                </button>
              )}
            </div>
            {msg && <div className="mt-3 p-2 rounded bg-gray-800 text-xs text-gray-300">{msg}</div>}
          </div>

          {preview.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-gray-800 text-xs font-bold text-white">📋 Preview ({preview.length} leads)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/40">
                    <tr className="text-left text-[10px] uppercase text-gray-500">
                      <th className="p-2">Nome</th>
                      <th className="p-2">WhatsApp</th>
                      <th className="p-2">Origem</th>
                      <th className="p-2">Etapa</th>
                      <th className="p-2">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((l, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="p-2 text-white">{l.nome}</td>
                        <td className="p-2 text-gray-400 font-mono text-[10px]">{l.whatsapp}</td>
                        <td className="p-2 text-gray-400">{l.origem}</td>
                        <td className="p-2 text-gray-400">{l.etapa}</td>
                        <td className="p-2 text-gray-500 text-[10px]">{(l.obs || '').slice(0, 40)}</td>
                      </tr>
                    ))}
                    {preview.length > 50 && <tr><td colSpan={5} className="p-2 text-center text-gray-600">...+{preview.length - 50} linhas</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
