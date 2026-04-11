# Migração Cultural HQ-only — Playbook

Iniciativa estratégica do CEO (Cardoso) — ativada 2026-04-11.
Objetivo: **100% da operação da Excalibur dentro do Excalibur HQ**. Sem WhatsApp como CRM, sem planilha Google, sem agenda paralela.

## Nível: DURO (decisão do CEO)

A culture change não é por convite. É por regra:

- **Venda fora do Kanban** (/comercial) → **sem comissão** para o closer
- **Lead fora do CRM** (/sdr) → não conta na meta do SDR
- **Contato CS fora do sistema** → não conta health score
- **Score de adoção HQ-only < 50** → 1:1 obrigatória com Luana na segunda seguinte
- **Cardoso dá o exemplo**: responde tudo no HQ por 14 dias. Quem pergunta no WhatsApp recebe "manda no HQ".

## Arquitetura (implementada)

### Tabelas novas
```
migracao_diagnostico    — 5 perguntas por colaborador (uma vez)
checkin_diario          — usou_externo sim/não (por dia, por pessoa)
adocao_score_semanal    — cache do score por semana ISO
migracao_passos         — checklist de 6 passos por pessoa
importacao_log          — auditoria de cada import CSV
```

### Rotas
```
/migracao               — hub do colaborador (score, passos, CTA)
/migracao/diagnostico   — 5 perguntas iniciais (primeira vez)
/migracao/checkin       — checkin diário (obrigatório 1×/dia)
/importar               — hub de importação
/importar/leads         — SDR (Trindade)
/importar/pipeline      — Closer (Guilherme)
/importar/clinicas-trafego — Head Traffic (Jéssica)
/importar/contatos-cs   — CS (Medina)
/coo/migracao           — painel Luana com ranking + regras
```

### APIs
```
GET/POST /api/migracao/diagnostico?email=...
GET/POST /api/migracao/checkin?email=...
GET      /api/migracao/score?email=... OU ?todos=1
POST     /api/migracao/importacao-log
GET      /api/comercial/comissao       — regra DURO (bloqueia se não bater meta)
GET/POST /api/integrations/meta-ads    — scaffold (aguardando token)
```

## Score de adoção — como é calculado

Peso dos 6 passos:
1. **Diagnóstico** (15 pts) — 5 perguntas respondidas
2. **Importar dados** (20 pts) — ao menos 1 import via log
3. **Checkin 7 dias** (20 pts) — 7 dias de checkin, independente se usou externo
4. **Acesso 7 dias** (15 pts) — 7 dias úteis logado no HQ
5. **Zero externo 7d** (20 pts) — 7 dias sem marcar "usou ferramenta externa"
6. **Tutorial com CEO** (10 pts) — marcado manualmente pela Luana

**Penalidade:** cada dia com externo = −10 pts
**Bônus:** 5 dias HQ-only seguidos sem uso externo = +10 pts
**Limite:** score vai de 0 a 100

## Fluxo por colaborador

### Trindade (SDR)
1. `/migracao` → verifica se respondeu diagnóstico (se não, bloqueia visualmente)
2. `/importar/leads` → cola WhatsApp/planilha/CSV de leads
3. `/sdr` → lança métrica do dia (já hoje)
4. `/migracao/checkin` → respondeu "HQ only" ou "usou fora"

### Guilherme (Closer)
1. `/migracao` → diagnóstico
2. `/importar/pipeline` → deals abertos em CSV
3. `/comercial` → atualiza Kanban diário
4. `/migracao/checkin`
5. **Atenção**: `/api/comercial/comissao` só paga se `fechamentos_mes >= meta_fechamentos`

### Medina (CS)
1. `/migracao` → diagnóstico
2. `/importar/contatos-cs` → histórico de interações com clínicas
3. `/cs` → registra contatos do dia
4. `/migracao/checkin`

### Jéssica (Head Traffic)
1. `/migracao` → diagnóstico
2. `/importar/clinicas-trafego` → vincula 48 clínicas aos gestores
3. `/trafego-clientes` → lança métricas diárias
4. `/migracao/checkin`
5. **Integração Meta Ads**: quando Cardoso fornecer token, `/api/integrations/meta-ads` popula `trafego_metricas` automaticamente

### Luana (COO)
1. `/migracao` → diagnóstico (exemplo)
2. `/coo/migracao` → revisa score do time, identifica score < 50, agenda 1:1
3. `/migracao/checkin`

### Cardoso (CEO)
1. Responde diagnóstico como exemplo pro time
2. Por 14 dias, responde TUDO no HQ. Resposta padrão pra mensagem externa: "manda no HQ que eu vejo lá"
3. Acompanha `/coo/migracao` semanalmente

## Regra da comissão (DURO)

Closer (Guilherme) tem `metas_closer.meta_fechamentos` e `meta_mrr`.
`/api/comercial/comissao` retorna:
- `mrr_registrado` = soma de `pipeline_closer` com `status='fechado'` no mês
- `comissao_calculada` = `mrr_registrado * (comissao_pct/100)`
- `comissao_liberada` = `atingiu_meta ? comissao_calculada : 0`
- `atingiu_meta = fechamentos_mes >= meta_fechamentos`

Se a venda não está no pipeline_closer = não está em `mrr_registrado` = zero comissão.

## Integrações a plugar (pendente)

### Meta Ads API (Jéssica)
Env vars necessárias:
```bash
META_ADS_ACCESS_TOKEN=EAA...       # token longo prazo
META_AD_ACCOUNT_ID=act_XXXXXXXXXX  # ID da conta
```
Passos:
1. Criar app em developers.facebook.com
2. Solicitar `ads_read` + `ads_management`
3. Gerar token de longo prazo via `/oauth/access_token`
4. `vercel env add META_ADS_ACCESS_TOKEN production`
5. Rodar `POST /api/integrations/meta-ads` uma vez/dia (cron futuro)

Vinculação automática: quando `trafego_clinica.observacoes` contém o `account_id` do Meta, as métricas são upserted em `trafego_metricas` por `(clinica_id, data)`.

### Google Calendar (Medina/Jéssica)
Ainda não implementado. Quando for, adicionar `/api/integrations/google-calendar`.

## Monitoramento

Luana abre `/coo/migracao` toda segunda de manhã:
- Vê score médio da equipe
- Identifica quem está abaixo de 50
- Agenda 1:1 com cada um
- Pergunta: "o que falta no HQ pra você usar só ele?"
- Abre ticket pra Cardoso priorizar

## Sinais de sucesso (após 30 dias)

- Score médio equipe > 80
- 0 colaboradores com score < 50
- Painel `/trafego-clientes` mostra 48/48 clínicas configuradas
- `/sdr` mostra leads reais sendo lançados todos os dias
- `/comercial` Kanban tem movimento diário
- `/cs` tem contatos registrados todo dia
- Cardoso consegue tomar decisão olhando só o `/ceo`

## Quando parar essa iniciativa

Quando todos os colaboradores tiverem:
- Score > 85 por 4 semanas seguidas
- 0 checkins com "usou externo" por 14 dias
- Todos os dados históricos importados
- Todas as integrações plugadas (Meta Ads, Asaas ✅, Google Calendar)

Aí a iniciativa vira rotina. A página `/migracao` pode virar readonly (histórico) e a coluna da sidebar pode ser removida.
