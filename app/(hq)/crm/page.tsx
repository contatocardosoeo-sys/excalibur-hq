'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

type LogEntry = { id: string; evento: string; numero: string; nome: string; etiqueta: string; usuario_wa: string; acao_executada: string; processado: boolean; created_at: string }

export default function CRMPage() {
  const [tab, setTab] = useState<'log' | 'sdr' | 'closer'>('log')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [leadsWA, setLeadsWA] = useState<Array<Record<string, unknown>>>([])
  const [closerWA, setCloserWA] = useState<Array<Record<string, unknown>>>([])
  const [kpis, setKpis] = useState({ webhooksHoje: 0, leadsAtualizados: 0, etapasMovidas: 0, usersAtivos: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const hoje = new Date().toISOString().split('T')[0]

    const [{ data: logData }, { data: sdrData }, { data: closerData }] = await Promise.all([
      supabase.from('prospecta_webhooks_log').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('leads_sdr').select('id, nome, status, etiqueta_wa, ultimo_contato_wa, total_disparos_wa, usuario_wa, telefone').gt('total_disparos_wa', 0).order('ultimo_contato_wa', { ascending: false }),
      supabase.from('pipeline_closer').select('id, nome_clinica, status, etiqueta_wa, ultimo_contato_wa, total_disparos_wa, usuario_wa').gt('total_disparos_wa', 0).order('ultimo_contato_wa', { ascending: false }),
    ])

    const all = logData || []
    setLogs(all as LogEntry[])
    setLeadsWA(sdrData || [])
    setCloserWA(closerData || [])

    const hojeItems = all.filter(l => l.created_at?.startsWith(hoje))
    const usuarios = new Set(hojeItems.map(l => l.usuario_wa).filter(Boolean))
    setKpis({
      webhooksHoje: hojeItems.length,
      leadsAtualizados: hojeItems.filter(l => l.processado).length,
      etapasMovidas: hojeItems.filter(l => l.acao_executada?.includes('etapa')).length,
      usersAtivos: usuarios.size,
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function tempo(d: string) {
    if (!d) return '-'
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  const tabBtn = (k: 'log' | 'sdr' | 'closer', label: string) => (
    <button onClick={() => setTab(k)} style={{ background: tab === k ? '#f59e0b20' : 'transparent', border: `1px solid ${tab === k ? '#f59e0b' : '#252535'}`, color: tab === k ? '#f59e0b' : '#9ca3af', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: tab === k ? 600 : 400 }}>{label}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>CRM — Prospecta Odonto</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Integração WhatsApp · Webhooks em tempo real</p></div>
          <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Webhooks hoje', v: kpis.webhooksHoje, c: '#3b82f6' },
            { l: 'Leads atualizados', v: kpis.leadsAtualizados, c: '#22c55e' },
            { l: 'Etapas movidas', v: kpis.etapasMovidas, c: '#f59e0b' },
            { l: 'Usuarios ativos', v: kpis.usersAtivos, c: '#a855f7' },
          ].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Webhook URL */}
        <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Webhook URL:</span>
          <code style={{ fontSize: 12, color: '#f59e0b', background: '#252535', padding: '4px 10px', borderRadius: 6, flex: 1 }}>https://excalibur-hq.vercel.app/api/crm/webhook</code>
          <button onClick={() => navigator.clipboard.writeText('https://excalibur-hq.vercel.app/api/crm/webhook')} style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Copiar</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {tabBtn('log', 'Log de Webhooks')}
          {tabBtn('sdr', 'Leads SDR')}
          {tabBtn('closer', 'Pipeline Closer')}
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div> : (
          <>
            {tab === 'log' && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Hora', 'Evento', 'Nome', 'Numero', 'Etiqueta', 'Acao', 'Status'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {logs.length === 0 ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#374151' }}>Nenhum webhook recebido ainda</td></tr> :
                    logs.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 11 }}>{tempo(l.created_at)}</td>
                        <td style={{ padding: '8px 12px', color: '#e5e7eb', fontSize: 11 }}>{l.evento}</td>
                        <td style={{ padding: '8px 12px', color: '#fff', fontSize: 11, fontWeight: 500 }}>{l.nome || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>{l.numero || '-'}</td>
                        <td style={{ padding: '8px 12px' }}>{l.etiqueta ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#a855f720', color: '#a855f7' }}>{l.etiqueta}</span> : <span style={{ color: '#374151', fontSize: 10 }}>-</span>}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 10 }}>{l.acao_executada || '-'}</td>
                        <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: l.processado ? '#22c55e20' : '#ef444420', color: l.processado ? '#22c55e' : '#ef4444' }}>{l.processado ? 'OK' : 'Erro'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'sdr' && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Nome', 'Status', 'Etiqueta WA', 'Ultimo contato', 'Disparos', 'Usuario WA'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {leadsWA.length === 0 ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#374151' }}>Nenhum lead com atividade WA</td></tr> :
                    leadsWA.map(l => (
                      <tr key={String(l.id)} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '8px 12px', color: '#fff', fontSize: 12, fontWeight: 500 }}>{String(l.nome)}</td>
                        <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#3b82f620', color: '#3b82f6' }}>{String(l.status)}</span></td>
                        <td style={{ padding: '8px 12px' }}>{l.etiqueta_wa ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#a855f720', color: '#a855f7' }}>{String(l.etiqueta_wa)}</span> : '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 11 }}>{tempo(String(l.ultimo_contato_wa || ''))}</td>
                        <td style={{ padding: '8px 12px', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>{String(l.total_disparos_wa)}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 11 }}>{String(l.usuario_wa || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'closer' && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Clinica', 'Status', 'Etiqueta WA', 'Ultimo contato', 'Disparos', 'Usuario WA'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {closerWA.length === 0 ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#374151' }}>Nenhuma oportunidade com atividade WA</td></tr> :
                    closerWA.map(p => (
                      <tr key={String(p.id)} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '8px 12px', color: '#fff', fontSize: 12, fontWeight: 500 }}>{String(p.nome_clinica)}</td>
                        <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#f59e0b20', color: '#f59e0b' }}>{String(p.status)}</span></td>
                        <td style={{ padding: '8px 12px' }}>{p.etiqueta_wa ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#a855f720', color: '#a855f7' }}>{String(p.etiqueta_wa)}</span> : '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 11 }}>{tempo(String(p.ultimo_contato_wa || ''))}</td>
                        <td style={{ padding: '8px 12px', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>{String(p.total_disparos_wa)}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 11 }}>{String(p.usuario_wa || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
