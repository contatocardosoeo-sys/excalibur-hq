# Shell/Bash — Excalibur HQ

## Scripts do projeto

### auto-save.sh
Roda em background, faz commit a cada 30min.

### fim-sessao.sh
Encerra sessão, atualiza CLAUDE.md, faz commit final.

### import-financeiro.js (node, não bash)
Importa dados do Google Sheets para o banco.

## Comandos úteis

### Git status rápido
```bash
git status -s
git log --oneline -5
git diff --stat
```

### Find/grep (mas usar Grep tool no Claude Code)
```bash
find . -name "*.tsx" -path "*sdr*"
grep -r "supabase" app/api/sdr/
```

### Watch logs
```bash
tail -f auto-save.log
```

### Variáveis de ambiente
```bash
source .env.local
echo $VERCEL_TOKEN
```

## Padrões úteis

### Heredoc para arquivos
```bash
cat > arquivo.md << 'EOF'
conteudo
EOF
```

### Loop em arquivos
```bash
for f in app/(hq)/*/page.tsx; do
  echo "$f"
done
```

### Curl + jq para API
```bash
curl -s "https://api/x" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d)"
```

## Cuidados
- Bash no Windows (Git Bash) tem peculiaridades
- Caminhos: usar forward slashes
- Não usar `find` quando dá pra usar Glob tool
- Não usar `grep` quando dá pra usar Grep tool
