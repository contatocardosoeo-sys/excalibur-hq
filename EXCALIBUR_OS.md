# EXCALIBUR OS — DOCUMENTO MASTER
Versao: 1.0 | CEO: Matheus Cardoso

## DOIS PROJETOS — NUNCA MISTURAR
- excalibur-hq → sistema interno Excalibur (FOCO ATUAL)
- excalibur-web → produto ERP para clinicas (PROXIMA FASE)

## USUARIOS HQ
| Nome | Email | Senha | Role |
|---|---|---|---|
| Cardoso | contato.cardosoeo@gmail.com | 123456 | admin |
| Luana | luanacaira.excalibur@gmail.com | 123456 | admin |
| Medina | brunomedina.contato@gmail.com | 123456 | cs |
| Guilherme | guilherme.excalibur@gmail.com | 123456 | closer+cmo |
| Trindade | trindade.excalibur@gmail.com | 123456 | sdr |

## TELAS APROVADAS — NAO MEXER SEM AUTORIZACAO CEO

### CS (Medina)
- /cs — cockpit lista acionavel por prioridade
- /clientes — base completa com filtros
- /jornada — painel carteira TODOS os clientes (macro)
- /jornada/[id] — kanban individual D0-D90
- /alertas — alertas automaticos

Jornada D0-D30:
- D1-D7: Setup + alinhamento (onboarding real)
- D7-D15: Inicio operacao + primeiros dados
- D15-D30: Ajuste + validacao + geracao de valor
Marcos: D7, D15, D30 — reunioes obrigatorias

### SDR (Trindade)
- /sdr — kanban 5 colunas + metas + modal novo lead
- Integracao: lead → comercial + notificacao Guilherme

### Comercial (Guilherme — Closer)
- /comercial — pipeline 4 colunas + metas + comissao

### Trafego (Guilherme — CMO)
- /trafego — campanhas B2B + KPIs + grafico

### Dashboard
- /dashboard — funil consolidado Trafego→SDR→Closer→CS

### Sistema
- Auth com roles[] multiplos
- Notificacoes cross-setor (badge)
- /crm — webhook Prospecta CRM

## API WASCRIPT (Prospecta CRM white label)
Base: https://api-whatsapp.wascript.com.br
Endpoints:
- POST /api/enviar-texto/{token}
- POST /api/modificar-etiquetas/{token}
- POST /api/criar-nota/{token}
- POST /api/enviar-audio/{token}
- POST /api/enviar-imagem/{token}
- POST /api/enviar-video/{token}
- POST /api/enviar-documento/{token}
- GET /api/listar-etiquetas/{token}
PENDENTE: tokens do Trindade e Guilherme

## PENDENCIAS
1. [ ] Tokens Wascript Trindade + Guilherme
2. [ ] Integracao bidirecional HQ <-> Prospecta CRM
3. [ ] /crm painel completo
4. [ ] Excalibur ERP (proxima fase)
