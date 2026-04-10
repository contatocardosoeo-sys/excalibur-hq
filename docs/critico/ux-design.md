# UX Design — Excalibur HQ

Sistema interno B2B. Usuários: Cardoso (CEO), Luana (admin), Medina (CS), Guilherme (closer+CMO), Trindade (SDR).

## Princípios do projeto

### 1. Densidade de informação
- Tela de operação tem MUITOS dados
- Use cards compactos, fonte pequena (10-13px)
- Monospace para números (alinhamento)

### 2. Cores semânticas
- Verde = bom / saudável / pago
- Amarelo = atenção / pendente
- Vermelho = crítico / atrasado / risco
- Azul = info / neutro
- Amber/dourado = ações principais (CTA)

### 3. Hierarquia clara
- KPIs no topo (visão rápida)
- Detalhes abaixo
- Ações sempre visíveis (não esconder em menus)

### 4. Feedback visual
- Loading state em todas as ações
- Toast após salvar
- Confirmação antes de deletar
- Empty states descritivos

## Padrões aprovados

### Sidebar
- 224px desktop, drawer mobile
- Toggle abrir/fechar
- Item ativo: amber + border-l-2
- Separadores entre seções

### KPIs
```
┌─────────────┐
│ icon LABEL  │
│ 22pt valor  │
│ 9pt subtext │
└─────────────┘
```

### Tabelas
- Header maiúsculo cinza
- Rows com hover sutil
- Última coluna para ações
- Empty state com ícone + msg

### Modais
- Overlay #000000cc
- Click fora fecha
- Botão amber (confirmar) + outline (cancelar)

## Don'ts
- ❌ Light mode (sempre dark)
- ❌ Cores fora da paleta
- ❌ Modais com formulários gigantes (use página)
- ❌ Esconder ações importantes em ⋮
- ❌ Usar emojis excessivos (1 por contexto)

## Fluxos críticos
- SDR lança métricas → 6 inputs grandes, 1 botão verde
- CS marca contato → modal rápido com 4 opções
- Admin altera senha → modal com validação inline
