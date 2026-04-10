# EXCALIBUR_OS — CLAUDE.md
> Arquivo lido automaticamente pelo Claude Code a cada sessão.
> Última atualização: 2026-04-10

---

## 🚨 REGRAS ABSOLUTAS — LEIA ANTES DE QUALQUER COISA

1. NUNCA alterar telas aprovadas pelo CEO sem autorização explícita
2. NUNCA fazer mais do que foi pedido — apenas o que foi solicitado
3. SEMPRE fazer build + deploy + commit ao final de cada tarefa
4. SEMPRE perguntar antes de mexer em algo que já funciona
5. NUNCA misturar projetos: excalibur-hq ≠ excalibur-web ≠ excalibur-extension
6. SEMPRE responder em português brasileiro (preferência do CEO)
7. NUNCA commitar secrets (.env, tokens, senhas) — verificar diff antes

---

## ⚡ COMANDOS RÁPIDOS

```bash
# Build e deploy (token em .env.local — NUNCA commitar)
cd ~/Desktop/excalibur/excalibur-hq
npm run build
npx vercel --prod --token "$VERCEL_TOKEN"

# Commit padrão
git add -A && git commit -m "feat/fix: descrição" && git push

# Fim de sessão
./fim-sessao.sh

# Banco de dados (via node + pg)
node -e "const {Client}=require('pg');const c=new Client({connectionString:'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres'});c.connect().then(async()=>{const r=await c.query('SELECT 1');console.log(r.rows);await c.end()})"
```

---

## 🏗️ ARQUITETURA DO PROJETO

- **Stack:** Next.js 16 + React 19 + Supabase + Tailwind 4 + Claude API
- **Deploy:** Vercel (excalibur-hq.vercel.app)
- **Repo:** ~/Desktop/excalibur/excalibur-hq
- **Supabase URL:** https://hluhlsnodndpskrkbjuw.supabase.co
- **Credenciais:** em .env.local (NUNCA commitar)

---

## 👥 USUÁRIOS DO SISTEMA

| Nome | Email | Senha | Role | Tela inicial |
|---|---|---|---|---|
| Cardoso (CEO) | contato.cardosoeo@gmail.com | 123456 | admin | /ceo |
| Luana | luanacaira.excalibur@gmail.com | 123456 | admin | /ceo |
| Medina | brunomedina.contato@gmail.com | 123456 | cs | /cs |
| Guilherme | guilherme.excalibur@gmail.com | 123456 | closer+cmo | /comercial |
| Trindade | trindade.excalibur@gmail.com | 123456 | sdr | /sdr |

Senha mínima Supabase: 6 caracteres. Padrão atual: `123456`.

---

## 🔒 TELAS APROVADAS PELO CEO — NÃO ALTERAR

Estas telas foram validadas e aprovadas. Qualquer alteração visual ou estrutural requer autorização explícita. Apenas adicionar funcionalidades quando solicitado, NUNCA modificar o que já existe.

| Tela | O que tem | Status |
|---|---|---|
| /ceo | Dashboard CEO — receita, MRR, metas, projeção, caixa, comparativo (TELA INICIAL ADMIN) | ✅ APROVADO |
| /coo | Visão operacional — pipeline, gargalos, SLAs | ✅ APROVADO |
| /sdr | Métricas SDR + filtros período + valor vendas + 10 etapas ACL + rotina + feedback | ✅ APROVADO |
| /sdr/feedbacks | Feedback diário do Trindade (humor + 4 campos) | ✅ APROVADO |
| /comercial | Pipeline 4 colunas + comissão 10% | ✅ APROVADO |
| /trafego | BI Comercial completo + baseline + gargalos automáticos | ✅ APROVADO |
| /cs | Painel CS — 5 abas, auto-refresh 60s, ações prioritárias | ✅ APROVADO |
| /clientes | Base completa de clínicas | ✅ APROVADO |
| /jornada | Painel macro de todos os clientes | ✅ APROVADO |
| /jornada/[id] | Kanban D0-D90 com 22 tarefas | ✅ APROVADO |
| /alertas | Alertas automáticos | ✅ APROVADO |
| /financeiro | Dashboard financeiro CEO | ✅ APROVADO |
| /operacao/financeiro | 3 abas: A Receber, A Pagar, Resumo | ✅ APROVADO |
| /operacao/colaboradores | CRUD colaboradores | ✅ APROVADO |
| /cs/calendario | Calendário semanal de tarefas | ✅ APROVADO |
| /onboarding/novo | Novo cliente 3 etapas | ✅ APROVADO |
| /admin/usuarios | CRUD usuarios + alterar senha | ✅ APROVADO |

**Telas removidas:** /dashboard (deletada — cada role vai direto pra sua tela), /visao-geral (não no menu)

### Rotas padrão por role (login)
- admin → /ceo
- cs → /cs
- sdr → /sdr
- closer → /comercial
- cmo → /trafego
- financeiro → /financeiro

---

## 🗄️ BANCO DE DADOS — TABELAS EXISTENTES

Principais tabelas (NÃO recriar, NÃO dropar):

### Usuários e auth
- `usuarios_internos` — roles[], nome, email, ativo

### CS / Clientes
- `clinicas` — clínicas ativas (47 reais + 1 demo)
- `jornada_clinica` — etapa, dias_na_plataforma, data_inicio, cs_responsavel
- `tarefas_jornada` — 22 tarefas D0-D30 por clínica (fase, bloqueante, prazo_dia)
- `alertas_clinica` — alertas com nivel
- `adocao_clinica` — score semanal
- `funil_diario` — faturamento diário por clínica
- `log_atividades_cs` — histórico de contatos CS

### SDR / Comercial
- `leads_sdr` — leads do Trindade (com historico_wa, etiqueta_wa)
- `pipeline_closer` — propostas do Guilherme
- `metas_sdr` — meta_leads, meta_agendamentos, meta_comparecimentos, meta_vendas
- `metas_closer` — meta_reunioes, meta_fechamentos, meta_mrr, comissao_pct
- `sdr_metricas_diarias` — métricas diárias do Trindade (manual)
- `sdr_feedbacks` — feedbacks diários
- `campanhas_trafego` — campanhas de tráfego
- `funil_trafego_diario` — métricas diárias de tráfego

### Financeiro
- `financeiro_receber` — A Receber (200+ registros Jan-Abr 2026)
- `financeiro_pagar` — A Pagar (236+ registros Jan-Abr 2026)
- `financeiro_colaboradores` — colaboradores fixos
- `financeiro_mensal` — resumo mensal (4 meses populados)
- `clientes_hq` — 47 clientes ativos com fase, score, mrr

### Sistema
- `notificacoes_hq` — notificações cross-setor
- `prospecta_webhooks_log` — webhooks recebidos
- `event_reactions` — 8 regras de automação (NÃO mexer)
- `preenchimento_diario` — log de quem preencheu planilha

---

## 💼 PLANOS DOS CLIENTES (DEFINITIVOS — NÃO ALTERAR)

| Pacote | Valor mensal |
|---|---|
| Completo (sem fidelidade) | R$3.500 |
| Completo (90 dias garantia) | R$3.000 |
| Apenas Marketing | R$1.500 |
| Apenas Financeira | R$1.000 |

---

## 📋 CONTEXTO DE CADA SETOR

### SDR — Trindade
- Usa **ACL (Wascript / Prospecta CRM)** como CRM externo — NÃO tem CRM interno no HQ
- 10 etapas do ACL em ordem de prioridade:
  1. **Confirmação (8H — crítico)** — confirmar reuniões do dia ANTES de qualquer coisa
  2. Recepção
  3. Agendamento
  4. Qualificação
  5. Explicação
  6. Reagendar
  7. Sem CNPJ
  8. Futuro
  9. Lista Fria
  10. Fora do CP
- Cada etapa tem fluxo automático. Se não responder: follow-up 1 (mesmo dia) → follow-up 2 (dia seguinte)
- Metas mensais: **300 leads / 90 agendamentos / 54 comparecimentos / 3 vendas**
- Métricas lançadas manualmente em /sdr (input às 17h)
- Feedback diário visível em /sdr/feedbacks

### Comercial — Guilherme (Closer)
- Pipeline 4 colunas: Reunião Agendada → Proposta Enviada → Fechado → Perdido
- **Comissão: 10% do MRR fechado**
- Metas: 20 reuniões / 5 fechamentos / R$10k MRR por mês

### Tráfego — Guilherme (CMO)
- BI com **baseline histórico imutável**: CPL R$10,68 / Agendamento 35,25% / Comparecimento 71,30% / Qualificação 82,56% / Conversão 24,09% / CAC R$188,94
- 3 metas: Mínima R$74k / Normal R$90k / Super R$106k
- Filtro período estilo Meta Ads
- Planilha diária obrigatória no fim do turno
- Regras de cores automáticas por métrica (verde/amarelo/vermelho)

### CS — Medina
- Jornada D0-D30 com 22 tarefas por clínica
- **Marcos bloqueantes: D7, D15, D30** (reuniões obrigatórias)
- Gargalos classificados: Marketing / Atendimento / Conversão / Adoção
- Log de atividades por clínica (`log_atividades_cs`)
- Calendário semanal de tarefas em /cs/calendario

### Financeiro — admin (Cardoso/Luana)
- Dados Jan-Abr 2026 importados da planilha Google Sheets
- A Receber: 200 registros / R$342.200
- A Pagar: 236 registros / R$335.107
- Tipos normalizados: prolabore, colaborador, ferramenta, marketing, aluguel, outro
- Acesso: admin apenas

---

## 🔌 INTEGRAÇÕES

### Supabase
URL: https://hluhlsnodndpskrkbjuw.supabase.co
Credenciais em .env.local (NUNCA commitar)

### WaScript API (Prospecta CRM white label)
Base: https://api-whatsapp.wascript.com.br
Webhook receptor: https://excalibur-hq.vercel.app/api/crm/webhook
**PENDENTE:** tokens individuais do Trindade e Guilherme

### Claude API
Modelo: claude-sonnet-4-20250514
Usado em: /ia/supervisor + extensão Chrome

### N8N
Webhooks para automações complexas (integrado em excalibur-app)

---

## 📦 APIs EXISTENTES (NÃO RECRIAR)

### CS
- `/api/cs/painel` — dashboard consolidado CS
- `/api/cs/cockpit` — cockpit CS com clínicas e alertas
- `/api/cs/lista` — lista completa de clínicas
- `/api/cs/log` — log de atividades por clínica
- `/api/cs/tarefas-semana` — tarefas por semana para calendário
- `/api/cs/registrar-contato` — registrar interação CS

### Financeiro
- `/api/financeiro/receber` — A Receber CRUD
- `/api/financeiro/pagar` — A Pagar CRUD
- `/api/financeiro/resumo` — cálculos de caixa
- `/api/financeiro/colaboradores` — CRUD colaboradores
- `/api/hq/financeiro` — dashboard financeiro CEO

### SDR
- `/api/sdr/metricas` — métricas diárias SDR (com filtro período)
- `/api/sdr/feedbacks` — feedbacks do Trindade
- `/api/sdr/stats` — stats resumidas
- `/api/sdr/leads` — CRUD leads SDR

### Comercial
- `/api/comercial/pipeline` — pipeline closer
- `/api/comercial/stats` — stats do pipeline
- `/api/comercial/ativar` — fechar lead → criar clínica

### CEO / Visão Geral
- `/api/ceo/dashboard` — dashboard CEO completo (dados reais)
- `/api/dashboard` — funil consolidado
- `/api/hq/coo` — dashboard COO

### Tráfego
- `/api/trafego/funil` — dados de funil
- `/api/trafego/metas` — metas comerciais

### Sistema
- `/api/busca` — busca global
- `/api/preenchimento` — planilha diária
- `/api/notificacoes` — cross-setor
- `/api/crm/webhook` — receptor Prospecta CRM
- `/api/wascript/send` — envio WhatsApp
- `/api/admin/usuarios` — CRUD usuários (com alterar senha)

---

## ❌ ERROS PASSADOS — NÃO REPETIR

1. **Implementar mais do que foi pedido** — Sempre confirmar o escopo antes de começar. Se o usuário pediu X, fazer só X.
2. **Alterar layout de telas aprovadas** — Quando pedido para adicionar funcionalidade, APENAS adicionar, nunca modificar o existente.
3. **Deletar dados reais junto com seeds** — `jornada_clinica` e `tarefas_jornada` são DADOS REAIS, nunca deletar em limpezas.
4. **Mudar rotas/navegação sem autorização** — Qualquer mudança de rota padrão ou sidebar requer aprovação explícita.
5. **Commitar secrets** — Sempre verificar o diff antes do commit. Tokens, senhas e connection strings vão em .env.local.
6. **Reescrever do zero quando o usuário pediu otimização** — "otimizar" ≠ "reescrever". Manter o que funciona, melhorar o resto.
7. **Confundir excalibur-hq com excalibur-web** — São projetos DIFERENTES com bancos diferentes. Sempre verificar o diretório.
8. **NÃO RECRIAR /dashboard** — A página `/dashboard` foi DELETADA DEFINITIVAMENTE. Cada role tem sua tela específica (admin → /ceo, sdr → /sdr, cs → /cs, closer → /comercial, cmo → /trafego). NUNCA recriar `/dashboard`. NUNCA referenciar `/dashboard` em links, redirects ou menus. Se algum código antigo apontar pra `/dashboard`, atualizar para a tela do role correto.

---

## 🔄 PROTOCOLO DE SESSÃO

### Início
1. Ler este arquivo completo
2. Confirmar com o usuário o que será feito antes de começar
3. Se for mexer em tela aprovada, pedir autorização explícita

### Durante
- Auto-save roda a cada 30min em background
- Build + teste antes de qualquer deploy
- Reportar ✅/❌ para cada tarefa concluída
- Preferir editar arquivos existentes a criar novos

### Fim
```bash
cd ~/Desktop/excalibur/excalibur-hq && ./fim-sessao.sh
```

---

## 🚀 PRÓXIMAS TAREFAS (backlog)

- [ ] Tokens Wascript — Trindade e Guilherme (pendente deles)
- [ ] Automatizar `sdr_metricas_diarias` (parar input manual, usar leads_sdr)
- [ ] Integrar Meta Ads + Google Ads APIs
- [ ] Sistema de alterar senha do próprio usuário (não admin)

---

## 📚 BASE DE CONHECIMENTO — /docs/

Roadmaps técnicos organizados em 4 níveis. O Claude Code DEVE ler o arquivo relevante antes de executar qualquer tarefa.

### Estrutura
```
docs/
├── INDEX.md              — índice geral
├── critico/ (14 arquivos) — leitura obrigatória por tarefa
├── alto/    (13 arquivos) — leitura quando relevante
├── medio/   README.md    — referência futura
└── futuro/  README.md    — base expandida
```

### Regra de leitura
- Tarefa de frontend/página → `docs/critico/nextjs.md` + `docs/critico/react.md`
- Tarefa de banco → `docs/critico/postgresql.md` + `docs/critico/supabase.md`
- Tarefa de API → `docs/critico/api-design.md`
- Tarefa de UX/visual → `docs/critico/ux-design.md` + `docs/critico/design-system.md`
- Qualquer tarefa → ler `docs/INDEX.md` primeiro

### Auto-evolução
1. Claude Code lê CLAUDE.md + docs/ relevante
2. Executa com nível técnico superior
3. `fim-sessao.sh` atualiza CLAUDE.md com o que aconteceu
4. Próxima sessão começa mais inteligente
5. Ao longo do tempo: docs/ pode ser expandido com novos aprendizados

### Como expandir a base
Quando surgir um novo tema técnico:
1. Criar `docs/[nivel]/[tema].md`
2. Adicionar ao `docs/INDEX.md`
3. Referenciar no CLAUDE.md
