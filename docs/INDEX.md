# 📚 Base de Conhecimento — Excalibur HQ

Roadmaps técnicos organizados em 4 níveis de prioridade. O Claude Code DEVE consultar o arquivo relevante antes de executar qualquer tarefa.

---

## 🔴 CRÍTICO — Leitura obrigatória (14 arquivos)

Stack do projeto. Ler ANTES de qualquer tarefa relacionada.

| Tema | Arquivo | Quando ler |
|---|---|---|
| Next.js 16 | `critico/nextjs.md` | Páginas, rotas, API routes, middleware |
| React 19 | `critico/react.md` | Componentes, hooks, server components |
| TypeScript | `critico/typescript.md` | Types, interfaces, generics |
| PostgreSQL | `critico/postgresql.md` | Queries, schemas, índices |
| Supabase | `critico/supabase.md` | Auth, RLS, real-time |
| Tailwind 4 | `critico/tailwind.md` | Classes, responsividade, dark mode |
| API Design | `critico/api-design.md` | REST, validação, errors |
| Git | `critico/git.md` | Branches, commits, rebase |
| Vercel | `critico/vercel.md` | Deploy, env vars, edge functions |
| UX Design | `critico/ux-design.md` | Princípios de UX, fluxos |
| Design System | `critico/design-system.md` | Componentes consistentes |
| Auth & Security | `critico/auth-security.md` | OAuth, JWT, OWASP |
| Performance | `critico/performance.md` | Otimização, Core Web Vitals |
| Testing | `critico/testing.md` | Unit, integration, e2e |

---

## 🟡 ALTO — Leitura quando relevante (13 arquivos)

Conhecimento complementar. Ler quando o tema for tocado.

| Tema | Arquivo |
|---|---|
| AI Agents | `alto/ai-agents.md` |
| AI Engineer | `alto/ai-engineer.md` |
| JavaScript | `alto/javascript.md` |
| CSS | `alto/css.md` |
| Shell/Bash | `alto/shell-bash.md` |
| SQL Avançado | `alto/sql.md` |
| Computer Science | `alto/computer-science.md` |
| Code Review | `alto/code-review.md` |
| Product Manager | `alto/product-manager.md` |
| Engineering Manager | `alto/engineering-manager.md` |
| BI Analyst | `alto/bi-analyst.md` |
| Data Analyst | `alto/data-analyst.md` |
| HTML | `alto/html.md` |

---

## 🟢 MÉDIO — Referência futura

Tópicos que podem aparecer. Consultar `medio/README.md`.

---

## 🔵 FUTURO — Base expandida

Tecnologias para evolução. Consultar `futuro/README.md`.

---

## 🔄 Auto-evolução

A cada sessão:
1. Claude Code lê este INDEX
2. Identifica os arquivos críticos relevantes
3. Lê o conteúdo antes de agir
4. Ao final, `fim-sessao.sh` atualiza o CLAUDE.md
5. Próxima sessão começa mais inteligente
