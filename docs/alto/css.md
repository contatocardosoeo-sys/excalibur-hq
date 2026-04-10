# CSS — Excalibur HQ

## Estratégia
- Tailwind 4 para layout/responsividade
- Inline styles para valores dinâmicos
- globals.css para animações + scrollbar + reset

## Layout

### Flexbox (default do projeto)
```css
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
```

### Grid (KPIs e dashboards)
```css
display: grid;
grid-template-columns: repeat(6, 1fr);
gap: 10px;
```

## CSS Variables (em globals.css)
```css
:root {
  --primary: 38 92% 50%;
  --background: 222 47% 4%;
  /* ... */
}
```

## Dark mode
- Sempre dark (não tem light)
- bg base: #030712
- bg cards: #111827
- bg sutil: #0a0f1a

## Animations do projeto
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-transition { animation: fadeIn 0.2s ease-out; }

@keyframes alertaPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
  50% { box-shadow: 0 0 0 16px rgba(239,68,68,0); }
}
.alerta-pulsante { animation: alertaPulse 1.2s infinite; }
```

## Scrollbar customizada
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }
```

## Responsividade
- Desktop first (sistema interno)
- Mobile como drawer/adaptação
- Breakpoints Tailwind: sm 640, md 768, lg 1024, xl 1280
