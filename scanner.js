/**
 * PaceMarket — Scanner v6
 * Lê HTMLs do Webrun + busca distância no Ticket Sports
 *
 * Rodar: node scanner.js
 */
const fs = require("fs");

const ARQUIVOS_HTML = ["webrun-mes.html", "webrun-3meses.html", "webrun-6meses.html"];
const ARQUIVO_SAIDA = "provas-brasil.json";

// ── DISTÂNCIA ────────────────────────────────────────────
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
  if (mult.length > 0) { const km = Math.max(...mult); return { km, label: `${km} km` }; }
  return { km: null, label: null };
}

function classificarTipo(nome = "") {
  return /trail|montanha|trilha|ultra|cross|serra|off.?road/i.test(nome) ? "trail" : "urban";
}

function classificarDificuldade(nome = "", km = null) {
  if (/ultra|iron|12\s*h|24\s*h|48\s*h/i.test(nome)) return "brutal";
  if (/trail/i.test(nome) && km && km >= 15) return "brutal";
  if (km && km >= 30) return "brutal";
  if (km && km >= 21) return "intermediaria";
  if (/meia/i.test(nome)) return "intermediaria";
  return "iniciante";
}

function calcularMatch(km = null) {
  if (!km) return null;
  const t = { 3:92, 4:90, 5:88, 6:87, 7:85, 8:84, 10:96, 12:83, 14:82, 15:80, 20:79, 21:78, 25:70, 28:65, 30:58, 42:45 };
  return t[km] ?? (km < 10 ? 85 : km < 21 ? 80 : km < 42 ? 65 : 40);
}

function ehKids(nome = "") {
  return /\bkids\b|infantil|criança|50m\b|100m\b|200m\b|300m\b/i.test(nome);
}

function ehCorrida(modalidade = "", nome = "") {
  const t = (modalidade + " " + nome).toLowerCase();
  if (/ciclismo|mountain\s*bike|natação|triathlon|duathlon|aquathlon|beach\s*tennis|futev|canoagem|stand\s*up/i.test(t)) return false;
  return true;
}

const MESES_ISO   = { jan:"01",fev:"02",mar:"03",abr:"04",mai:"05",jun:"06",jul:"07",ago:"08",set:"09",out:"10",nov:"11",dez:"12" };
const MESES_LABEL = { jan:"JAN",fev:"FEV",mar:"MAR",abr:"ABR",mai:"MAI",jun:"JUN",jul:"JUL",ago:"AGO",set:"SET",out:"OUT",nov:"NOV",dez:"DEZ" };

function parsearData(texto = "") {
  if (!texto) return null;
  const m = texto.toLowerCase().trim().match(/(\d{1,2})\s+([a-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const dia = m[1].padStart(2,"0"), mesKey = m[2], ano = m[3];
  if (!MESES_ISO[mesKey]) return null;
  return {
    iso:   `${ano}-${MESES_ISO[mesKey]}-${dia}`,
    label: `${dia} ${MESES_LABEL[mesKey]} ${ano}`,
    dia, mes: MESES_LABEL[mesKey], ano,
  };
}

// ── BUSCAR DISTÂNCIA NO TICKET SPORTS ────────────────────
async function buscarDistanciaTicketSports(link) {
  if (!link) return null;
  try {
    const res = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Tenta extrair distância do título ou descrição da página
    const tituloMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titulo = tituloMatch?.[1] || "";
    const dist = extrairDistancia(titulo);
    if (dist.km) return dist;

    // Tenta encontrar no h1 ou h2
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1 = h1Match?.[1] || "";
    const dist2 = extrairDistancia(h1);
    if (dist2.km) return dist2;

    // Tenta encontrar em spans/divs com distância
    const distMatch = html.match(/(\d+)\s*(?:km|quilômetros)/i);
    if (distMatch) {
      const km = parseInt(distMatch[1]);
      if (km >= 3 && km <= 100) return { km, label: `${km} km` };
    }
  } catch(e) {
    // timeout ou erro — ignora
  }
  return null;
}

// ── PARSER HTML ───────────────────────────────────────────
function parsearHTML(html, arquivo) {
  const provas = [];
  const nomesVistos = new Set();

  const blocos = html.split(/<h2[^>]*class="[^"]*font-20[^"]*"[^>]*>/i);

  for (let i = 1; i < blocos.length; i++) {
    const bloco = blocos[i];

    const nomeMatch = bloco.match(/^([^<]+)<\/h2>/);
    if (!nomeMatch) continue;
    const nome = nomeMatch[1].trim()
      .replace(/&amp;/g,"&").replace(/&#8211;/g,"–").replace(/&#8217;/g,"'")
      .replace(/\s+/g," ");

    if (!nome || nome.length < 4) continue;
    if (nomesVistos.has(nome.toLowerCase())) continue;
    nomesVistos.add(nome.toLowerCase());
    if (ehKids(nome)) continue;

    // DATA
    const dataMatch =
      bloco.match(/class="data[^"]*"[^>]*>\s*(\d{1,2}\s+[a-z]{3}\s+\d{4})\s*</i) ||
      bloco.match(/class="col-4[^"]*"[^>]*>\s*(\d{1,2}\s+[a-z]{3}\s+\d{4})\s*</i) ||
      bloco.match(/>(\d{1,2}\s+[a-z]{3}\s+\d{4})</i);
    const dataStr = dataMatch?.[1]?.trim() || "";
    const data = parsearData(dataStr);
    if (!data) continue;

    // MODALIDADE e CIDADE
    let modalidade = "", cidadeStr = "";
    const spanMatch = bloco.match(/class="font-13"[^>]*>([^<]*·[^<]+,\s*[A-Z]{2}[^<]*)<\/span>/i);
    if (spanMatch) {
      const partes = spanMatch[1].split("·").map(p => p.trim());
      modalidade = partes[0] || "";
      cidadeStr  = partes[partes.length - 1] || "";
    }
    if (!cidadeStr) {
      const pMatch = bloco.match(/class="font-13"[^>]*>\s*·\s*([^<]+,\s*[A-Z]{2})\s*<\/p>/i);
      if (pMatch) cidadeStr = pMatch[1].trim();
    }

    if (!ehCorrida(modalidade, nome)) continue;

    // LINK
    const linkMatch = bloco.match(/href="(https:\/\/www\.ticketsports\.com\.br\/e\/[^"]+)"/i);
    const link = linkMatch?.[1] || null;

    const cidParts = cidadeStr.replace(/^\W+/,"").trim().split(",").map(p => p.trim());
    const dist = extrairDistancia(nome);

    provas.push({
      nome,
      link,
      data,
      cidade:      cidParts[0] || null,
      estado:      cidParts[1] || null,
      pais:        "BRA",
      country:     "Brasil",
      distanciaKm: dist.km,
      distancia:   dist.label,
      tipo:        classificarTipo(nome),
      dificuldade: classificarDificuldade(nome, dist.km),
      match:       calcularMatch(dist.km),
      score:       null,
      avaliacoes:  0,
      preco:       null,
      kit:         null,
      abast:       null,
      fonte:       "Webrun",
      coletadoEm:  new Date().toISOString(),
    });
  }

  return provas;
}

function deduplicar(provas) {
  const mapa = new Map();
  for (const p of provas) {
    const k = p.nome.toLowerCase().replace(/[^a-z0-9]/g,"").substring(0,30) + "_" + (p.data?.iso||"");
    if (!mapa.has(k)) mapa.set(k, p);
    else {
      const ex = mapa.get(k);
      if (!ex.cidade && p.cidade) mapa.set(k, p);
      if (!ex.distanciaKm && p.distanciaKm) mapa.set(k, p);
    }
  }
  return [...mapa.values()];
}

// ── ENRIQUECER COM DISTÂNCIAS ────────────────────────────
async function enriquecerDistancias(provas) {
  const semDist = provas.filter(p => !p.distanciaKm && p.link);
  if (semDist.length === 0) return provas;

  console.log(`\n  🔍 Buscando distância para ${semDist.length} provas sem km...`);
  let encontradas = 0;

  for (const prova of semDist) {
    const dist = await buscarDistanciaTicketSports(prova.link);
    if (dist) {
      prova.distanciaKm = dist.km;
      prova.distancia   = dist.label;
      prova.dificuldade = classificarDificuldade(prova.nome, dist.km);
      prova.match       = calcularMatch(dist.km);
      encontradas++;
      process.stdout.write(`  ✅ ${prova.nome.substring(0,40)} → ${dist.label}\n`);
    }
    // Pequena pausa para não sobrecarregar
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n  📊 Distâncias encontradas: ${encontradas}/${semDist.length}\n`);
  return provas;
}

function exibir(provas) {
  console.log("═".repeat(62));
  console.log("  📋 RESULTADO FINAL");
  console.log("═".repeat(62));
  console.log(`\n  ✅ ${provas.length} provas únicas\n`);

  provas.forEach((p, i) => {
    const diff = p.dificuldade==="iniciante"?"🟢":p.dificuldade==="intermediaria"?"🟡":"🔴";
    const dist = p.distanciaKm ? `${p.distanciaKm}km` : "?km";
    const cid  = [p.cidade, p.estado].filter(Boolean).join(", ") || "?";
    console.log(`  ${String(i+1).padStart(3,"0")}. ${p.nome.substring(0,50)}`);
    console.log(`       📅 ${(p.data?.label||"?").padEnd(15)} 📍 ${cid}`);
    console.log(`       ${diff} ${p.dificuldade.padEnd(14)} 📏 ${dist.padEnd(6)} 🎯 ${p.match??'?'}%`);
    console.log();
  });

  const sD = provas.filter(p=>!p.distanciaKm).length;
  const sC = provas.filter(p=>!p.cidade).length;
  const sL = provas.filter(p=>!p.link).length;
  console.log("  📊 QUALIDADE");
  console.log(`     Distância: ${provas.length-sD}/${provas.length} ${sD===0?"✅":`⚠️  ${sD} sem`}`);
  console.log(`     Cidade:    ${provas.length-sC}/${provas.length} ${sC===0?"✅":`⚠️  ${sC} sem`}`);
  console.log(`     Link:      ${provas.length-sL}/${provas.length} ${sL===0?"✅":`⚠️  ${sL} sem`}`);
  console.log();
}

async function main() {
  console.log("═".repeat(62));
  console.log("  🏁 PaceMarket — Scanner v6");
  console.log("  📄 HTML local + distâncias do Ticket Sports");
  console.log("═".repeat(62));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  const disponiveis = ARQUIVOS_HTML.filter(f => fs.existsSync(f));
  if (disponiveis.length === 0) {
    console.log("  ❌ Nenhum HTML encontrado. Rode: node debug2.js\n");
    process.exit(1);
  }

  const todasProvas = [];
  for (const arquivo of disponiveis) {
    const html = fs.readFileSync(arquivo, "utf8");
    console.log(`  📄 ${arquivo} (${(html.length/1024).toFixed(0)} KB)`);
    const provas = parsearHTML(html, arquivo);
    console.log(`     → ${provas.length} provas extraídas\n`);
    todasProvas.push(...provas);
  }

  const unicas = deduplicar(todasProvas)
    .filter(p => p.data?.iso)
    .sort((a,b) => a.data.iso > b.data.iso ? 1 : -1);

  // Enriquece distâncias buscando no Ticket Sports
  const enriquecidas = await enriquecerDistancias(unicas);

  if (enriquecidas.length === 0) {
    console.log("  ⚠️  Nenhuma prova. Rode: node debug2.js\n");
    process.exit(0);
  }

  exibir(enriquecidas);

  const json = JSON.stringify(enriquecidas, null, 2);
  fs.writeFileSync(ARQUIVO_SAIDA, json, "utf8");
  console.log(`  💾 ${ARQUIVO_SAIDA}  (${(json.length/1024).toFixed(1)} KB · ${enriquecidas.length} provas)\n`);
  console.log("  🎯 Próximo passo: node enviar-firebase.js\n");
}

main().catch(e => { console.error("\n  ❌ Erro:", e.message); process.exit(1); });
