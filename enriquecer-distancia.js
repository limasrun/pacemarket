/**
 * PaceMarket — Enriquecer Distâncias v2
 * Busca km no Ticket Sports E SuaCorrida para provas sem distância
 * e atualiza o Firebase automaticamente.
 *
 * Rodar: node enriquecer-distancia.js
 */
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");

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

// ── EXTRATOR DE DISTÂNCIA ────────────────────────────────
function extrairDistancia(texto = "") {
  const t = texto.toLowerCase();
  const padroes = [
    { re: /42[.,]?2?\s*km|(?<!meia\s)maratona(?!\s*(kids|infantil|revez|virtual|caminhada))/, km: 42 },
    { re: /meia\s*maratona|21[.,]?1?\s*k/, km: 21 },
    { re: /30\s*k/, km: 30 }, { re: /28\s*k/, km: 28 },
    { re: /25\s*k/, km: 25 }, { re: /20\s*k/, km: 20 },
    { re: /15\s*k/, km: 15 }, { re: /14\s*k/, km: 14 },
    { re: /12\s*k/, km: 12 }, { re: /10\s*k/, km: 10 },
    { re: /8\s*k/,  km: 8  }, { re: /7\s*k/,  km: 7  },
    { re: /6\s*k/,  km: 6  }, { re: /5\s*k/,  km: 5  },
    { re: /4\s*k/,  km: 4  }, { re: /3\s*k/,  km: 3  },
  ];
  for (const p of padroes) {
    if (p.re.test(t)) return { km: p.km, label: `${p.km} km` };
  }
  // Múltiplas distâncias — pega a maior
  const mult = [...t.matchAll(/(\d+)\s*k(?:m|\b)/g)]
    .map(m => parseInt(m[1])).filter(n => n >= 3 && n <= 100);
  if (mult.length > 0) {
    const km = Math.max(...mult);
    return { km, label: `${km} km` };
  }
  return null;
}

// ── BUSCAR NO TICKET SPORTS ──────────────────────────────
async function buscarTicketSports(link) {
  if (!link || !link.includes("ticketsports")) return null;
  try {
    const res = await fetch(link, {
      headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Tenta título, h1, h2, meta description
    for (const re of [
      /<title[^>]*>([^<]+)<\/title>/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<h2[^>]*>([^<]+)<\/h2>/i,
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    ]) {
      const m = html.match(re);
      if (m) { const d = extrairDistancia(m[1]); if (d) return { ...d, fonte: "Ticket Sports" }; }
    }

    // Busca no corpo
    const trechos = html.match(/(?:percurso|distância|categoria|modalidade)[^<]{0,150}/gi) || [];
    for (const t of trechos) {
      const d = extrairDistancia(t);
      if (d) return { ...d, fonte: "Ticket Sports (corpo)" };
    }
  } catch(e) {}
  return null;
}

// ── BUSCAR NO SUACORRIDA ─────────────────────────────────
async function buscarSuaCorrida(nome) {
  if (!nome) return null;
  try {
    // Busca o evento pelo nome no suacorrida
    const nomeBusca = encodeURIComponent(nome.toLowerCase().replace(/\s+/g, "+").substring(0, 40));
    const res = await fetch(`https://www.suacorrida.com.br/eventos/lista/?tribe_search=${nomeBusca}`, {
      headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Busca no conteúdo da página
    const blocos = html.split(nome.substring(0, 15));
    for (const bloco of blocos.slice(1, 3)) {
      const d = extrairDistancia(bloco.substring(0, 500));
      if (d) return { ...d, fonte: "SuaCorrida" };
    }

    // Tenta extrair do HTML geral
    const trechos = html.match(/(?:percurso|distância|categoria)[^<]{0,200}/gi) || [];
    for (const t of trechos) {
      const d = extrairDistancia(t);
      if (d) return { ...d, fonte: "SuaCorrida (busca)" };
    }
  } catch(e) {}
  return null;
}

// ── BUSCAR NO WEBRUN ─────────────────────────────────────
async function buscarWebrun(nome) {
  if (!nome) return null;
  try {
    const nomeBusca = encodeURIComponent(nome.substring(0, 30));
    const res = await fetch(`https://webrun.com.br/?s=${nomeBusca}`, {
      headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const trechos = html.match(/(?:\d+\s*k(?:m|\b))[^<]{0,50}/gi) || [];
    for (const t of trechos) {
      const d = extrairDistancia(t);
      if (d) return { ...d, fonte: "Webrun" };
    }
  } catch(e) {}
  return null;
}

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(58));
  console.log("  🔍 PaceMarket — Enriquecer Distâncias v2");
  console.log("  📡 Fontes: Nome · Ticket Sports · SuaCorrida · Webrun");
  console.log("═".repeat(58));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  const snap = await getDocs(collection(db, "provas"));
  const semDist = snap.docs
    .map(d => ({ _id: d.id, ...d.data() }))
    .filter(p => !p.distanciaKm);

  console.log(`  📦 Total no banco: ${snap.docs.length} provas`);
  console.log(`  ⚠️  Sem distância:  ${semDist.length} provas\n`);

  if (semDist.length === 0) {
    console.log("  ✅ Todas as provas já têm distância!\n");
    process.exit(0);
  }

  let atualizadas = 0, naoEncontradas = 0;

  for (const prova of semDist) {
    const label = prova.nome?.substring(0, 42).padEnd(42) || "?";
    process.stdout.write(`  🔍 ${label} `);

    let dist = null;

    // 1. Tenta extrair do próprio nome
    dist = extrairDistancia(prova.nome || "");
    if (dist) { process.stdout.write(`→ ${dist.label} ✅ (nome)\n`); }

    // 2. Ticket Sports
    if (!dist) {
      dist = await buscarTicketSports(prova.link);
      if (dist) { process.stdout.write(`→ ${dist.label} ✅ (Ticket Sports)\n`); }
    }

    // 3. SuaCorrida
    if (!dist) {
      dist = await buscarSuaCorrida(prova.nome);
      if (dist) { process.stdout.write(`→ ${dist.label} ✅ (SuaCorrida)\n`); }
    }

    // 4. Webrun
    if (!dist) {
      dist = await buscarWebrun(prova.nome);
      if (dist) { process.stdout.write(`→ ${dist.label} ✅ (Webrun)\n`); }
    }

    if (dist) {
      await updateDoc(doc(db, "provas", prova._id), {
        distanciaKm: dist.km,
        distancia:   dist.label,
      });
      atualizadas++;
    } else {
      process.stdout.write(`→ não encontrado ❌\n`);
      naoEncontradas++;
    }

    // Pausa para não sobrecarregar
    await new Promise(r => setTimeout(r, 400));
  }

  console.log("\n" + "═".repeat(58));
  console.log("  ✅ Concluído!");
  console.log(`     ✅ Atualizadas:     ${atualizadas} provas`);
  console.log(`     ❌ Não encontradas: ${naoEncontradas} provas`);
  if (naoEncontradas > 0) {
    console.log("\n  💡 Provas restantes sem km podem ser removidas com:");
    console.log("     node limpar-firebase.js");
  }
  console.log("\n  O app já exibe as distâncias em tempo real! 🚀\n");
  process.exit(0);
}

main().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
