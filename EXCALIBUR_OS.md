# ⚔️ EXCALIBUR OS v4.0 — DOCUMENTO MASTER
# Versão: 4.0 | CEO: Matheus Cardoso | Atualizado: 09/04/2026

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

## USUÁRIOS DO HQ — SENHAS DEFINITIVAS

| Nome | Email | Senha | Role | Tela padrão |
|---|---|---|---|---|
| Cardoso (CEO) | contato.cardosoeo@gmail.com | 123456 | admin | /dashboard |
| Luana | luanacaira.excalibur@gmail.com | 123456 | admin | /dashboard |
| Medina | brunomedina.contato@gmail.com | 123456 | cs | /cs |
| Guilherme | guilherme.excalibur@gmail.com | 123456 | closer+cmo | /comercial |
| Trindade | trindade.excalibur@gmail.com | 123456 | sdr | /sdr |

IMPORTANTE: Supabase exige mínimo 6 caracteres. Senha padrão = 123456

---

## 🔵 EXCALIBUR HQ — TELAS APROVADAS (NÃO TOCAR)

### Dashboards
- /dashboard — Funil consolidado Tráfego→SDR→Closer→CS com KPIs reais
- /ceo — Receita, funil, crescimento, MRR, gargalos, status dos times
- /coo — Visão operacional
- /financeiro — Receita, MRR, cobrança

### SDR — Trindade ✅
- /sdr — Kanban 5 colunas + metas (30 leads/10 reuniões/3 conversões) + modal + badges WA
- Metas do mês com barras de progresso
- Botão "Enviar p/ Comercial" → pipeline_closer + notifica Guilherme
- Integração Prospecta CRM via webhook

### Comercial — Guilherme (Closer) ✅
- /comercial — Pipeline 4 colunas + metas + comissão dourada (10%)
- Planos: Starter R$997 / Pro R$1.997 / Enterprise R$3.997
- Metas: 20 reuniões / 5 fechamentos / MRR R$10k
- "Ativar como cliente" → cria clínica + notifica Medina

### Tráfego — Guilherme (CMO) ✅ RECÉM ATUALIZADO
- /trafego — BI Comercial completo
- Funil horizontal: Leads→Agend→Reuniões→Qualif→Fechamentos→Faturamento
- Cores automáticas por regra (verde/amarelo/vermelho)
- Diagnóstico automático de gargalo + ações prescritas
- 3 metas operacionais: Mínima R$74k / Normal R$90k / Super Meta R$106k
- Métricas diárias com meta fixa 10 reuniões/dia
- Filtro período estilo Meta Ads (Hoje/7d/14d/30d/Mês/Personalizado)
- Dados automáticos puxam do SDR + Closer (Guilherme só insere invest+leads)
- 2 abas: 📊 BI Comercial | 📋 Planilha Diária
- Banner alerta: "Preencha sua planilha diária!"
- Aviso CEO: quem não preencheu hoje

Baseline histórico (imutável):
- CPL: R$10,68 | Agendamento: 35,25% | Comparecimento: 71,30%
- Qualificação: 82,56% | Conversão: 24,09% | CAC: R$188,94

Regras de cores:
- Agendamento: ≥35% verde / 30-34% amarelo / <30% vermelho
- Comparecimento: ≥70% verde / 65-69% amarelo / <65% vermelho
- Qualificação: ≥75% verde / 65-74% amarelo / <65% vermelho
- Conversão: ≥24% verde / 20-23% amarelo / <20% vermelho
- CAC: ≤200 verde / 201-300 amarelo / >300 vermelho
- CPL: ≤12 verde / 13-15 amarelo / >15 vermelho

### CS — Medina ✅ (MAIS IMPORTANTE — NÃO MEXER)
- /cs — Cockpit lista acionável por prioridade
- /clientes — Base completa com filtros e visão de gestão
- /jornada — Painel macro de TODOS os clientes (4 fases clicáveis)
- /jornada/[id] — Kanban individual D0-D90
- /alertas — Alertas que geram obrigação de ação

Jornada D0-D30 (aprovada):
- D1-D7: Setup + alinhamento (onboarding, briefing, campanha)
- D7-D15: Início operação + primeiros dados (funil, gargalo)
- D15-D30: Ajuste + validação + valor (reunião D15, consolidação)
Marcos: D7, D15, D30 — reuniões obrigatórias
Gargalos: Marketing / Atendimento / Conversão / Adoção

### Sistema ✅
- /dashboard — Funil consolidado real
- Notificações cross-setor (badge 🔔)
- /crm (Prospecta CRM) — webhook receptor + log
- /ia/supervisor — Agente Claude que analisa dados
- /ia/reactions — Event reactions automáticas
- /observabilidade — Monitoramento
- /admin/usuarios — Gestão de colaboradores

---

## 🔵 BANCO DE DADOS (Supabase)

### Usuários
- usuarios_internos — roles text[], nome, email, role, ativo

### CS
- clinicas, tarefas_jornada, jornada_clinica
- alertas_clinica, adocao_clinica, funil_diario

### Comercial B2B
- leads_sdr — com campanha_id, historico_wa, etiqueta_wa, usuario_wa
- pipeline_closer — com historico_wa, ultimo_contato_wa
- metas_sdr, metas_closer
- campanhas_trafego, leads_trafego_diario

### BI Tráfego (NOVO)
- funil_comercial — dados mensais do funil (inserção manual)
- funil_trafego_diario — dados diários por pessoa
- metas_comercial — 3 tiers (mínima/normal/super)
- baseline_comercial — histórico imutável

### Sistema
- notificacoes_hq — notificações cross-setor
- prospecta_webhooks_log — log webhooks Prospecta CRM

---

## 🔌 INTEGRAÇÕES

### Supabase
URL: https://hluhlsnodndpskrkbjuw.supabase.co
DB: (connection string em .env.local — não commitar)
Vercel token: (em .env.local — não commitar)

### Wascript API (Prospecta CRM white label)
Base: https://api-whatsapp.wascript.com.br
Docs: https://api-whatsapp.wascript.com.br/api-docs/
Endpoints:
- POST /api/enviar-texto/{token}
- POST /api/modificar-etiquetas/{token}
- POST /api/criar-nota/{token}
- GET /api/listar-etiquetas/{token}
- POST /api/enviar-audio/{token}
- POST /api/enviar-imagem/{token}
- POST /api/enviar-video/{token}
- POST /api/enviar-documento/{token}
PENDENTE: tokens Trindade + Guilherme

### Webhook Prospecta CRM
URL: https://excalibur-hq.vercel.app/api/crm/webhook
Configurar no Prospecta: URL + Dados do Evento + Numero + Nome + Etiqueta + Usuario Logado

### N8N
Webhooks para automações complexas (integrado)

### Claude API
Modelo: claude-sonnet-4-20250514
Usado em: /ia/supervisor + análise de conversa na extension

---

## 🟢 EXCALIBUR WEB — STATUS

Telas funcionais: Login, Dashboard, CRM, Pacientes, Agenda, Financeiro,
Oportunidades, Propostas, Vendas, Funil, Jornada, CRM WhatsApp, Integrações

Pendências críticas:
- Middleware de auth inexistente
- RLS Supabase ainda permissivo (MVP)
- Páginas placeholder: Marketing, Academia, BI completo

---

## 🟡 EXCALIBUR EXTENSION — STATUS

Extensão Chrome injetada no WhatsApp Web
- 89 respostas rápidas em 15 categorias
- Motor de fluxos automático
- Análise IA via Claude
- Sync Supabase a cada 5min

Pendências:
- Credenciais hardcoded (segurança)
- Sem sistema de login próprio

---

## FLUXO COMPLETO DA OPERAÇÃO

Tráfego (campanha) → lead WhatsApp Trindade (Prospecta CRM)
→ Webhook → lead criado no /sdr automaticamente
→ Trindade trabalha no /sdr
→ "Enviar p/ Comercial" → pipeline_closer + notifica Guilherme
→ Guilherme fecha no /comercial
→ "Ativar como cliente" → clinica criada + notifica Medina
→ Medina gerencia jornada D0-D90

---

## PENDÊNCIAS EM ORDEM DE PRIORIDADE

1. [ ] Tokens Wascript Trindade + Guilherme → integração bidirecional
2. [ ] Extension — corrigir credenciais hardcoded
3. [ ] Web — adicionar middleware de auth
4. [ ] Web — RLS Supabase
5. [ ] Web — páginas placeholder (Marketing, Academia, BI)

---

## PROTOCOLO DE SESSÃO

### INÍCIO
Cole o conteúdo deste arquivo no chat antes de qualquer ação.

### DURANTE
Auto-save roda a cada 30min em background (auto-save.sh).

### FIM
cd ~/Desktop/excalibur/excalibur-hq && ./fim-sessao.sh
