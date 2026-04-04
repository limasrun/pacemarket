# PaceMarket 🏁

Marketplace de corridas brasileiro com dados reais.

---

## PRIMEIRA VEZ — Setup completo

```bash
# 1. Instalar dependências (só na primeira vez)
npm install
npx playwright install chromium

# 2. Baixar dados do Webrun
node debug2.js

# 3. Extrair provas do HTML
node scanner.js

# 4. Enviar para Firebase
node enviar-firebase.js

# 5. Rodar o app
npm start
```

---

## USO DIÁRIO — Atualizar provas

```bash
node debug2.js && node scanner.js && node enviar-firebase.js
```

---

## RODAR O APP

```bash
npm start
# Abre em http://localhost:3000
```

---

## ARQUIVOS

| Arquivo | O que faz |
|---|---|
| `debug2.js` | Abre Chrome e baixa HTML do Webrun |
| `scanner.js` | Extrai provas do HTML → provas-brasil.json |
| `enviar-firebase.js` | Envia provas-brasil.json para o Firebase |
| `src/App.jsx` | App React completo |

---

## Firebase

Projeto: `pacemarket-be6c9`
Collection: `provas`
