# React 19 — Excalibur HQ

## Hooks essenciais
- `useState` — estado local
- `useEffect` — efeitos colaterais (cuidado com dependências)
- `useCallback` — memoiza função (evita re-renders)
- `useMemo` — memoiza valor computado
- `useRef` — referência mutável (timers, DOM)

## Padrões do projeto

### Loading + dados
```tsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const load = useCallback(async () => {
  setLoading(true)
  const d = await (await fetch('/api/x')).json()
  setData(d)
  setLoading(false)
}, [])
useEffect(() => { load() }, [load])
```

### Auto-refresh
```tsx
useEffect(() => {
  load()
  const iv = setInterval(load, 60000)
  return () => clearInterval(iv)
}, [load])
```

### Modal pattern
```tsx
{modal && (
  <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0 }}>
    <div onClick={e => e.stopPropagation()}>{/* conteudo */}</div>
  </div>
)}
```

## Server vs Client Components
- Server (default): pode fetch direto, async/await
- Client (`'use client'`): hooks, eventos, browser APIs
- Não passar funções de server → client (use server actions)

## Performance
- Evite arrow functions em `onClick` se renderiza muito
- Memoize listas grandes com `useMemo`
- Não chame setState dentro de useEffect sem deps corretas
