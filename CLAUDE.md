# Excalibur HQ — Sistema Operacional Interno v3.0
> Arquivo lido automaticamente pelo Claude Code a cada sessão.
> Última atualização: 2026-04-12 (v3.0)

## Stack
Next.js 16 + React 19 + Supabase + Tailwind 4 + shadcn/ui + Magic UI
Repo: ~/Desktop/excalibur/excalibur-hq

## Ambientes (REGRA OBRIGATÓRIA)
| Ambiente | Branch | URL | Quem usa |
|----------|--------|-----|----------|
| PRODUCTION | `main` | https://excaliburhq.com.br | Toda equipe (Trindade, Guilherme, Medina, etc.) |
| STAGING | `staging` | https://staging.excaliburhq.com.br | Só CEO + Claude (teste) |

### Fluxo de desenvolvimento
1. **NUNCA** commitar direto na `main` — sempre trabalhar na `staging`
2. Push na `staging` → deploy automático em staging.excaliburhq.com.br
3. CEO testa e aprova → merge `staging` → `main`
4. Deploy automático em excaliburhq.com.br (produção)

### Comandos
```bash
# Ir pra staging e trabalhar
git checkout staging

# Quando terminar a feature
git push

# Quando CEO aprovar: merge pra main
git checkout main && git merge staging && git push
```

## Credenciais
Vercel token: ver .env.local (VERCEL_TOKEN)
Vercel project ID: prj_8VnzsviMnc1v3YCNCcf9gYAMTu4C
DB: postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres

## Usuários (todos: excalibur10)
| Nome | Email | Roles | Tela inicial |
|---|---|---|---|
| Matheus Cardoso (CEO) | contato.cardosoeo@gmail.com | admin, closer | /ceo |
| Luana Caira | luanacaira.excalibur@gmail.com | coo | /coo |
| Bruno Medina | brunomedina.contato@gmail.com | cs | /cs |
| Guilherme | guilherme.excalibur@gmail.com | closer, cmo | /comercial |
| Trindade | trindade.excalibur@gmail.com | sdr | /sdr |
| Jéssica | jessica.excalibur@gmail.com | head_traffic | /trafego-clientes |
| Vinicius | vinicius.excalibur@gmail.com | designer | /design |
| Juan | juan.excalibur@gmail.com | editor_video | /design |

## Rotas em produção
Dashboards: /ceo /coo /financeiro /comercial /trafego /sdr /cs
Operação: /clientes /jornada /trafego-clientes /cs/calendario /onboarding/novo /operacao/financeiro /operacao/colaboradores /alertas /design
Sistema: /escritorio /eventos /admin/usuarios /admin/metas /admin/comissoes /sdr/feedbacks /sistema/apis /sistema/webhooks
Dinâmica: /jornada/[id] /clientes/[id]

## APIs principais
### Core
/api/hq/alertas /api/hq/eventos /api/admin/usuarios /api/busca /api/notificacoes /api/onboarding-colaborador

### Financeiro
/api/financeiro/resumo /api/financeiro/receber /api/financeiro/pagar /api/financeiro/colaboradores /api/ceo/dashboard

### Comercial / SDR / Tráfego
/api/comercial/stats /api/comercial/pipeline
/api/sdr/metricas /api/sdr/feedbacks /api/trafego/funil

### CS
/api/cs/painel /api/cs/cockpit /api/cs/registrar-contato /api/jornada

### Tráfego Clientes (setor da Jéssica)
/api/trafego-clientes/overview /api/trafego-clientes/clinicas /api/trafego-clientes/gestores
/api/trafego-clientes/metricas /api/trafego-clientes/setup /api/trafego-clientes/otimizacao
/api/trafego-clientes/relatorio-semanal /api/trafego-clientes/historico /api/trafego-clientes/vinculo

### Escritório 2D
/api/escritorio/presenca

## Banco — tabelas principais
clinicas, jornada_clinica, adocao_clinica, tarefas_jornada
metricas_sdr, pipeline_closer, funil_trafego, metas_closer
alertas_clinica, eventos_hq, onboarding_colaborador
escritorio_presenca, usuarios_internos
gestores_trafego, trafego_clinica, trafego_metricas
trafego_alertas, trafego_setup, trafego_otimizacoes

## Dados reais (Abril 2026)
MRR: ~R$84.800 | Caixa: R$4.340 | Recebido: R$15.400
Clínicas ativas: 48 | Score CS médio: 68
Fechamentos comercial: 5 | Reuniões: 8 | MRR mês: R$12.000
SDR leads: 90 | Tráfego clientes: 10/48 configuradas | CPL médio: R$18,56

## Hierarquia CS + Tráfego Clientes
Cardoso (CEO) → Medina (CS) → Jéssica (Head Traffic) → Gestores → Clínicas
Jéssica gerencia tráfego pago das 48 clínicas odontológicas clientes

## Sistemas especiais
- TitleSync.tsx: títulos via MutationObserver client-side (não Next.js metadata)
- Escritório 2D: canvas tile-based 38x28, WASD, Supabase Realtime (postgres_changes)
- Onboarding colaborador: 3 estados (tutorial→check→lembrete) por role
- AcaoHoje: card de ação diária por role (só após tutorial dispensado, checa 3 chaves)
- Alertas dinâmicos: health_score + aviso_prévio + caixa_critico
  Regras: dias_na_plataforma > 7, máximo 5 por tipo, banner "9+" se > 9
- Tráfego clientes (12 melhorias v2): setup 5 etapas, score 0-100,
  benchmarks BR (CPL R$8-20), funil completo (agendamentos/comparec/fech/receita/ROI/CAC),
  sparkline 7d, comparativo MoM, calendário otimizações, drawer histórico,
  alerta velocidade resposta, especialidades, mapa de cobertura
- adocao_clinica.score é GENERATED COLUMN (não pode UPDATE direto, set os booleans)

## Magic UI (em components/ui/)
number-ticker, border-beam, blur-fade, shimmer-button,
animated-shiny-text, animated-list, confetti
Instalar: npx shadcn@latest add @magicui/[nome]
NÃO USAR: DaisyUI, Park UI, JollyUI

## Comandos
```bash
cd ~/Desktop/excalibur/excalibur-hq
npm run build
npm test                # vitest run contra prod
npx vercel --prod --token "$VERCEL_TOKEN"   # token em .env.local
git add -A && git commit -m "msg" && git push
```

## Identidade visual — LEI MÁXIMA
Modo Dark sempre · bg-gray-950 · cards bg-gray-900/800
Accent amber-500 · hover amber-400 · border-gray-700/800
Sucesso green-500 · Erro red-500 · Fonte Geist · Ícone ⚔️ · rounded-xl

## Erros para nunca repetir
1. Pedir permissão pra editar arquivos do projeto
2. Commit direto na main sem mensagem
3. Modificar .env sem avisar
4. Apagar dados reais do Supabase
5. Usar `any` em TypeScript
6. Declarar tarefa concluída sem validar build
7. Instalar libs incompatíveis (DaisyUI, Park UI)
8. Confundir SSR HTML com DOM client-side ao verificar títulos
9. Reportar como entregue antes do deploy chegar
10. Alertas sem limite por clínica (gerou 52 antes do filtro)
11. Comercial zerado por `.single()` no metas_closer derrubando Promise.all (corrigido v2.0)
12. Score CS zerado — adocao_clinica.score é GENERATED (atualizar booleans, não score)
13. Login quebrado após mudança de hash — sempre testar auth após deploy
14. Dados sujos no campo `nome` de `clinicas` (valores monetários, datas) — limpos v2.0
15. AcaoHoje + Tutorial aparecendo juntos na 1ª visita — checar `tutorial_visto`
16. setInterval pra presence quando deveria ser Supabase Realtime
17. `repeat(N, 1fr)` em grids causa overflow — usar `repeat(N, minmax(0, 1fr))`
