import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mapearEtapaSDR, mapearEtapaCloser, EVENTOS_MAP } from '../../../../lib/prospecta-map'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function extrairDados(body: Record<string, unknown>) {
  const de = (body.dados_do_evento || {}) as Record<string, unknown>
  const pc = (body.perfil_do_contato || {}) as Record<string, unknown>
  const ct = (body.contact || {}) as Record<string, unknown>

  const numero = String(body.numero || body.number || body.phone || de.numero || ct.phone || '')
    .replace(/\D/g, '').replace(/^55/, '')
  const nome = String(body.nome || body.name || de.nome || pc.nome || ct.name || 'Contato WhatsApp').trim()
  const evento = String(body.evento || body.event || body.tipo || de.tipo || 'Mensagens').trim()
  const etiqueta = String(body.etiqueta || body.label || body.tag || de.etiqueta || '').trim()
  const usuario = String(body.usuario_logado || body.user || body.agente || de.usuario || '').trim()
  const mensagem = String(body.mensagem || (body.message as Record<string, unknown>)?.text || body.text || de.mensagem || '').slice(0, 300)

  return { numero, nome, evento, etiqueta, usuario, mensagem }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const d = extrairDados(body)

  const { data: log } = await supabase.from('prospecta_webhooks_log').insert({
    payload: body, evento: d.evento, numero: d.numero, nome: d.nome,
    etiqueta: d.etiqueta || null, usuario_wa: d.usuario || null,
  }).select('id').single()
  const logId = log?.id

  if (!d.numero) {
    if (logId) await supabase.from('prospecta_webhooks_log').update({ erro: 'numero vazio', processado: false }).eq('id', logId)
    return NextResponse.json({ ok: true })
  }

  const hist = { data: new Date().toISOString(), evento: d.evento, tipo: EVENTOS_MAP[d.evento] || 'evento', etiqueta: d.etiqueta || null, mensagem: d.mensagem || null, usuario: d.usuario || null }

  // Buscar lead SDR pelo telefone
  const { data: leadSDR } = await supabase.from('leads_sdr')
    .select('id, status, historico_wa, total_disparos_wa, etiqueta_wa')
    .ilike('telefone', `%${d.numero}%`).limit(1).maybeSingle()

  if (leadSDR) {
    const hwa = Array.isArray(leadSDR.historico_wa) ? [...leadSDR.historico_wa, hist] : [hist]
    const upd: Record<string, unknown> = {
      historico_wa: hwa, ultimo_contato_wa: new Date().toISOString(),
      total_disparos_wa: (leadSDR.total_disparos_wa || 0) + 1, updated_at: new Date().toISOString(),
    }
    if (d.usuario) upd.usuario_wa = d.usuario
    let acao = 'lead_sdr_historico_atualizado'

    if (d.etiqueta) {
      upd.etiqueta_wa = d.etiqueta
      const nova = mapearEtapaSDR(d.etiqueta)
      if (nova && nova !== leadSDR.status) { upd.status = nova; acao = `sdr_etapa_${leadSDR.status}_→_${nova}` }
    }

    await supabase.from('leads_sdr').update(upd).eq('id', leadSDR.id)
    if (logId) await supabase.from('prospecta_webhooks_log').update({ acao_executada: acao, processado: true, lead_id: leadSDR.id }).eq('id', logId)
    return NextResponse.json({ ok: true, acao, id: leadSDR.id })
  }

  // Buscar no pipeline_closer pelo nome
  const { data: closer } = await supabase.from('pipeline_closer')
    .select('id, status, historico_wa, total_disparos_wa')
    .ilike('nome_clinica', `%${d.nome.split(' ')[0]}%`).limit(1).maybeSingle()

  if (closer) {
    const hwa = Array.isArray(closer.historico_wa) ? [...closer.historico_wa, hist] : [hist]
    const upd: Record<string, unknown> = {
      historico_wa: hwa, ultimo_contato_wa: new Date().toISOString(),
      total_disparos_wa: (closer.total_disparos_wa || 0) + 1,
    }
    if (d.etiqueta) {
      upd.etiqueta_wa = d.etiqueta
      const nova = mapearEtapaCloser(d.etiqueta)
      if (nova && nova !== closer.status) upd.status = nova
    }
    await supabase.from('pipeline_closer').update(upd).eq('id', closer.id)
    if (logId) await supabase.from('prospecta_webhooks_log').update({ acao_executada: 'closer_atualizado', processado: true, pipeline_id: closer.id }).eq('id', logId)
    return NextResponse.json({ ok: true, acao: 'closer_atualizado', id: closer.id })
  }

  // Lead novo
  const etapaIni = (d.etiqueta && mapearEtapaSDR(d.etiqueta)) || 'prospeccao'
  const { data: novo } = await supabase.from('leads_sdr').insert({
    nome: d.nome, telefone: d.numero,
    origem: d.evento === 'Anuncio do Instagram' ? 'meta_ads' : 'prospecta_crm',
    status: etapaIni, proxima_acao: 'Lead recebido pelo Prospecta CRM',
    historico_wa: [hist], ultimo_contato_wa: new Date().toISOString(),
    total_disparos_wa: 1, etiqueta_wa: d.etiqueta || null, usuario_wa: d.usuario || null,
  }).select().single()

  if (logId) await supabase.from('prospecta_webhooks_log').update({ acao_executada: 'lead_criado', processado: true, lead_id: novo?.id }).eq('id', logId)
  return NextResponse.json({ ok: true, acao: 'lead_criado', id: novo?.id })
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    ferramenta: 'Prospecta CRM (Waseller white label)',
    webhook_url: 'https://excalibur-hq.vercel.app/api/crm/webhook',
    instrucoes: [
      '1. Abrir o Prospecta CRM no Chrome',
      '2. Ir em WebHooks',
      '3. Colar a URL: https://excalibur-hq.vercel.app/api/crm/webhook',
      '4. Marcar: Dados do Evento, Numero, Nome, Etiqueta, Usuario Logado',
      '5. Ativar eventos: Etiqueta, Follow Up, Agendamento, CRM, Mensagens',
      '6. Clicar em Ativo e Salvar',
    ],
    mapeamento_etiquetas: {
      sdr: { 'agendado': '→ Agendado', 'reuniao feita': '→ Reunião Feita', 'perdido': '→ Perdido' },
      closer: { 'proposta enviada': '→ Proposta Enviada', 'fechado': '→ Fechado' },
    },
  })
}
