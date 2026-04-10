# Testing — Excalibur HQ

## Estado atual
O projeto NÃO tem testes automatizados ainda. Validação é manual + build + Playwright MCP.

## Estratégia atual
1. **Build** — `npm run build` antes de cada deploy (TypeScript check)
2. **Manual** — testar no browser após deploy
3. **Playwright MCP** — quando necessário, usar para validar visualmente

## Como testar com Playwright MCP
```
mcp__playwright__browser_navigate(url)
mcp__playwright__browser_fill_form([...])
mcp__playwright__browser_click(ref)
mcp__playwright__browser_snapshot()
```

Sempre usar perfil "Matheus" do Chrome (já tem sessões logadas).

## Quando adicionar testes (futuro)
1. **Unit tests** — funções puras (helpers, formatters)
   - Vitest + React Testing Library
2. **Integration tests** — APIs
   - Vitest + supertest ou Playwright API
3. **E2E** — fluxos críticos
   - Playwright (login → ação → verificação)

## Fluxos críticos para testar (futuro)
- Login → /ceo carrega corretamente
- SDR lança métricas → aparece no dashboard
- CS marca contato → log atualiza
- Financeiro: marca como pago → caixa atualiza

## Validação atual após cada mudança
1. `npm run build` — TypeScript + bundling ok
2. `npx vercel --prod` — deploy
3. Testar manualmente no browser
4. Verificar APIs com curl se necessário

## Princípios
- Build limpo é o mínimo
- Validar visual antes de declarar concluído
- Reportar ✅/❌ explicitamente
