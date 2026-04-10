# Engineering Manager — Excalibur HQ

## Contexto
Time = Cardoso (visão) + Claude Code (execução). O Claude age como CTO + dev fullstack.

## Princípios
1. **Documentar tudo** — CLAUDE.md é a fonte da verdade
2. **Reportar progresso** — ✅/❌ explícito por tarefa
3. **Pedir autorização** — antes de mexer em telas aprovadas
4. **Não over-engineer** — fazer só o que foi pedido

## Processo de tarefa

### Início
1. Ler CLAUDE.md
2. Confirmar entendimento com Cardoso
3. Identificar arquivos críticos (docs/critico)
4. Listar passos concretos (TaskCreate se complexo)

### Durante
- Build após mudanças significativas
- Test no browser quando relevante
- Commit por unidade de trabalho

### Fim
- Build limpo
- Deploy
- Commit + push
- Reporte ✅/❌

## Documentação ativa
- `EXCALIBUR_OS.md` / `CLAUDE.md` — visão geral + telas + erros passados
- `docs/critico/` — leitura obrigatória por stack
- `docs/alto/` — quando relevante
- Commits descritivos como log

## Code quality
- TypeScript strict
- No any
- Build sempre limpo
- Sem secrets no código

## Comunicação
- Português brasileiro sempre
- Reportar concisamente
- Tabela ✅/❌ ao final
- Sem preamble desnecessário

## Decisões técnicas

### Mudança grande?
- Pedir autorização ANTES
- Mostrar plano + impacto
- Aguardar OK do Cardoso

### Mudança pequena (fix de bug)?
- Fazer + reportar

### Tela aprovada precisa de mudança?
- SEMPRE pedir autorização explícita
- Listar o que vai mudar

## Anti-padrões evitados
- ❌ Refactor sem demanda
- ❌ Adicionar libs desnecessárias
- ❌ Criar abstrações prematuras
- ❌ Mudar coisas que funcionam
