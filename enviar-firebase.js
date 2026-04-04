/**
 * PaceMarket — Enviar para Firebase
 * Lê o provas-brasil.json e salva no Firestore.
 * Evita duplicatas automaticamente.
 *
 * Rodar: node enviar-firebase.js
 */
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc, getDocs } = require("firebase/firestore");
const fs = require("fs");

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBwoiW0fZ1UL3h283x0sfmdroVi3_T14bE",
  authDomain:        "pacemarket-be6c9.firebaseapp.com",
  projectId:         "pacemarket-be6c9",
  storageBucket:     "pacemarket-be6c9.firebasestorage.app",
  messagingSenderId: "583598891691",
  appId:             "1:583598891691:web:bfaf831e3b85bdbbfb4dee",
};

const ARQUIVO_JSON = "provas-brasil.json";

function gerarId(link = "", nome = "") {
  const base = (link || nome).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash = hash & hash;
  }
  return base.substring(0, 20) + "_" + Math.abs(hash).toString(36);
}

async function main() {
  console.log("═".repeat(54));
  console.log("  🔥 PaceMarket — Enviar para Firebase");
  console.log("═".repeat(54));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  if (!fs.existsSync(ARQUIVO_JSON)) {
    console.log(`  ❌ ${ARQUIVO_JSON} não encontrado.`);
    console.log("  Rode primeiro: node scanner.js\n");
    process.exit(1);
  }

  const provas = JSON.parse(fs.readFileSync(ARQUIVO_JSON, "utf8"));
  console.log(`  📦 ${provas.length} provas para enviar\n`);

  console.log("  🔥 Conectando ao Firebase...");
  const app = initializeApp(FIREBASE_CONFIG);
  const db  = getFirestore(app);

  // Busca IDs já existentes
  const snap = await getDocs(collection(db, "provas"));
  const existentes = new Set(snap.docs.map(d => d.id));
  console.log(`  📋 ${existentes.size} provas já no banco\n`);

  let salvas = 0, duplicatas = 0, erros = 0;

  for (const prova of provas) {
    try {
      const id = gerarId(prova.link, prova.nome);
      if (existentes.has(id)) {
        duplicatas++;
        continue;
      }
      await setDoc(doc(collection(db, "provas"), id), prova);
      console.log(`  ✅ ${prova.nome.substring(0, 50)}`);
      salvas++;
    } catch(e) {
      console.log(`  ❌ Erro: ${e.message.substring(0, 50)}`);
      erros++;
    }
  }

  console.log("\n" + "═".repeat(54));
  console.log(`  🎉 Concluído!`);
  console.log(`     ✅ ${salvas} novas provas salvas`);
  console.log(`     ⏭️  ${duplicatas} duplicatas ignoradas`);
  if (erros > 0) console.log(`     ❌ ${erros} erros`);
  console.log("\n  O app já exibe as provas em tempo real! 🚀\n");
  process.exit(0);
}

main().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
