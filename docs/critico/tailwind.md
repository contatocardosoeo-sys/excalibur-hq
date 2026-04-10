# Tailwind 4 — Excalibur HQ

## Stack
- Tailwind 4 (`@import "tailwindcss"` em globals.css)
- shadcn UI integrado (`@import "shadcn/tailwind.css"`)
- Geist font (sans + mono)

## Paleta do projeto
- bg principal: `bg-gray-950` ou `#030712`
- cards: `bg-gray-900` ou `#111827`
- accent: `amber-500` ou `#f59e0b`
- texto: `text-white`, `text-gray-400`, `text-gray-600`
- bordas: `border-gray-800` ou `#1f2937`

## Padrões de cores por status
```
verde:    #4ade80 / #22c55e (saudável)
amarelo:  #fbbf24 / #f59e0b (atenção)
vermelho: #f87171 / #ef4444 (risco/crítico)
azul:     #60a5fa / #3b82f6 (info)
roxo:     #a78bfa / #8b5cf6 (especial)
```

## Layout
```tsx
// Sidebar + main content
<div style={{ display: 'flex', minHeight: '100vh' }}>
  <Sidebar />
  <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
    {/* conteudo */}
  </div>
</div>
```

## Card pattern
```tsx
<div style={{
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 12,
  padding: 16
}}>
```

## Inline style vs className
- Tailwind classes: layout, espaçamento simples, responsividade
- Inline style: cores dinâmicas, valores calculados, gradientes
- Projeto usa MIX dos dois — não é problema

## Responsividade
- Sidebar: `md:` para desktop, drawer mobile < 768px
- Tabelas: `overflow-x: auto` em mobile

## Animations customizadas (em globals.css)
- `.page-transition` — fadeIn 200ms
- `.toast-enter` — slide-in 250ms
- `.alerta-pulsante` — pulse infinito (alerta crítico)
