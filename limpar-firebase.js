/**
 * PaceMarket — Limpar Firebase
 * Remove provas com data passada ou sem data.
 *
 * Rodar: node limpar-firebase.js
 */
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBwoiW0fZ1UL3h283x0sfmdroVi3_T14bE",
  authDomain:        "pacemarket-be6c9.firebaseapp.com",
  projectId:         "pacemarket-be6c9",
  storageBucket:     "pacemarket-be6c9.firebasestorage.app",
  messagingSenderId: "583598891691",
  appId:             "1:583598891691:web:bfaf831e3b85bdbbfb4dee",
};

const app = initializeApp(FIREBASE_CONFIG);
const db  = getFirestore(app);

async function main() {
  console.log("═".repeat(54));
  console.log("  🧹 PaceMarket — Limpeza do Firebase");
  console.log("═".repeat(54));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  const hoje = new Date().toISOString().split("T")[0]; // "2026-04-05"
  console.log(`  📅 Data de referência: ${hoje}`);
  console.log("  Removendo provas com data passada ou sem data...\n");

  const snap = await getDocs(collection(db, "provas"));
  console.log(`  📦 Total no banco: ${snap.docs.length} provas\n`);

  let removidas = 0, mantidas = 0, semData = 0;

  for (const d of snap.docs) {
    const prova = d.data();
    const dataIso = prova.data?.iso || prova.dataIso || null;

    // Remove se: sem data OU data já passou
    if (!dataIso) {
      console.log(`  🗑️  SEM DATA    → ${prova.nome?.substring(0, 50)}`);
      await deleteDoc(doc(db, "provas", d.id));
      semData++;
      removidas++;
    } else if (dataIso < hoje) {
      console.log(`  🗑️  PASSADA (${dataIso}) → ${prova.nome?.substring(0, 45)}`);
      await deleteDoc(doc(db, "provas", d.id));
      removidas++;
    } else {
      mantidas++;
    }
  }

  console.log("\n" + "═".repeat(54));
  console.log("  ✅ Limpeza concluída!");
  console.log(`     🗑️  Removidas: ${removidas} provas`);
  console.log(`        • Sem data: ${semData}`);
  console.log(`        • Data passada: ${removidas - semData}`);
  console.log(`     ✅ Mantidas:  ${mantidas} provas`);
  console.log("\n  O app já reflete as mudanças em tempo real! 🚀\n");
  process.exit(0);
}

main().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
