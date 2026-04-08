import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TAREFAS: Array<{
  fase: string; prazo_dia: number; titulo: string; descricao: string; responsavel: string; bloqueante?: boolean
}> = [
  // D1-D2
  { fase: 'D1-D2', prazo_dia: 1, titulo: 'Enviar boas-vindas oficial', descricao: 'Enviar mensagem oficial explicando: o que foi contratado, o que vai acontecer na semana e as responsabilidades do cliente.', responsavel: 'CS' },
  { fase: 'D1-D2', prazo_dia: 1, bloqueante: true, titulo: 'Enviar conteúdo de onboarding', descricao: 'Enviar vídeos e instruções de onboarding. Solicitar palavra-chave de confirmação. BLOQUEANTE: cliente só avança se confirmar que assistiu.', responsavel: 'CS' },
  { fase: 'D1-D2', prazo_dia: 2, bloqueante: true, titulo: 'Validar: cliente assistiu o onboarding?', descricao: 'Confirmar recebimento da palavra-chave. Se não assistiu → NÃO AGENDAR reunião. Processo travado até confirmação.', responsavel: 'CS' },
  // D2-D3
  { fase: 'D2-D3', prazo_dia: 2, titulo: 'Agendar reunião de onboarding', descricao: 'Agendar reunião SOMENTE se cliente confirmou que assistiu o conteúdo.', responsavel: 'CS' },
  { fase: 'D2-D3', prazo_dia: 3, titulo: 'Reunião de onboarding (obrigatória)', descricao: 'Alinhar: como funciona o marketing, como chegam os leads, como funciona a financeira, como usar o CRM, qual é o papel da clínica. Definir ICP, região de atendimento, tipo de lead e expectativa de volume.', responsavel: 'CS' },
  { fase: 'D2-D3', prazo_dia: 3, titulo: 'Registrar e formalizar alinhamentos', descricao: 'Documentar tudo que foi acordado na reunião. Enviar resumo por e-mail para o cliente. Isso vira prova futura.', responsavel: 'CS' },
  // D3-D7
  { fase: 'D3-D7', prazo_dia: 4, bloqueante: true, titulo: 'Validar briefing completo', descricao: 'Verificar: briefing completo, ICP correto, faz sentido para o público da Excalibur. BLOQUEANTE: não sobe campanha sem briefing validado.', responsavel: 'CS' },
  { fase: 'D3-D7', prazo_dia: 4, titulo: 'Liberar acessos ao sistema', descricao: 'Criar login da clínica no excalibur-web. Enviar credenciais para o responsável.', responsavel: 'CS' },
  { fase: 'D3-D7', prazo_dia: 5, bloqueante: true, titulo: 'Validar estrutura para campanha', descricao: 'Confirmar: criativos aprovados, segmentação definida, orçamento alinhado, CRM configurado, tracking funcionando. BLOQUEANTE: sem todos aprovados, não sobe.', responsavel: 'CS' },
  { fase: 'D3-D7', prazo_dia: 5, titulo: 'Configurar CRM WhatsApp', descricao: 'Configurar token Wascript, testar webhook, validar recebimento de lead de teste.', responsavel: 'CS' },
  { fase: 'D3-D7', prazo_dia: 6, titulo: 'Ativar campanha', descricao: 'Subir campanha sniper para aposentados pré-aprovados. Testar recebimento do primeiro lead. Confirmar com o cliente.', responsavel: 'CS' },
  { fase: 'D3-D7', prazo_dia: 6, titulo: 'Comunicar cliente: campanha no ar', descricao: 'Avisar que a campanha está ativa. Reforçar: tempo máximo de resposta ao lead, processo de atendimento no CRM, uso do script.', responsavel: 'CS' },
  { fase: 'D3-D7', prazo_dia: 7, titulo: 'Marco D7 — Clínica ativada', descricao: 'Validar: campanha ativa + leads chegando + CRM funcionando + cliente respondendo. Atualizar etapa na jornada para D7_ATIVADO.', responsavel: 'CS' },
  // D7
  { fase: 'D7', prazo_dia: 7, titulo: 'Validar recebimento e resposta de leads', descricao: 'Confirmar: chegou lead? Cliente respondeu? Com que velocidade? Usando o script? CRÍTICO: aqui começa o churn invisível.', responsavel: 'CS' },
  { fase: 'D7', prazo_dia: 8, titulo: 'Checar adoção do sistema', descricao: 'Cliente está usando o CRM ou ignorando? Está preenchendo o funil diário? Se não está executando, agir imediatamente.', responsavel: 'CS' },
  // D7-D15
  { fase: 'D7-D15', prazo_dia: 8, titulo: 'Início do monitoramento do funil', descricao: 'Começar a monitorar: leads gerados, respondidos, agendamentos, comparecimento, fechamento. Identificar onde está o gargalo.', responsavel: 'CS' },
  { fase: 'D7-D15', prazo_dia: 8, titulo: 'Cliente inicia preenchimento do funil diário', descricao: 'Orientar cliente a preencher o funil no excalibur-web todos os dias.', responsavel: 'CLINICA' },
  { fase: 'D7-D15', prazo_dia: 10, titulo: 'Check D10 — identificar gargalo', descricao: 'Sem lead → problema no marketing. Não responde → problema comercial. Não fecha → problema na oferta/conversão. Intervir ativamente conforme o gargalo.', responsavel: 'CS' },
  { fase: 'D7-D15', prazo_dia: 12, titulo: 'Intervenção ativa se necessário', descricao: 'Se identificou problema: call de ajuste, reforço de treinamento, envio de material, alinhamento direto. CS NÃO espera — CS ANTECIPA.', responsavel: 'CS' },
  { fase: 'D7-D15', prazo_dia: 14, titulo: 'Treinamento de recepção e anamnese', descricao: 'Reforçar protocolo de anamnese financeira. Garantir que a recepção está coletando CPF, profissão e perguntando sobre decisão de compra.', responsavel: 'CS' },
  // D15
  { fase: 'D15', prazo_dia: 15, titulo: 'Marco D15 — Reunião de performance', descricao: 'Apresentar dados reais: quantos leads, quantos atendidos, quantos fecharam. Mostrar onde está o gargalo. Ajustar estratégia. Definir plano claro até D30.', responsavel: 'CS' },
  { fase: 'D15', prazo_dia: 15, titulo: 'Classificação inicial do cliente', descricao: 'Definir classificação provisória: Saudável, Atenção ou Risco. Atualizar health score no sistema.', responsavel: 'CS' },
  // D15-D30
  { fase: 'D15-D30', prazo_dia: 17, titulo: 'Treinamento de avaliação', descricao: 'Reforçar protocolo de avaliação: separar avaliação de orçamento, vender o sonho antes do preço, usar IA de simulação de sorriso se não tiver exame.', responsavel: 'CS' },
  { fase: 'D15-D30', prazo_dia: 18, titulo: 'Treinamento de orçamento e financeira', descricao: 'Treinar orçamentista: apresentar financiamento como parcela (não como valor total), trabalhar objeção de juros, perfil do aposentado.', responsavel: 'CS' },
  { fase: 'D15-D30', prazo_dia: 20, titulo: 'Check D20 — performance do funil completo', descricao: 'Analisar funil completo: agendamento, comparecimento, fechamento. Fazer ajustes de A/B test, script e processo.', responsavel: 'CS' },
  { fase: 'D15-D30', prazo_dia: 22, titulo: 'Reativação de base de pacientes', descricao: 'Enviar lista de pacientes antigos que fizeram orçamento mas não fecharam para aprovação na financeira.', responsavel: 'CS' },
  { fase: 'D15-D30', prazo_dia: 24, titulo: 'Forçar execução se necessário', descricao: 'Se cliente não responde lead, não usa CRM ou não executa: ser firme. Ligar, cobrar, registrar. CS não pode tolerar não-execução aqui.', responsavel: 'CS' },
  { fase: 'D15-D30', prazo_dia: 25, titulo: 'Revisão de health score', descricao: 'Atualizar checklist de adoção. Reclassificar cliente com base na execução real das últimas 2 semanas.', responsavel: 'CS' },
  { fase: 'D15-D30', prazo_dia: 28, titulo: 'Projeção de resultado D30', descricao: 'Projetar faturamento do mês com base nos dados do funil. Preparar apresentação para reunião D30.', responsavel: 'CS' },
  // D30
  { fase: 'D30', prazo_dia: 30, titulo: 'Marco D30 — Reunião formal de resultado', descricao: 'Mostrar resultado completo, evolução e gargalos. Classificar definitivamente: Saudável / Atenção / Risco. Definir plano: ajuste, continuidade ou escala. Registrar relatório e decisão no sistema.', responsavel: 'CS' },
  { fase: 'D30', prazo_dia: 30, titulo: 'Classificação final D30', descricao: 'Saudável → planejar escala. Atenção → plano de ação D30-D90. Risco → reunião de crise, definir ultimato.', responsavel: 'CS' },
  { fase: 'D30', prazo_dia: 30, titulo: 'Registrar relatório D30 completo', descricao: 'Documentar: resultado, classificação, decisão, próximos passos. Registrar no sistema para histórico.', responsavel: 'CS' },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nome, cnpj, responsavel, email, whatsapp, cidade, estado,
      foco, plano, valor_contrato, data_inicio,
      num_crc, num_recepcao, num_avaliador, num_orcamentista,
      profissional_multipapel, num_salas, faturamento_medio, investimento_trafego,
      usuarios = [],
    } = body

    // 1. Criar clínica
    const { data: clinica, error: cErr } = await supabase
      .from('clinicas')
      .insert({
        nome, cnpj, responsavel, email, whatsapp, cidade, estado,
        foco, plano, valor_contrato,
        num_crc, num_recepcao, num_avaliador, num_orcamentista,
        profissional_multipapel, num_salas, faturamento_medio, investimento_trafego,
        cs_responsavel: 'Bruno Medina',
        data_inicio, ativo: true,
      })
      .select()
      .single()

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    const clinica_id = clinica.id

    // 2. Iniciar jornada D0
    await supabase.from('jornada_clinica').upsert({
      clinica_id, etapa: 'D0_PAGAMENTO', data_inicio,
    }, { onConflict: 'clinica_id' })

    // 3. Metas do contrato
    await supabase.from('metas_contrato').upsert({
      clinica_id,
      meta_cpl: 5, meta_agendamento: 40, meta_comparecimento: 50,
      meta_fechamento: 40, meta_ticket_medio: 4500,
      meta_investimento_mes: investimento_trafego || 1500,
      valor_contrato: valor_contrato || 1500,
      data_inicio,
      data_fim: new Date(new Date(data_inicio).getTime() + 90 * 86400000).toISOString().split('T')[0],
    }, { onConflict: 'clinica_id' })

    // 4. Usuários da clínica
    if (usuarios.length > 0) {
      await supabase.from('usuarios_clinica').insert(
        usuarios.map((u: { nome: string; email: string; role: string }) => ({
          clinica_id, nome: u.nome, email: u.email, role: u.role,
        }))
      )
    }

    // 5. Gerar tarefas da jornada
    const dataInicio = new Date(data_inicio)
    const tarefas = TAREFAS.map(t => ({
      clinica_id,
      fase: t.fase,
      titulo: t.titulo,
      descricao: t.descricao,
      responsavel: t.responsavel,
      prazo_dia: t.prazo_dia,
      bloqueante: t.bloqueante || false,
      data_prazo: new Date(dataInicio.getTime() + t.prazo_dia * 86400000).toISOString().split('T')[0],
      status: 'pendente',
    }))

    await supabase.from('tarefas_jornada').insert(tarefas)

    return NextResponse.json({
      success: true,
      clinica_id,
      total_tarefas_criadas: tarefas.length,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
