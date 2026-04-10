# JavaScript ES2024+ — Excalibur HQ

## Features essenciais usadas

### Async/await
```js
const data = await (await fetch(url)).json()
```

### Destructuring
```js
const { data, error } = await supabase.from('x').select()
const [a, b] = await Promise.all([fetchA(), fetchB()])
```

### Spread/rest
```js
const novo = { ...antigo, campo: 'valor' }
const [...resto] = array
```

### Optional chaining
```js
const nome = user?.profile?.nome ?? 'sem nome'
```

### Template literals
```js
const url = `/api/x?id=${id}&t=${Date.now()}`
```

### Array methods
```js
arr.filter(x => x.ativo)
   .map(x => x.nome)
   .reduce((s, n) => s + n, 0)
```

## Padrões do projeto

### Helpers de formatação
```js
const fmt = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0
```

### Date manipulation
```js
const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD
const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
```

### Try/catch silencioso (cuidado!)
```js
try { await fetch(...) } catch { /* ignorar */ }
```
Use só quando o erro é esperado e não-crítico.

## Anti-padrões evitados
- ❌ `var` (usar `let`/`const`)
- ❌ `==` (usar `===`)
- ❌ Mutação de props/state
- ❌ `console.log` em produção (deixar só errors)
