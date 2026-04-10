'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#a855f7',
  cs: '#3b82f6',
  sdr: '#f97316',
  closer: '#22c55e',
  trafego: '#eab308',
  financeiro: '#06b6d4',
}

const ROLES = ['admin', 'cs', 'sdr', 'closer', 'trafego', 'financeiro']

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', role: 'cs', senha: '1234' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Modal alterar senha
  const [senhaModal, setSenhaModal] = useState<Usuario | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/usuarios')
    const json = await res.json()
    setUsuarios(json.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: interno } = await supabase.from('usuarios_internos').select('role, roles').eq('email', user.email).single()
        const userRoles: string[] = (interno?.roles && Array.isArray(interno.roles) && interno.roles.length > 0) ? interno.roles : [interno?.role || '']
        if (userRoles.includes('admin')) {
          setIsAdmin(true)
          load()
        } else {
          window.location.href = '/ceo'
        }
      } else {
        window.location.href = '/'
      }
    })()
  }, [load])

  const criar = async () => {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.success) {
      setMsg('Colaborador criado!')
      setShowModal(false)
      setForm({ nome: '', email: '', role: 'cs', senha: '1234' })
      load()
    } else {
      setMsg(`Erro: ${json.error}`)
    }
    setSaving(false)
  }

  const toggleAtivo = async (u: Usuario) => {
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, ativo: !u.ativo }),
    })
    load()
  }

  const alterarSenha = async () => {
    if (!senhaModal) return
    setMsg('')
    if (novaSenha.length < 6) { setMsg('Erro: Senha deve ter no minimo 6 caracteres'); return }
    if (novaSenha !== confirmaSenha) { setMsg('Erro: As senhas nao coincidem'); return }
    setSalvandoSenha(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: senhaModal.email, novaSenha }),
    })
    const json = await res.json()
    if (json.success) {
      setMsg(`Senha de ${senhaModal.nome} alterada com sucesso`)
      setSenhaModal(null); setNovaSenha(''); setConfirmaSenha('')
    } else {
      setMsg(`Erro: ${json.error || 'falha ao alterar senha'}`)
    }
    setSalvandoSenha(false)
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto min-w-0 max-w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">Colaboradores</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">Gerencie usuarios internos da Excalibur</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm rounded-xl px-5 min-h-[44px] transition whitespace-nowrap"
          >
            + Novo Colaborador
          </button>
        </div>

        {msg && (
          <div style={{ background: msg.startsWith('Erro') ? '#ef444420' : '#22c55e20', border: `1px solid ${msg.startsWith('Erro') ? '#ef4444' : '#22c55e'}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: msg.startsWith('Erro') ? '#ef4444' : '#22c55e', fontSize: 13 }}>
            {msg}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 md:p-6 mb-6">
            <h3 className="text-white text-base font-semibold mb-4">Novo Colaborador</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Senha inicial</label>
                <input value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={criar} disabled={saving}
                style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Criando...' : 'Criar'}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'transparent', color: '#6b7280', fontWeight: 500, fontSize: 13, border: '1px solid #374151', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Carregando...</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  {['', 'Nome', 'Email', 'Role', 'Status', 'Criado em', 'Acao'].map(h => (
                    <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1f293750' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ROLE_COLORS[u.role] || '#6b7280'}20`, border: `1px solid ${ROLE_COLORS[u.role] || '#6b7280'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ROLE_COLORS[u.role] || '#6b7280', fontSize: 11, fontWeight: 700 }}>
                        {u.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{u.nome}</td>
                    <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: `${ROLE_COLORS[u.role] || '#6b7280'}20`, color: ROLE_COLORS[u.role] || '#6b7280', border: `1px solid ${ROLE_COLORS[u.role] || '#6b7280'}40`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.ativo ? '#22c55e' : '#ef4444', display: 'inline-block', marginRight: 6 }} />
                      <span style={{ color: u.ativo ? '#22c55e' : '#ef4444', fontSize: 12 }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setSenhaModal(u); setNovaSenha(''); setConfirmaSenha(''); setMsg('') }}
                          className="bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-md px-2.5 min-h-[36px] text-[11px] font-medium hover:bg-blue-500/30 transition whitespace-nowrap">
                          🔑 Senha
                        </button>
                        <button onClick={() => toggleAtivo(u)}
                          className={`rounded-md px-3 min-h-[36px] text-[11px] font-medium transition whitespace-nowrap ${u.ativo ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'}`}>
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal alterar senha */}
        {senhaModal && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setSenhaModal(null)}>
            <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 28, width: 440 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔑 Alterar senha</h3>
              <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>{senhaModal.nome} · {senhaModal.email}</p>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Nova senha *</label>
                  <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Minimo 6 caracteres" autoFocus
                    style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Confirme a nova senha *</label>
                  <input type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} placeholder="Repita a senha"
                    style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                    onKeyDown={e => { if (e.key === 'Enter') alterarSenha() }} />
                </div>
                {novaSenha && confirmaSenha && novaSenha !== confirmaSenha && (
                  <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 11 }}>
                    As senhas nao coincidem
                  </div>
                )}
                {novaSenha && novaSenha.length > 0 && novaSenha.length < 6 && (
                  <div style={{ background: '#f59e0b20', border: '1px solid #f59e0b40', borderRadius: 8, padding: '8px 12px', color: '#f59e0b', fontSize: 11 }}>
                    Senha muito curta — minimo 6 caracteres
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={alterarSenha} disabled={salvandoSenha || !novaSenha || novaSenha.length < 6 || novaSenha !== confirmaSenha}
                  style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: (salvandoSenha || !novaSenha || novaSenha.length < 6 || novaSenha !== confirmaSenha) ? 0.4 : 1 }}>
                  {salvandoSenha ? 'Alterando...' : '✅ Confirmar'}
                </button>
                <button onClick={() => setSenhaModal(null)}
                  style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
