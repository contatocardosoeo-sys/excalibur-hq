# ⚔️ EXCALIBUR OS v5.0 — DOCUMENTO MASTER
# Versão: 5.0 | CEO: Matheus Cardoso | Atualizado: 10/04/2026

---

## ECOSSISTEMA — 3 PROJETOS

| Projeto | Propósito | Status | Deploy |
|---|---|---|---|
| excalibur-hq | Sistema interno da Excalibur | ✅ Produção | excalibur-hq.vercel.app |
| excalibur-web | ERP/SaaS para clínicas (produto) | 🔄 Em dev | excalibur-web.vercel.app |
| excalibur-extension | Extensão Chrome CRM WhatsApp | 🔄 Em dev | Local (Chrome) |

Stack: Next.js 16 + React 19 + Supabase + Claude API + Tailwind 4

---

## REGRA ZERO — INVIOLÁVEL

1. O que foi aprovado pelo CEO NÃO pode ser alterado sem autorização
2. Antes de mexer em algo que funciona: PERGUNTAR
3. HQ ≠ Web ≠ Extension — NUNCA misturar
4. Build + deploy + commit ao final de cada tarefa
5. Reportar tabela de verificação com ✅/❌

---

## USUÁRIOS DO HQ

| Nome | Email | Senha | Role | Tela padrão |
|---|---|---|---|---|
| Cardoso (CEO) | contato.cardosoeo@gmail.com | 123456 | admin | /dashboard |
| Luana | luanacaira.excalibur@gmail.com | 123456 | admin | /dashboard |
| Medina | brunomedina.contato@gmail.com | 123456 | cs | /cs |
| Guilherme | guilherme.excalibur@gmail.com | 123456 | closer+cmo | /comercial |
| Trindade | trindade.excalibur@gmail.com | 123456 | sdr | /sdr |

---

## PACOTES COMERCIAIS (vendidos pelo Guilherme)

| Pacote | Valor mensal | Fidelidade |
|---|---|---|
| Completo (sem fidelidade) | R$3.500 | Sem |
| Completo (90 dias garantia) | R$3.000 | 90 dias |
| Apenas Financeira | R$1.000 | - |
| Apenas Marketing | R$1.500 | - |

---

## 🔵 EXCALIBUR HQ — TODAS AS TELAS (30+ páginas)

### Dashboards (admin)
- /visao-geral — Painel consolidado: Financeiro + CS + SDR + Comercial + Tráfego + Operação (ADMIN ONLY)
- /dashboard — Funil comercial + saúde CS + financeiro resumido (todos os roles)
- /ceo — Receita dia/mês, funil, crescimento, MRR, status times (dados reais do financeiro_receber)
- /coo — Visão operacional: pipeline, gargalos, SLAs, performance times
- /financeiro — Dashboard financeiro: MRR, breakdown por plano, churn, projeção

### SDR — Trindade ✅
- /sdr — Kanban 5 colunas + metas (30/10/3) + modal + badges WA
- Integração Prospecta CRM via webhook

### Comercial — Guilherme (Closer) ✅
- /comercial — Pipeline 4 colunas + metas (20/5/10k) + comissão 10%
- 4 pacotes: Completo s/ fidelidade R$3.500 / Completo 90d R$3.000 / Financeira R$1.000 / Marketing R$1.500

### Tráfego — Guilherme (CMO) ✅
- /trafego — BI Comercial + Planilha Diária
- Funil horizontal + diagnóstico automático de gargalo
- 3 metas: Mínima R$74k / Normal R$90k / Super R$106k
- Baseline imutável: CPL R$10,68 | Agendamento 35,25% | Comparecimento 71,30%

### CS — Medina ✅ (NÃO MEXER)
- /cs — Cockpit lista acionável por prioridade + exportar CSV
- /clientes — Base completa com filtros + exportar CSV
- /jornada — Painel macro 4 fases clicáveis
- /jornada/[id] — Kanban individual D0-D90
- /cs/calendario — Visão semanal de tarefas da jornada (NOVO)
- /alertas — Alertas que geram obrigação de ação

### Operação (admin)
- /onboarding — Lista de clientes em onboarding
- /onboarding/novo — Cadastro novo cliente (3 etapas, pacotes reais)
- /operacao/financeiro — A Receber + A Pagar + Resumo do Mês (COMPLETO)
- /operacao/colaboradores — CRUD colaboradores com custos mensais (NOVO)

### Sistema
- /admin/usuarios — Gestão de usuários internos
- /ia/supervisor — Agente Claude supervisor
- /ia/reactions — Event reactions automáticas
- /observabilidade — Monitoramento
- /crm — Webhook receptor Prospecta CRM

### Sidebar v1.3
- Busca global integrada (pesquisa clinicas, leads, pipeline, financeiro)
- Mobile responsivo (drawer com hamburger < 768px)
- Notificações cross-setor (badge 🔔)
- Alerta preenchimento planilha (só Guilherme e Trindade — admin excluído)

---

## 🔵 BANCO DE DADOS (Supabase)

### Usuários
- usuarios_internos — roles[], nome, email, ativo

### CS
- clinicas — id, nome, plano, valor_contrato, cs_responsavel, especialidade, instagram, meta_faturamento, meta_leads, notas_cs
- tarefas_jornada — 22 tarefas D0-D30 por clínica (fase, titulo, bloqueante, data_prazo)
- jornada_clinica — etapa, dias_na_plataforma, data_inicio
- alertas_clinica, adocao_clinica, funil_diario
- log_atividades_cs — tipo, descricao, clinica_id, responsavel (NOVO)

### Comercial B2B
- leads_sdr — com campanha_id, historico_wa, etiqueta_wa
- pipeline_closer — com historico_wa, ultimo_contato_wa
- metas_sdr (30/10/3), metas_closer (20/5/10k comissão 10%)
- campanhas_trafego, funil_trafego_diario

### Financeiro (NOVO — dados reais Jan-Abr 2026)
- financeiro_receber — 200+ lançamentos, data_vencimento, cliente_nome, plano, valor, status
- financeiro_pagar — 236+ lançamentos, descricao, tipo normalizado, valor, status
- financeiro_colaboradores — nome, cargo, tipo, valor_mensal, dia_pagamento, ativo (NOVO)
- financeiro_mensal — mrr, receita_total, custo_total por mês (4 meses)
- clientes_hq — 47 clientes com fase, score, mrr, plano (dados reais)

### Tipos normalizados (financeiro_pagar)
- colaborador (78), marketing (48), ferramenta (42), prolabore (32), outro (32), aluguel (4)

### Sistema
- notificacoes_hq, prospecta_webhooks_log
- event_reactions (8 regras de automação)
- sessoes_ia, sugestoes_ia, eventos_sistema, logs_sistema

---

## 🔵 APIs (50+ endpoints)

### Dashboard/CEO
- /api/dashboard — Funil + saúde CS + financeiro (MRR real do financeiro_receber)
- /api/ceo/dashboard — Receita, crescimento, funil, times, financeiro (dados reais)
- /api/hq/coo — Pipeline, gargalos, SLAs, performance
- /api/hq/financeiro — MRR, breakdown planos, churn, projeção

### SDR/Comercial
- /api/sdr/leads — CRUD leads + metas
- /api/sdr/stats — Stats resumidas SDR (NOVO)
- /api/comercial/pipeline — CRUD pipeline + metas
- /api/comercial/stats — Stats resumidas comercial + esfriando (NOVO)
- /api/comercial/ativar — Fechar → criar clínica

### CS
- /api/cs/cockpit — Dados do cockpit CS (service role, bypass RLS)
- /api/cs/lista — Dados da lista clientes (service role)
- /api/cs/log — CRUD log atividades CS (NOVO)
- /api/cs/registrar-contato — Registrar interação
- /api/jornada — Tarefas da jornada

### Financeiro
- /api/financeiro/receber — CRUD + auto-atrasado
- /api/financeiro/pagar — CRUD + auto-atrasado
- /api/financeiro/resumo — Caixa, taxas, inadimplentes, comparativo
- /api/financeiro/colaboradores — CRUD colaboradores (NOVO)

### Sistema
- /api/busca — Busca global (clinicas, leads, pipeline, financeiro) (NOVO)
- /api/preenchimento — Planilha diária (exclui admin do alerta)
- /api/notificacoes — Cross-setor
- /api/crm/webhook — Receptor Prospecta CRM
- /api/wascript/send — Envio WhatsApp
- /api/ia/supervisor — Agente IA

---

## 🔌 INTEGRAÇÕES

### Supabase
URL: https://hluhlsnodndpskrkbjuw.supabase.co
Credenciais: em .env.local (não commitar)

### Wascript API (Prospecta CRM white label)
Base: https://api-whatsapp.wascript.com.br
PENDENTE: tokens Trindade + Guilherme

### Webhook Prospecta CRM
URL: https://excalibur-hq.vercel.app/api/crm/webhook

### Claude API
Modelo: claude-sonnet-4-20250514
Usado em: /ia/supervisor + extensão

---

## DADOS FINANCEIROS REAIS (Jan-Abr 2026)

| Mês | A Receber | Recebido | A Pagar | Pago | Caixa |
|---|---|---|---|---|---|
| Jan | R$84.500 | R$84.500 | R$81.604 | R$80.372 | R$4.128 |
| Fev | R$95.350 | R$87.050 | R$94.113 | R$92.221 | -R$5.171 |
| Mar | R$80.550 | R$70.550 | R$85.870 | R$69.070 | R$1.480 |
| Abr | R$81.800 | R$12.900 | R$73.520 | R$11.060 | R$1.840 |

Clientes ativos: 47 (32 Completo, 13 Financeira, 2 Marketing)
MRR: R$81.800

---

## FLUXO COMPLETO DA OPERAÇÃO

Tráfego (campanha) → lead WhatsApp Trindade (Prospecta CRM)
→ Webhook → lead criado no /sdr automaticamente
→ Trindade trabalha no /sdr (meta: 30 leads/10 reuniões/3 conversões)
→ "Enviar p/ Comercial" → pipeline_closer + notifica Guilherme
→ Guilherme fecha no /comercial (meta: 20 reuniões/5 fechamentos/MRR R$10k)
→ "Ativar como cliente" → clínica criada + notifica Medina
→ Medina gerencia jornada D0-D90 no /cs + /jornada

---

## PENDÊNCIAS EM ORDEM DE PRIORIDADE

1. [ ] Tokens Wascript Trindade + Guilherme → integração bidirecional
2. [ ] Extension — corrigir credenciais hardcoded
3. [ ] Web — adicionar middleware de auth
4. [ ] Web — RLS Supabase
5. [ ] Web — páginas placeholder (Marketing, Academia, BI)
6. [ ] Inserir colaboradores reais no /operacao/colaboradores
7. [ ] Dados de Abril completos (planilha detalhada no Google Sheets)

---

## PROTOCOLO DE SESSÃO

### INÍCIO
Cole o conteúdo deste arquivo no chat antes de qualquer ação.

### DURANTE
Auto-save roda a cada 30min em background.

### FIM
cd ~/Desktop/excalibur/excalibur-hq && ./fim-sessao.sh
