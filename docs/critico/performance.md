# Performance — Excalibur HQ

## Core Web Vitals (alvos)
- **LCP** (Largest Contentful Paint) < 2.5s
- **FID** (First Input Delay) < 100ms
- **CLS** (Cumulative Layout Shift) < 0.1

## Otimizações já implementadas

### Server Components por padrão
- Páginas que não precisam de hooks ficam server-side
- Reduz JS enviado ao browser

### Queries em paralelo
```ts
const [a, b, c] = await Promise.all([
  supabase.from('x').select(),
  supabase.from('y').select(),
  supabase.from('z').select(),
])
```

### Auto-refresh com cleanup
```tsx
useEffect(() => {
  load()
  const iv = setInterval(load, 60000)
  return () => clearInterval(iv) // IMPORTANTE
}, [load])
```

### Skeleton loading
- Mostra placeholder antes do conteúdo
- Evita CLS quando dados chegam

## Anti-padrões evitados
- ❌ `useEffect` sem dependency array (loop infinito)
- ❌ Fetch dentro de map (use Promise.all)
- ❌ Re-render desnecessário (use useMemo/useCallback)
- ❌ Imagens grandes sem otimização
- ❌ Bundle inflado por imports não usados

## Banco de dados
- Índices em colunas de filtro/ordenação
- LIMIT em queries de listagem (max 100)
- Paginação para tabelas grandes
- Evitar SELECT * — listar campos

## Bundle size
- Next.js code-split automático por rota
- Lazy load componentes pesados: `dynamic(() => import('./X'))`
- Verificar: `npm run build` mostra tamanho de cada rota

## Imagens
- Usar `next/image` quando possível
- Formato webp/avif
- Lazy loading default

## Métricas
- Vercel Analytics (built-in)
- `npm run build` mostra tamanho do bundle
