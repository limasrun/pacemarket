/**
 * PaceMarket — Enriquecer Distâncias
 * Busca km no Ticket Sports para provas sem distância
 * e atualiza o Firebase automaticamente.
 *
 * Rodar: node enriquecer-distancia.js
 */
const { initializeApp } = require("firebase/app");
const {
  getFirestore, collection, getDocs,
  doc, updateDoc
} = require("firebase/firestore");

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
async function buscarDistanciaNoSite(link) {
  if (!link) return null;
  try {
    const res = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Tenta em ordem de confiabilidade:

    // 1. Título da página
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const dist = extrairDistancia(titleMatch[1]);
      if (dist) return { ...dist, fonte: "título" };
    }

    // 2. H1 da página
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      const dist = extrairDistancia(h1Match[1]);
      if (dist) return { ...dist, fonte: "h1" };
    }

    // 3. H2 da página
    const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
    if (h2Match) {
      const dist = extrairDistancia(h2Match[1]);
      if (dist) return { ...dist, fonte: "h2" };
    }

    // 4. Meta description
    const metaMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                      html.match(/<meta[^>]*content="([^"]+)"[^>]*name="description"/i);
    if (metaMatch) {
      const dist = extrairDistancia(metaMatch[1]);
      if (dist) return { ...dist, fonte: "meta" };
    }

    // 5. Busca geral no HTML por padrões de distância em contexto de corrida
    const trechosMatch = html.match(/(?:percurso|distância|categoria)[^<]{0,100}(\d+)\s*k(?:m|\b)/gi);
    if (trechosMatch) {
      for (const trecho of trechosMatch) {
        const dist = extrairDistancia(trecho);
        if (dist) return { ...dist, fonte: "conteúdo" };
      }
    }

    return null;
  } catch(e) {
    return null; // timeout ou erro de rede
  }
}

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(58));
  console.log("  🔍 PaceMarket — Enriquecer Distâncias");
  console.log("  📡 Buscando km no Ticket Sports");
  console.log("═".repeat(58));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  // Busca provas sem distância
  const snap = await getDocs(collection(db, "provas"));
  const semDist = snap.docs
    .map(d => ({ _id: d.id, ...d.data() }))
    .filter(p => !p.distanciaKm && p.link);

  console.log(`  📦 Total no banco: ${snap.docs.length} provas`);
  console.log(`  ⚠️  Sem distância: ${semDist.length} provas\n`);

  if (semDist.length === 0) {
    console.log("  ✅ Todas as provas já têm distância!\n");
    process.exit(0);
  }

  let atualizadas = 0, naoEncontradas = 0;

  for (const prova of semDist) {
    process.stdout.write(`  🔍 ${prova.nome?.substring(0, 45).padEnd(45)} `);

    // Primeiro tenta extrair do próprio nome
    const distNome = extrairDistancia(prova.nome || "");
    if (distNome) {
      await updateDoc(doc(db, "provas", prova._id), {
        distanciaKm: distNome.km,
        distancia:   distNome.label,
      });
      console.log(`→ ${distNome.label} ✅ (nome)`);
      atualizadas++;
      continue;
    }

    // Busca no site do Ticket Sports
    const distSite = await buscarDistanciaNoSite(prova.link);
    if (distSite) {
      await updateDoc(doc(db, "provas", prova._id), {
        distanciaKm: distSite.km,
        distancia:   distSite.label,
      });
      console.log(`→ ${distSite.label} ✅ (${distSite.fonte})`);
      atualizadas++;
    } else {
      console.log(`→ não encontrado ❌`);
      naoEncontradas++;
    }

    // Pausa para não sobrecarregar o servidor
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\n" + "═".repeat(58));
  console.log("  ✅ Concluído!");
  console.log(`     ✅ Atualizadas:      ${atualizadas} provas`);
  console.log(`     ❌ Não encontradas:  ${naoEncontradas} provas`);

  if (naoEncontradas > 0) {
    console.log("\n  💡 Dica: provas sem km após esse script");
    console.log("     podem ser removidas com: node limpar-sem-km.js");
  }

  console.log("\n  O app já exibe as distâncias em tempo real! 🚀\n");
  process.exit(0);
}

main().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
