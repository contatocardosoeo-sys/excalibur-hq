# Computer Science — Excalibur HQ

Conceitos úteis no dia a dia do projeto.

## Big O essencial

| Operação | Array | Map/Set | Object |
|---|---|---|---|
| Lookup por chave | O(n) | O(1) | O(1) |
| Push/insert | O(1) | O(1) | O(1) |
| Find por valor | O(n) | O(n) | O(n) |
| Sort | O(n log n) | - | - |

## Estruturas úteis em JS

### Map para lookup rápido
```ts
const clinicasMap = new Map(clinicas.map(c => [c.id, c]))
const cliente = clinicasMap.get(id) // O(1) em vez de O(n)
```

### Set para unique
```ts
const tipos = new Set(items.map(i => i.tipo))
```

### Reduce para agregação
```ts
const totais = items.reduce((acc, i) => {
  acc[i.tipo] = (acc[i.tipo] || 0) + i.valor
  return acc
}, {} as Record<string, number>)
```

## Padrões

### Memoization
```ts
const cache = new Map()
function expensive(x: number) {
  if (cache.has(x)) return cache.get(x)
  const r = compute(x)
  cache.set(x, r)
  return r
}
```

### Debounce (para inputs de busca)
```ts
const timeout = useRef<ReturnType<typeof setTimeout>>()
function handleSearch(q: string) {
  if (timeout.current) clearTimeout(timeout.current)
  timeout.current = setTimeout(() => doSearch(q), 300)
}
```

### Throttle (para scroll/resize)
```ts
let last = 0
function throttled() {
  const now = Date.now()
  if (now - last < 100) return
  last = now
  doIt()
}
```

## Quando se preocupar com performance
- Lista com >1000 items → use virtualização
- Loop dentro de loop → revisar se dá pra usar Map
- Re-renders frequentes → useMemo/useCallback
- Bundle muito grande → code-split
