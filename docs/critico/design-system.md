# Design System — Excalibur HQ

## Componentes reutilizáveis

### Localização
- `app/components/Sidebar.tsx` — navegação
- `app/components/Toast.tsx` — feedback
- `app/components/EmptyState.tsx` — estados vazios
- `app/components/AlertaPreenchimento.tsx` — alerta planilha

### shadcn UI (em components/ui/)
- Button, Card, Badge, Progress, Table, Select, etc.
- Importar: `import { Button } from '@/components/ui/button'`
- Já estilizado com tema dark + amber

## Tokens

### Cores (HSL via CSS vars)
```css
--primary: 38 92% 50%;     /* amber */
--background: 222 47% 4%;  /* dark */
--foreground: 210 40% 98%; /* white */
--muted: 217 32% 12%;      /* card bg */
--border: 217 32% 15%;     /* borders */
--destructive: 0 84% 60%;  /* red */
```

### Espaçamentos
- Padding card: 14-20px
- Gap entre cards: 10-12px
- Margin entre seções: 16-24px

### Border radius
- Buttons/inputs: 6-8px
- Cards: 10-12px
- Modais: 16px

### Tipografia
- Default: Geist Sans (sem fallback Inter)
- Mono: Geist Mono (números, IDs, datas)
- Sizes: 9, 10, 11, 12, 13, 14, 16, 18, 22, 24

## Patterns

### KPI Card
```tsx
<div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 14 }}>
  <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>{label}</div>
  <div style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>{valor}</div>
  <div style={{ fontSize: 9, color: '#4b5563' }}>{sub}</div>
</div>
```

### Status Badge
```tsx
<span style={{
  background: cor + '20',
  color: cor,
  padding: '2px 8px',
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700
}}>
  {label}
</span>
```

### Progress bar
```tsx
<div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
  <div style={{ height: '100%', background: cor, width: `${pct}%`, transition: 'width 0.5s' }} />
</div>
```

## Consistência
- Reusar styles entre páginas (copy-paste é ok se for visual igual)
- Quando criar 3 vezes a mesma coisa, considerar componente
- NÃO criar abstrações prematuras
