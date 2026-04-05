/**
 * PaceMarket — Popular Provas Reais v2
 * Nova estrutura: 1 prova com array de distâncias
 *
 * Estrutura de cada prova:
 * {
 *   nome, data, cidade, estado, tipo, link, fonte,
 *   distancias: [{ km, label, preco, link? }]
 * }
 *
 * Rodar: node popular-provas-reais.js
 */
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc } = require("firebase/firestore");

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

const MESES = {"01":"JAN","02":"FEV","03":"MAR","04":"ABR","05":"MAI","06":"JUN","07":"JUL","08":"AGO","09":"SET","10":"OUT","11":"NOV","12":"DEZ"};
function mkData(iso) {
  const [ano,mes,dia] = iso.split("-");
  return { iso, label:`${dia} ${MESES[mes]} ${ano}`, dia, mes:MESES[mes], ano };
}

function mkProva({ id, nome, dataIso, cidade, estado, pais="BRA", country="Brasil", tipo="urban", link, fonte, distancias }) {
  const finalId = id || (nome+dataIso).toLowerCase().replace(/[^a-z0-9]/g,"").substring(0,45);
  return {
    id: finalId,
    nome, data:mkData(dataIso), cidade, estado, pais, country,
    tipo: /trail|montanha|trilha|ultra/i.test(nome) ? "trail" : tipo,
    link: link || null,
    fonte: fonte || "Calendário Oficial",
    distancias: distancias.map(d => ({
      km:    d.km,
      label: `${d.km}km`,
      preco: d.preco || null,
      link:  d.link  || link || null,
    })),
    // Campos de compatibilidade com provas antigas
    distanciaKm: distancias[0]?.km || null,
    distancia:   distancias[0] ? `${distancias[0].km} km` : null,
    coletadoEm:  new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════
//  PROVAS REAIS 2026
// ═══════════════════════════════════════════════
const PROVAS = [

  // ── ABRIL ──────────────────────────────────
  mkProva({
    nome:"Seven Run São Paulo 2026",
    dataIso:"2026-04-26", cidade:"São Paulo", estado:"SP",
    link:"https://www.ticketsports.com.br/e/seven-run-2026",
    fonte:"Iguana Sports",
    distancias:[
      { km:7,  preco:"R$110" },
      { km:14, preco:"R$130" },
      { km:21, preco:"R$160" },
      { km:28, preco:"R$190" },
    ],
  }),
  mkProva({
    nome:"Maratona Internacional de São Paulo 2026",
    dataIso:"2026-04-12", cidade:"São Paulo", estado:"SP",
    link:"https://www.maratonasaopaulo.com.br",
    fonte:"Maratona de São Paulo",
    distancias:[
      { km:10, preco:"R$150" },
      { km:21, preco:"R$190" },
      { km:42, preco:"R$290" },
    ],
  }),
  mkProva({
    nome:"Maratona Brasília 2026",
    dataIso:"2026-04-19", cidade:"Brasília", estado:"DF",
    link:"https://correrbrasilia.com.br",
    fonte:"Correr Brasília",
    distancias:[
      { km:5,  preco:"R$80"  },
      { km:10, preco:"R$110" },
      { km:21, preco:"R$160" },
      { km:42, preco:"R$260" },
    ],
  }),
  mkProva({
    nome:"Meia Maratona Internacional de Balneário Camboriú 2026",
    dataIso:"2026-04-25", cidade:"Balneário Camboriú", estado:"SC",
    link:"https://vemcorrer.com.br",
    fonte:"Corre Brasil",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
      { km:21, preco:"R$200" },
    ],
  }),
  mkProva({
    nome:"21K Salvador 2026",
    dataIso:"2026-04-26", cidade:"Salvador", estado:"BA",
    link:"https://www.ticketsports.com.br",
    fonte:"Ticket Sports",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
      { km:21, preco:"R$160" },
    ],
  }),
  mkProva({
    nome:"GV Life Run Green Valley 2026",
    dataIso:"2026-04-12", cidade:"Camboriú", estado:"SC",
    link:"https://www.guicheweb.com.br/gv-life-run-inscricao_47656",
    fonte:"Corre Brasil",
    distancias:[
      { km:3,  preco:"R$70"  },
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
    ],
  }),

  // ── MAIO ───────────────────────────────────
  mkProva({
    nome:"Meia Maratona Internacional de Florianópolis 2026",
    dataIso:"2026-05-03", cidade:"Florianópolis", estado:"SC",
    link:"https://www.ticketsports.com.br",
    fonte:"olympics.com",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
      { km:21, preco:"R$180" },
    ],
  }),
  mkProva({
    nome:"Rio do Rastro Marathon 2026",
    dataIso:"2026-05-16", cidade:"Lauro Muller", estado:"SC",
    link:"https://riodorastromarathon.com.br",
    fonte:"Corre Brasil",
    distancias:[
      { km:12, preco:"R$150" },
      { km:25, preco:"R$250" },
      { km:42, preco:"R$350" },
    ],
  }),
  mkProva({
    nome:"Meia Maratona de Uberlândia 2026",
    dataIso:"2026-05-16", cidade:"Uberlândia", estado:"MG",
    link:"https://www.ticketsports.com.br",
    fonte:"olympics.com",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
      { km:21, preco:"R$160" },
    ],
  }),
  mkProva({
    nome:"Mons Ultra Trail Urubici 2026",
    dataIso:"2026-05-29", cidade:"Urubici", estado:"SC",
    link:"https://vemcorrer.com/evento/353-mons-ultra-trail-urubici-2026",
    fonte:"Corre Brasil",
    distancias:[
      { km:12, preco:"R$180" },
      { km:25, preco:"R$280" },
      { km:50, preco:"R$400" },
    ],
  }),
  mkProva({
    nome:"Netshoes Run Brasília 2026",
    dataIso:"2026-05-17", cidade:"Brasília", estado:"DF",
    link:"https://correrbrasilia.com.br",
    fonte:"Correr Brasília",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
      { km:15, preco:"R$150" },
    ],
  }),
  mkProva({
    nome:"21K Parque Dona Sarah Kubitschek 2026",
    dataIso:"2026-05-24", cidade:"Brasília", estado:"DF",
    link:"https://correrbrasilia.com.br",
    fonte:"Correr Brasília",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
      { km:21, preco:"R$160" },
    ],
  }),

  // ── JUNHO ──────────────────────────────────
  mkProva({
    nome:"RJ Half Marathon 2026",
    dataIso:"2026-06-14", cidade:"Rio de Janeiro", estado:"RJ",
    link:"https://www.ticketsports.com.br",
    fonte:"olympics.com",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
      { km:21, preco:"R$180" },
    ],
  }),
  mkProva({
    nome:"Maratona de Porto Alegre 2026",
    dataIso:"2026-06-07", cidade:"Porto Alegre", estado:"RS",
    link:"https://www.ticketsports.com.br",
    fonte:"olympics.com",
    distancias:[
      { km:10, preco:"R$130" },
      { km:21, preco:"R$170" },
      { km:42, preco:"R$270" },
    ],
  }),
  mkProva({
    nome:"Netshoes Run São Paulo 2026",
    dataIso:"2026-06-28", cidade:"São Paulo", estado:"SP",
    link:"https://www.ticketsports.com.br",
    fonte:"Calendário SP 2026",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
      { km:21, preco:"R$160" },
    ],
  }),

  // ── JULHO ──────────────────────────────────
  mkProva({
    nome:"Costa Esmeralda Trail 2026",
    dataIso:"2026-07-12", cidade:"Porto Belo", estado:"SC",
    link:"https://www.correbrasil.com.br",
    fonte:"Corre Brasil",
    distancias:[
      { km:12, preco:"R$160" },
      { km:25, preco:"R$250" },
    ],
  }),
  mkProva({
    nome:"Circuito das Estações Inverno SP 2026",
    dataIso:"2026-07-12", cidade:"São Paulo", estado:"SP",
    link:"https://www.ticketsports.com.br",
    fonte:"Calendário SP 2026",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
      { km:21, preco:"R$160" },
    ],
  }),

  // ── AGOSTO ─────────────────────────────────
  mkProva({
    nome:"Desafio Beto Carrero World 2026",
    dataIso:"2026-07-31", cidade:"Penha", estado:"SC",
    link:"https://www.correbrasil.com.br/desafio-bcw-2026",
    fonte:"Corre Brasil",
    distancias:[
      { km:5,  preco:"R$100" },
      { km:6,  preco:"R$110" },
      { km:10, preco:"R$140" },
      { km:21, preco:"R$220" },
      { km:42, preco:"R$350" },
    ],
  }),
  mkProva({
    nome:"Corrida Brisas Balneário Camboriú 2026",
    dataIso:"2026-08-16", cidade:"Balneário Camboriú", estado:"SC",
    link:"https://www.correbrasil.com.br/corrida-brisas-2026",
    fonte:"Corre Brasil",
    distancias:[
      { km:3,  preco:"R$70"  },
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
    ],
  }),
  mkProva({
    nome:"Maratona Fila São Paulo 2026",
    dataIso:"2026-08-30", cidade:"São Paulo", estado:"SP",
    link:"https://www.ticketsports.com.br",
    fonte:"Calendário SP 2026",
    distancias:[
      { km:10, preco:"R$150" },
      { km:21, preco:"R$200" },
      { km:42, preco:"R$300" },
    ],
  }),
  mkProva({
    nome:"Maratona Internacional de Curitiba 2026",
    dataIso:"2026-08-23", cidade:"Curitiba", estado:"PR",
    link:"https://www.ticketsports.com.br",
    fonte:"olympics.com",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
      { km:21, preco:"R$180" },
      { km:42, preco:"R$280" },
    ],
  }),

  // ── SETEMBRO ───────────────────────────────
  mkProva({
    nome:"Meia Internacional SP 2026",
    dataIso:"2026-09-27", cidade:"São Paulo", estado:"SP",
    link:"https://www.ticketsports.com.br",
    fonte:"Calendário SP 2026",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$130" },
      { km:21, preco:"R$190" },
    ],
  }),
  mkProva({
    nome:"Circuito das Estações Primavera SP 2026",
    dataIso:"2026-09-13", cidade:"São Paulo", estado:"SP",
    link:"https://www.ticketsports.com.br",
    fonte:"Calendário SP 2026",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
    ],
  }),
  mkProva({
    nome:"Corrida de Montanha Indomit Brasília 2026",
    dataIso:"2026-09-20", cidade:"Brasília", estado:"DF",
    link:"https://correrbrasilia.com.br",
    fonte:"Correr Brasília",
    distancias:[
      { km:10, preco:"R$140" },
      { km:15, preco:"R$180" },
      { km:25, preco:"R$250" },
    ],
  }),

  // ── OUTUBRO ────────────────────────────────
  mkProva({
    nome:"Maratona Internacional de Pomerode 2026",
    dataIso:"2026-10-17", cidade:"Pomerode", estado:"SC",
    link:"https://www.correbrasil.com.br/maratona-de-pomerode-2026",
    fonte:"Corre Brasil",
    distancias:[
      { km:6,  preco:"R$100" },
      { km:21, preco:"R$190" },
      { km:42, preco:"R$290" },
    ],
  }),
  mkProva({
    nome:"Circuito das Estações Outono RJ 2026",
    dataIso:"2026-10-04", cidade:"Rio de Janeiro", estado:"RJ",
    link:"https://www.ticketsports.com.br",
    fonte:"TTK",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:10, preco:"R$120" },
    ],
  }),

  // ── NOVEMBRO ───────────────────────────────
  mkProva({
    nome:"Mons Ultra Trail Nova Trento 2026",
    dataIso:"2026-11-11", cidade:"Nova Trento", estado:"SC",
    link:"https://monsultratrail.com.br",
    fonte:"Corre Brasil",
    distancias:[
      { km:12,  preco:"R$180" },
      { km:25,  preco:"R$280" },
      { km:55,  preco:"R$400" },
      { km:104, preco:"R$600" },
    ],
  }),
  mkProva({
    nome:"Venus Women's Half Marathon 2026",
    dataIso:"2026-11-29", cidade:"São Paulo", estado:"SP",
    link:"https://www.suacorrida.com.br/evento/venus-womens-half-marathon-2026",
    fonte:"SuaCorrida",
    distancias:[
      { km:5,  preco:"R$100" },
      { km:10, preco:"R$130" },
      { km:21, preco:"R$180" },
    ],
  }),
  mkProva({
    nome:"Meia Maratona SC21K Florianópolis 2026",
    dataIso:"2026-11-29", cidade:"Florianópolis", estado:"SC",
    link:"https://www.correbrasil.com.br/sc21k-2026",
    fonte:"Corre Brasil",
    distancias:[
      { km:5,  preco:"R$90"  },
      { km:15, preco:"R$150" },
      { km:21, preco:"R$190" },
    ],
  }),
  mkProva({
    nome:"New York City Marathon 2026",
    dataIso:"2026-11-01", cidade:"Nova York", estado:null, pais:"EUA", country:"Internacional",
    link:"https://www.nyrr.org/tcsnycmarathon",
    fonte:"NYRR",
    distancias:[
      { km:42, preco:"USD 358" },
    ],
  }),

  // ── DEZEMBRO ───────────────────────────────
  mkProva({
    nome:"101ª Corrida Internacional de São Silvestre 2026",
    dataIso:"2026-12-31", cidade:"São Paulo", estado:"SP",
    link:"https://www.saosilvestre.com.br",
    fonte:"São Silvestre",
    distancias:[
      { km:15, preco:"R$200" },
    ],
  }),
];

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(60));
  console.log("  🏁 PaceMarket — Popular Provas Reais v2");
  console.log("  📋 1 prova = 1 card com N distâncias");
  console.log("═".repeat(60));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);
  console.log(`  📦 ${PROVAS.length} provas com ${PROVAS.reduce((a,p)=>a+(p.distancias?.length||0),0)} distâncias no total\n`);

  const snap = await getDocs(collection(db,"provas"));
  const existentes = new Set(snap.docs.map(d=>d.id));
  console.log(`  📋 ${existentes.size} provas já no banco\n`);

  let salvas=0, atualizadas=0, puladas=0;

  for (const prova of PROVAS) {
    const { id, ...dados } = prova;
    try {
      if (existentes.has(id)) {
        // Atualiza para garantir nova estrutura com distancias[]
        await setDoc(doc(collection(db,"provas"), id), dados);
        console.log(`  🔄 ${prova.nome.substring(0,50)} (${prova.distancias.length} dist.)`);
        atualizadas++;
      } else {
        await setDoc(doc(collection(db,"provas"), id), dados);
        console.log(`  ✅ ${prova.nome.substring(0,50)} (${prova.distancias.length} dist.)`);
        salvas++;
      }
    } catch(e) {
      console.log(`  ❌ ${prova.nome.substring(0,40)} — ${e.message.substring(0,30)}`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("  🎉 Concluído!");
  console.log(`     ✅ ${salvas} novas provas adicionadas`);
  console.log(`     🔄 ${atualizadas} provas atualizadas`);
  console.log(`\n  Acesse o app e veja as distâncias nos cards! 🚀\n`);
  process.exit(0);
}

main().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
