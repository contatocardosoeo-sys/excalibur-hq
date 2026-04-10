'use client'

import { useState } from 'react'
import Sidebar from '../../../components/Sidebar'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface UserRow { nome: string; email: string; role: string }

export default function NovoOnboarding() {
  const [step, setStep] = useState(1)
  // Passo 1
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [focos, setFocos] = useState<string[]>(['Prótese / Implantes / Protocolo'])
  const [focosOutros, setFocosOutros] = useState('')
  const [plano, setPlano] = useState('Completo (90 dias garantia)')
  const [valorContrato, setValorContrato] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  // Passo 2
  const [temCrc, setTemCrc] = useState(false); const [numCrc, setNumCrc] = useState('1')
  const [temRec, setTemRec] = useState(false); const [numRec, setNumRec] = useState('1')
  const [temAval, setTemAval] = useState(false); const [numAval, setNumAval] = useState('1')
  const [temOrc, setTemOrc] = useState(false); const [numOrc, setNumOrc] = useState('1')
  const [multi, setMulti] = useState(false); const [multiDesc, setMultiDesc] = useState('')
  const [numSalas, setNumSalas] = useState('')
  const [fatMedio, setFatMedio] = useState('')
  const [invTrafego, setInvTrafego] = useState('')
  // Passo 3
  const [usuarios, setUsuarios] = useState<UserRow[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [nu, setNu] = useState({ nome: '', email: '', role: 'crc' })
  // State
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [result, setResult] = useState<{ clinica_id: string; total: number } | null>(null)

  const addUser = () => { if (nu.nome && nu.email) { setUsuarios([...usuarios, { ...nu }]); setNu({ nome: '', email: '', role: 'crc' }); setAddOpen(false) } }
  const rmUser = (i: number) => setUsuarios(usuarios.filter((_, x) => x !== i))

  const salvar = async () => {
    setSaving(true); setErro('')
    try {
      const res = await fetch('/api/onboarding/criar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, cnpj, responsavel, email, whatsapp, cidade, estado,
          foco: focos.includes('Outros') && focosOutros ? [...focos.filter(f => f !== 'Outros'), focosOutros].join(', ') : focos.join(', '),
          plano,
          valor_contrato: Number(valorContrato) || 0, data_inicio: dataInicio,
          num_crc: temCrc ? Number(numCrc) : 0, num_recepcao: temRec ? Number(numRec) : 0,
          num_avaliador: temAval ? Number(numAval) : 0, num_orcamentista: temOrc ? Number(numOrc) : 0,
          profissional_multipapel: multi ? multiDesc : null,
          num_salas: Number(numSalas) || 0, faturamento_medio: Number(fatMedio) || 0,
          investimento_trafego: Number(invTrafego) || 0, usuarios,
        }),
      })
      const j = await res.json()
      if (j.success) { setResult({ clinica_id: j.clinica_id, total: j.total_tarefas_criadas }); setStep(4) }
      else setErro(j.error || 'Erro ao salvar')
    } catch (e) { setErro(String(e)) }
    setSaving(false)
  }

  const ok1 = nome && responsavel && email && whatsapp && dataInicio

  // Styles
  const bg = '#09090f'
  const cardBg = '#13131f'
  const bdr = '#252535'
  const amber = '#f59e0b'
  const S = {
    page: { minHeight: '100vh', background: bg, display: 'flex' } as React.CSSProperties,
    main: { flex: 1, padding: '24px 32px', overflowY: 'auto' as const, maxWidth: 820, margin: '0 auto' },
    card: { background: cardBg, border: `1px solid ${bdr}`, borderRadius: 16, padding: 24, marginBottom: 20 } as React.CSSProperties,
    label: { color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4, fontWeight: 500 } as React.CSSProperties,
    input: { width: '100%', background: '#1a1a2e', border: `1px solid ${bdr}`, borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' } as React.CSSProperties,
    g2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as React.CSSProperties,
    g3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 } as React.CSSProperties,
    btn: { background: amber, color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer' } as React.CSSProperties,
    btnSec: { background: 'transparent', color: '#6b7280', fontWeight: 500, fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 10, padding: '10px 24px', cursor: 'pointer' } as React.CSSProperties,
    row: { display: 'flex', justifyContent: 'space-between', marginTop: 20 } as React.CSSProperties,
  }

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: on ? amber : '#374151', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left 0.2s' }} />
    </button>
  )

  const ToggleRow = ({ label, on, onToggle, num, setNum }: { label: string; on: boolean; onToggle: () => void; num: string; setNum: (v: string) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${bdr}40` }}>
      <span style={{ flex: 1, color: '#e5e7eb', fontSize: 13 }}>{label}</span>
      <Toggle on={on} onToggle={onToggle} />
      {on && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#6b7280', fontSize: 11 }}>Qtd:</span>
          <input type="number" min="1" value={num} onChange={e => setNum(e.target.value)}
            style={{ width: 50, background: '#1a1a2e', border: `1px solid ${bdr}`, borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, outline: 'none', textAlign: 'center' }} />
        </div>
      )}
    </div>
  )

  // Stepper
  const steps = ['Dados', 'Config', 'Usuarios', 'Pronto']
  const Stepper = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i + 1 <= step ? amber : '#1a1a2e', border: `2px solid ${i + 1 <= step ? amber : bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i + 1 <= step ? '#030712' : '#4b5563', fontSize: 13, fontWeight: 700, transition: 'all 0.3s' }}>
              {i + 1}
            </div>
            <span style={{ fontSize: 10, color: i + 1 <= step ? amber : '#4b5563', fontWeight: i + 1 === step ? 600 : 400 }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 48, height: 2, background: i + 1 < step ? amber : bdr, margin: '0 4px', marginBottom: 18, transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div style={S.page}>
      <Sidebar />
      <div style={S.main}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Novo Cliente</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Cadastro completo — jornada D0-D90</p>
        </div>

        <Stepper />

        {/* PASSO 1 */}
        {step === 1 && (
          <div style={S.card}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Dados da Clinica</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={S.g2}>
                <div><label style={S.label}>Nome da clinica *</label><input value={nome} onChange={e => setNome(e.target.value)} style={S.input} placeholder="Ex: Oral Sin Floripa" /></div>
                <div><label style={S.label}>CNPJ</label><input value={cnpj} onChange={e => setCnpj(e.target.value)} style={S.input} placeholder="00.000.000/0001-00" /></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Responsavel *</label><input value={responsavel} onChange={e => setResponsavel(e.target.value)} style={S.input} placeholder="Nome do socio/dentista" /></div>
                <div><label style={S.label}>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} placeholder="clinica@email.com" /></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>WhatsApp *</label><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={S.input} placeholder="48999999999" /></div>
                <div style={S.g2}>
                  <div><label style={S.label}>Cidade</label><input value={cidade} onChange={e => setCidade(e.target.value)} style={S.input} /></div>
                  <div><label style={S.label}>Estado</label><select value={estado} onChange={e => setEstado(e.target.value)} style={S.input}><option value="">-</option>{ESTADOS.map(u => <option key={u}>{u}</option>)}</select></div>
                </div>
              </div>
              {/* Foco principal — multi-seleção */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Foco principal * <span style={{ color: '#4b5563', fontWeight: 400, textTransform: 'none' }}>(pode marcar mais de um)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {['Prótese / Implantes / Protocolo', 'Lentes de contato', 'Estética', 'Outros'].map(opcao => {
                    const marcado = focos.includes(opcao)
                    return (
                      <button key={opcao} type="button" onClick={() => setFocos(prev => prev.includes(opcao) ? prev.filter(f => f !== opcao) : [...prev, opcao])}
                        style={{ background: marcado ? '#f59e0b10' : '#13131f', border: `1px solid ${marcado ? '#f59e0b' : '#252535'}`, borderRadius: 8, padding: '10px 14px', color: marcado ? '#f59e0b' : '#9ca3af', fontSize: 13, fontWeight: marcado ? 600 : 400, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${marcado ? '#f59e0b' : '#374151'}`, background: marcado ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#000' }}>
                          {marcado && '✓'}
                        </span>
                        {opcao}
                      </button>
                    )
                  })}
                </div>
                {focos.includes('Outros') && (
                  <input type="text" placeholder="Descreva o foco..." value={focosOutros} onChange={e => setFocosOutros(e.target.value)}
                    style={{ marginTop: 8, width: '100%', background: '#09090f', border: '1px solid #f59e0b', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>

              <div style={S.g2}>
                <div>
                  <label style={S.label}>Plano contratado</label>
                  <select value={plano} onChange={e => setPlano(e.target.value)} style={S.input}>
                    <option>Completo (sem fidelidade)</option>
                    <option>Completo (90 dias garantia)</option>
                    <option>Apenas Financeira</option>
                    <option>Apenas Marketing</option>
                  </select>
                </div>
                <div><label style={S.label}>Valor contrato (R$)</label><input type="number" value={valorContrato} onChange={e => setValorContrato(e.target.value)} style={S.input} placeholder="1500" /></div>
              </div>
              <div style={S.g2}>
                <div><label style={S.label}>Data de inicio *</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={S.input} /></div>
                <div>
                  <label style={S.label}>CS responsavel</label>
                  <div style={{ ...S.input, background: '#0d0d1a', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: amber, fontWeight: 600 }}>Bruno Medina</span>
                    <span style={{ background: '#3b82f620', color: '#3b82f6', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>CS</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setStep(2)} disabled={!ok1} style={{ ...S.btn, opacity: ok1 ? 1 : 0.4 }}>Proximo →</button>
            </div>
          </div>
        )}

        {/* PASSO 2 */}
        {step === 2 && (
          <div style={S.card}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Configuracoes da Clinica</h2>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>Estrutura do time e dados operacionais</p>
            <ToggleRow label="Tem CRC (Consultor de Relacionamento)?" on={temCrc} onToggle={() => setTemCrc(!temCrc)} num={numCrc} setNum={setNumCrc} />
            <ToggleRow label="Tem recepcionista?" on={temRec} onToggle={() => setTemRec(!temRec)} num={numRec} setNum={setNumRec} />
            <ToggleRow label="Tem avaliador (dentista)?" on={temAval} onToggle={() => setTemAval(!temAval)} num={numAval} setNum={setNumAval} />
            <ToggleRow label="Tem orcamentista?" on={temOrc} onToggle={() => setTemOrc(!temOrc)} num={numOrc} setNum={setNumOrc} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${bdr}40` }}>
              <span style={{ flex: 1, color: '#e5e7eb', fontSize: 13 }}>Algum profissional faz mais de um papel?</span>
              <Toggle on={multi} onToggle={() => setMulti(!multi)} />
            </div>
            {multi && <div style={{ padding: '8px 0' }}><input value={multiDesc} onChange={e => setMultiDesc(e.target.value)} style={S.input} placeholder="Ex: Recepcionista tambem faz orcamento" /></div>}
            <div style={{ ...S.g3, marginTop: 16 }}>
              <div><label style={S.label}>Numero de salas</label><input type="number" value={numSalas} onChange={e => setNumSalas(e.target.value)} style={S.input} placeholder="3" /></div>
              <div><label style={S.label}>Faturamento medio (R$)</label><input type="number" value={fatMedio} onChange={e => setFatMedio(e.target.value)} style={S.input} placeholder="80000" /></div>
              <div><label style={S.label}>Investimento trafego (R$)</label><input type="number" value={invTrafego} onChange={e => setInvTrafego(e.target.value)} style={S.input} placeholder="1500" /></div>
            </div>
            <div style={S.row}>
              <button onClick={() => setStep(1)} style={S.btnSec}>← Voltar</button>
              <button onClick={() => setStep(3)} style={S.btn}>Proximo →</button>
            </div>
          </div>
        )}

        {/* PASSO 3 */}
        {step === 3 && (
          <div style={S.card}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Acessos da clinica no sistema</h2>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>Cada perfil tera acesso ao seu modulo no Excalibur Web.</p>
            {usuarios.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {usuarios.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#1a1a2e', borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ color: '#fff', fontSize: 13, flex: 1 }}>{u.nome}</span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{u.email}</span>
                    <span style={{ background: `${amber}20`, color: amber, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>{u.role.toUpperCase()}</span>
                    <button onClick={() => rmUser(i)} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {addOpen ? (
              <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={S.g3}>
                  <div><label style={S.label}>Nome</label><input value={nu.nome} onChange={e => setNu({ ...nu, nome: e.target.value })} style={S.input} /></div>
                  <div><label style={S.label}>Email</label><input value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} style={S.input} /></div>
                  <div><label style={S.label}>Perfil</label><select value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value })} style={S.input}><option value="crc">CRC</option><option value="recepcao">Recepcao</option><option value="avaliador">Avaliador</option><option value="orcamentista">Orcamentista</option><option value="socio">Socio</option></select></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={addUser} style={{ ...S.btn, padding: '6px 16px', fontSize: 12 }}>Adicionar</button>
                  <button onClick={() => setAddOpen(false)} style={{ ...S.btnSec, padding: '6px 16px', fontSize: 12 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddOpen(true)} style={{ background: '#1a1a2e', color: amber, border: `1px dashed ${amber}40`, borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 500, width: '100%' }}>+ Adicionar usuario</button>
            )}
            <p style={{ color: '#4b5563', fontSize: 11, marginTop: 12 }}>Voce pode adicionar usuarios depois.</p>
            {erro && <p style={{ color: '#ef4444', fontSize: 12, background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>{erro}</p>}
            <div style={S.row}>
              <button onClick={() => setStep(2)} style={S.btnSec}>← Voltar</button>
              <button onClick={salvar} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Finalizar Cadastro →'}</button>
            </div>
          </div>
        )}

        {/* PASSO 4 */}
        {step === 4 && result && (
          <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Cliente cadastrado com sucesso!</h2>
            <p style={{ color: amber, fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{nome}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', marginBottom: 28 }}>
              <p style={{ color: '#9ca3af', fontSize: 14 }}>A jornada D0-D90 foi iniciada.</p>
              <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>{result.total} tarefas criadas automaticamente.</p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>CS responsavel: Bruno Medina</p>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => window.location.href = '/jornada'} style={S.btn}>Ver Jornada →</button>
              <button onClick={() => window.location.reload()} style={S.btnSec}>Cadastrar outro cliente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
