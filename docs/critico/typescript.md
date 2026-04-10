# TypeScript — Excalibur HQ

## Regras do projeto
- NUNCA usar `any`. Se precisar, use `unknown` e narrow.
- Interfaces para objetos, types para unions/intersections.
- Strict mode habilitado.

## Padrões comuns

### Interfaces para API responses
```ts
interface Cliente {
  id: string
  nome: string
  ativo: boolean
  mrr: number | null
}
```

### Type narrowing
```ts
function fmt(v: number | null): string {
  if (v === null) return '-'
  return v.toLocaleString('pt-BR')
}
```

### Discriminated unions
```ts
type Result =
  | { ok: true; data: Cliente }
  | { ok: false; error: string }
```

### Generics simples
```ts
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json() as Promise<T>
}
```

## Casts seguros
- Evite `as Type`. Prefira validação runtime.
- Para casts duplos: `value as unknown as Type`

## Erros comuns evitados
- `Property X does not exist` → adicione no interface
- `Argument of type 'undefined'` → use `?` ou default
- `Implicitly any` → tipe explicitamente
