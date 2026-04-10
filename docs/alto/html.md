# HTML — Excalibur HQ

Next.js gera HTML automaticamente. Foco em semântica + acessibilidade.

## Tags semânticas usadas
```tsx
<header>      // Topo da página/seção
<nav>         // Navegação (sidebar)
<main>        // Conteúdo principal
<aside>       // Conteúdo lateral
<section>     // Seção temática
<article>     // Conteúdo independente
<footer>      // Rodapé
```

## Forms
```tsx
<form onSubmit={handleSubmit}>
  <label htmlFor="email">Email</label>
  <input id="email" type="email" required />
  <button type="submit">Salvar</button>
</form>
```

## Acessibilidade

### ARIA labels (botões só com ícone)
```tsx
<button aria-label="Atualizar dados" onClick={load}>🔄</button>
<button aria-label="Fechar modal" onClick={close}>✕</button>
```

### Indicador de página ativa (sidebar)
```tsx
<Link aria-current={isActive ? 'page' : undefined}>...</Link>
```

### Alt em imagens
```tsx
<img src="/logo.svg" alt="Excalibur HQ logo" />
```

### Tabelas com header
```tsx
<table>
  <thead>
    <tr><th scope="col">Nome</th></tr>
  </thead>
  <tbody>
    <tr><td>...</td></tr>
  </tbody>
</table>
```

## SEO básico (Next.js metadata)
```ts
export const metadata = {
  title: 'CEO — Excalibur HQ',
  description: 'Dashboard CEO',
  icons: { icon: '/favicon.svg' },
}
```

## Don'ts
- ❌ `<div>` para tudo
- ❌ Botões com `<a>` (use `<button>`)
- ❌ Links com `<div onClick>`
- ❌ Forms sem `<label>`
- ❌ Imagens sem alt
