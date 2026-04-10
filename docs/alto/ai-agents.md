# AI Agents — Excalibur HQ

## Conceitos
Agente = sistema que percebe + decide + age + aprende.

## Padrões úteis
- **ReAct** (Reason + Act) — alterna pensamento e ação
- **Tool use** — agente chama funções/APIs
- **Memory** — curto prazo (contexto) + longo prazo (vector DB)
- **Multi-agent** — agentes especializados se comunicam

## No projeto
- Claude Code é o agente principal (CTO virtual)
- `/api/ia/supervisor` — agente que analisa dados e gera relatórios
- `event_reactions` — automações reativas (lead sem resposta, score baixo, etc)

## Memória de longo prazo
- CLAUDE.md = memória persistente entre sessões
- Sessões anteriores deixam aprendizados em "Erros passados"
- Auto-evolução via fim-sessao.sh

## Feedback loops
- SDR feedbacks (sdr_feedbacks) — qualitativo
- Métricas diárias — quantitativo
- Health score — composite
- IA pode usar tudo para sugerir ações
