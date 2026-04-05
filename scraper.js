/**
 * PaceMarket — Scraper Unificado v5
 * Fontes:
 *   1. suacorrida.com.br — todas as páginas (até 9)
 *   2. webrun.com.br     — calendário 6 meses
 *
 * Rodar: node scraper.js
 */
const fs = require("fs");
const ARQUIVO_SAIDA = "provas-coletadas.json";

// ── FONTES ────────────────────────────────────────────────
// SuaCorrida: varre todas as páginas dinamicamente
const SUACORRIDA_BASE = "https://www.suacorrida.com.br/eventos/lista/";
const MAX_PAGINAS_SC  = 9; // site tem 9 páginas

const WEBRUN_URLS = [
  "https://webrun.com.br/calendario-mes/",
  "https://webrun.com.br/calendario-6-meses/",
];

// ── HELPERS ───────────────────────────────────────────────
function extrairDistancia(texto = "") {
  const t = texto.toLowerCase();
  const padroes = [
    { re: /42[.,]?2?\s*km|(?<!meia\s)maratona(?!\s*(kids|infantil|revez|virtual))/, km: 42 },
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
  const mult = [...t.matchAll(/(\d+)\s*k(?:m|\b)/g)]
    .map(m => parseInt(m[1])).filter(n => n >= 3 && n <= 100);
  if (mult.length > 0) { const km = Math.max(...mult); return { km, label: `${km} km` }; }
  return { km: null, label: null };
}

function classificarTipo(nome = "") {
  return /trail|montanha|trilha|ultra|cross|serra/i.test(nome) ? "trail" : "urban";
}

function classificarDificuldade(nome = "", km = null) {
  if (/ultra|iron|12\s*h|24\s*h/i.test(nome)) return "brutal";
  if (/trail/i.test(nome) && km && km >= 15) return "brutal";
  if (km && km >= 30) return "brutal";
  if (km && km >= 21) return "intermediaria";
  if (/meia/i.test(nome)) return "intermediaria";
  return "iniciante";
}

function calcularMatch(km = null) {
  if (!km) return null;
  const t = { 3:92, 5:88, 7:85, 10:96, 14:82, 15:80, 21:78, 28:65, 30:58, 42:45 };
  return t[km] ?? (km < 10 ? 85 : km < 21 ? 80 : 65);
}

function ehKids(nome = "") {
  return /\bkids\b|infantil|criança|50m\b|100m\b|200m\b|300m\b/i.test(nome);
}

function ehCorrida(modalidade = "", nome = "") {
  const t = (modalidade + " " + nome).toLowerCase();
  return !/ciclismo|mountain\s*bike|natação|triathlon|duathlon|aquathlon|beach\s*tennis/i.test(t);
}

const MESES_ISO   = { jan:"01",fev:"02",mar:"03",abr:"04",mai:"05",jun:"06",jul:"07",ago:"08",set:"09",out:"10",nov:"11",dez:"12",janeiro:"01",fevereiro:"02","março":"03",abril:"04",maio:"05",junho:"06",julho:"07",agosto:"08",setembro:"09",outubro:"10",novembro:"11",dezembro:"12" };
const MESES_LABEL = { jan:"JAN",fev:"FEV",mar:"MAR",abr:"ABR",mai:"MAI",jun:"JUN",jul:"JUL",ago:"AGO",set:"SET",out:"OUT",nov:"NOV",dez:"DEZ",janeiro:"JAN",fevereiro:"FEV","março":"MAR",abril:"ABR",maio:"MAI",junho:"JUN",julho:"JUL",agosto:"AGO",setembro:"SET",outubro:"OUT",novembro:"NOV",dezembro:"DEZ" };

function parsearData(texto = "") {
  if (!texto) return null;
  // "03 abr 2026" ou "março 29" ou "outubro 18 @ 08:30"
  const m1 = texto.toLowerCase().match(/(\d{1,2})\s+([a-záéíóú]{3,})[,\s@]+(\d{4})/);
  if (m1) {
    const dia = m1[1].padStart(2,"0");
    const mesKey = m1[2].substring(0,3);
    const ano = m1[3];
    if (!MESES_ISO[mesKey] && !MESES_ISO[m1[2]]) return null;
    const mesNum = MESES_ISO[mesKey] || MESES_ISO[m1[2]];
    const mesLbl = MESES_LABEL[mesKey] || MESES_LABEL[m1[2]];
    return { iso:`${ano}-${mesNum}-${dia}`, label:`${dia} ${mesLbl} ${ano}`, dia, mes:mesLbl, ano };
  }
  // "março 29" sem ano
  const m2 = texto.toLowerCase().match(/([a-záéíóú]+)\s+(\d{1,2})/);
  if (m2) {
    const mesKey = m2[1].substring(0,3);
    const mesCompleto = m2[1];
    const mesNum = MESES_ISO[mesKey] || MESES_ISO[mesCompleto];
    const mesLbl = MESES_LABEL[mesKey] || MESES_LABEL[mesCompleto];
    if (!mesNum) return null;
    const dia = m2[2].padStart(2,"0");
    const ano = String(new Date().getFullYear());
    return { iso:`${ano}-${mesNum}-${dia}`, label:`${dia} ${mesLbl} ${ano}`, dia, mes:mesLbl, ano };
  }
  return null;
}

async function buscarPagina(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html", "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi,"")
      .replace(/<style[\s\S]*?<\/style>/gi,"")
      .replace(/<img[^>]*>/gi,"")
      .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_,href,txt) => {
        const t = txt.replace(/<[^>]+>/g,"").trim();
        return t ? `[${t}](${href})` : "";
      })
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_,n,c) => "#".repeat(+n)+" "+c.replace(/<[^>]+>/g,"").trim())
      .replace(/<[^>]+>/g,"\n")
      .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#8211;/g,"–").replace(/&#8217;/g,"'")
      .replace(/\n{3,}/g,"\n\n").trim();
  } catch(e) {
    return "";
  }
}

// ── PARSER SUACORRIDA ─────────────────────────────────────
function parsearSuaCorrida(texto) {
  const provas = [], descartados = [];
  const linhas = texto.split("\n").map(l=>l.trim()).filter(Boolean);
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const temData = /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+\d{1,2}/i.test(linha);
    if (!temData) { i++; continue; }

    let nome=null, link=null, localRaw=null;
    for (let j=i+1; j<Math.min(i+6,linhas.length); j++) {
      const nomeMatch = linhas[j].match(/###\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (nomeMatch) {
        nome = nomeMatch[1].trim().replace(/&amp;/g,"&").replace(/&#8211;/g,"–").replace(/\s+/g," ");
        link = nomeMatch[2].trim();
        const prox = linhas[j+1]||"";
        if (!prox.startsWith("#")&&!prox.startsWith("http")&&!prox.startsWith("![")&&prox.length<120&&!/\b(janeiro|fevereiro)\b/i.test(prox)) {
          localRaw = prox;
        }
        break;
      }
    }

    if (!nome) { i++; continue; }
    if (ehKids(nome)) { descartados.push({motivo:"kids",valor:nome}); i++; continue; }
    if (!ehCorrida("",nome)) { descartados.push({motivo:"não corrida",valor:nome}); i++; continue; }

    const data = parsearData(linha);
    if (!data) { descartados.push({motivo:"sem data",valor:nome}); i++; continue; }

    // Cidade
    let cidade=null, estado=null, pais="BRA", country="Brasil";
    if (localRaw) {
      const intl = detectarInternacional(localRaw+" "+nome);
      if (intl) { cidade=intl.cidade; pais=intl.pais; country="Internacional"; }
      else {
        const p = localRaw.split(",").map(x=>x.trim());
        cidade = p[0]||null;
        estado = p[1]||null;
      }
    }
    if (!cidade) { const inf = inferirCidade(nome); if(inf){cidade=inf.cidade;estado=inf.estado;} }

    const blocoTexto = linhas.slice(i,Math.min(i+8,linhas.length)).join(" ");
    const dist = extrairDistancia(nome+" "+(localRaw||"")+" "+blocoTexto);
    const tipo = classificarTipo(nome);
    const dif  = classificarDificuldade(nome, dist.km);

    provas.push({
      nome, link, data, cidade, estado, pais, country,
      distanciaKm:dist.km, distancia:dist.label,
      tipo, dificuldade:dif, match:calcularMatch(dist.km),
      score:null, avaliacoes:0, preco:null, kit:null, abast:null,
      fonte:"SuaCorrida / Iguana Sports", coletadoEm:new Date().toISOString(),
    });
    i++;
  }
  return { provas, descartados };
}

// ── PARSER WEBRUN ─────────────────────────────────────────
function parsearWebrun(texto) {
  const provas = [], descartados = [];
  const blocos = texto.split(/^## /m).slice(1);
  for (const bloco of blocos) {
    const linhas = bloco.split("\n").map(l=>l.trim()).filter(Boolean);
    if (linhas.length < 3) continue;
    const nome = linhas[0].replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
    if (!nome||nome.length<3) continue;
    if (ehKids(nome)) { descartados.push({motivo:"kids",valor:nome}); continue; }

    const dataTexto = linhas.find(l=>/\d{1,2}\s+[a-z]{3}[,\s]+\d{4}/i.test(l));
    const data = dataTexto ? parsearData(dataTexto) : null;
    if (!data) { descartados.push({motivo:"sem data",valor:nome}); continue; }

    let modalidade="", cidade=null, estado=null;
    const linhaCM = linhas.find(l=>/corrida|trail|ultra|maratona/i.test(l)&&/[A-Z]{2}$/.test(l.trim()));
    if (linhaCM) {
      const partes = linhaCM.split("·").map(p=>p.trim());
      if (partes.length===2) { modalidade=partes[0]; const p=partes[1].split(",").map(x=>x.trim()); cidade=p[0]; estado=p[1]; }
      else { const p=linhaCM.split(",").map(x=>x.trim()); cidade=p[0]; estado=p[1]; }
    }

    if (!ehCorrida(modalidade,nome)) { descartados.push({motivo:`modalidade: ${modalidade||"?"}`,valor:nome}); continue; }

    const linkMatch = bloco.match(/\[Inscreva-se\]\(([^)]+)\)/i);
    const link = linkMatch?.[1]||null;
    const dist = extrairDistancia(nome);
    const tipo = classificarTipo(nome+" "+modalidade);
    const dif  = classificarDificuldade(nome, dist.km);

    provas.push({
      nome, link, data, cidade, estado, pais:"BRA", country:"Brasil",
      distanciaKm:dist.km, distancia:dist.label,
      tipo, dificuldade:dif, match:calcularMatch(dist.km),
      score:null, avaliacoes:0, preco:null, kit:null, abast:null,
      fonte:"Webrun", coletadoEm:new Date().toISOString(),
    });
  }
  return { provas, descartados };
}

// ── INTERNACIONAIS / CIDADES ──────────────────────────────
const INTL = { boston:{cidade:"Boston",pais:"EUA"}, london:{cidade:"Londres",pais:"GBR"}, berlin:{cidade:"Berlim",pais:"ALE"}, berlim:{cidade:"Berlim",pais:"ALE"}, chicago:{cidade:"Chicago",pais:"EUA"}, sydney:{cidade:"Sydney",pais:"AUS"}, "new york":{cidade:"Nova York",pais:"EUA"}, "nova york":{cidade:"Nova York",pais:"EUA"} };
function detectarInternacional(t="") { for(const[k,v] of Object.entries(INTL)) { if(t.toLowerCase().includes(k)) return v; } return null; }
const CIDADES_NOME = [
  {re:/sp city marathon|são silvestre|sao silvestre|ibirapuera|pinheiros|parque do povo|ponte estaiada/i, cidade:"São Paulo",estado:"SP"},
  {re:/maratona.*rio\b|rio.*maratona/i, cidade:"Rio de Janeiro",estado:"RJ"},
  {re:/curitiba/i, cidade:"Curitiba",estado:"PR"},
  {re:/porto alegre/i, cidade:"Porto Alegre",estado:"RS"},
  {re:/boston/i, cidade:"Boston",estado:null},
  {re:/london marathon/i, cidade:"Londres",estado:null},
  {re:/berlin marathon/i, cidade:"Berlim",estado:null},
];
function inferirCidade(nome="") { for(const p of CIDADES_NOME) { if(p.re.test(nome)) return {cidade:p.cidade,estado:p.estado}; } return null; }

// ── DEDUPLICAR ────────────────────────────────────────────
function deduplicar(provas) {
  const mapa = new Map();
  for (const p of provas) {
    const k = p.nome.toLowerCase().replace(/[^a-z0-9]/g,"").substring(0,30)+"_"+(p.data?.iso||"");
    if (!mapa.has(k)) mapa.set(k,p);
    else { const ex=mapa.get(k); if(!ex.cidade&&p.cidade) mapa.set(k,p); if(!ex.distanciaKm&&p.distanciaKm) mapa.set(k,p); }
  }
  return [...mapa.values()];
}

// ── EXIBIR ────────────────────────────────────────────────
function exibir(provas) {
  console.log("═".repeat(62));
  console.log("  📋 RESULTADO FINAL");
  console.log("═".repeat(62));
  const porFonte = {};
  for(const p of provas) porFonte[p.fonte]=(porFonte[p.fonte]||0)+1;
  console.log(`\n  ✅ Total: ${provas.length} provas únicas`);
  for(const[f,q] of Object.entries(porFonte)) console.log(`     • ${f}: ${q}`);
  provas.forEach((p,i)=>{
    const diff=p.dificuldade==="iniciante"?"🟢":p.dificuldade==="intermediaria"?"🟡":"🔴";
    const dist=p.distanciaKm?`${p.distanciaKm}km`:"?km";
    const cid=[p.cidade,p.estado].filter(Boolean).join(", ")||"?";
    console.log(`\n  ${String(i+1).padStart(3,"0")}. ${p.nome.substring(0,50)}`);
    console.log(`       📅 ${(p.data?.label||"?").padEnd(15)} 📍 ${cid}`);
    console.log(`       ${diff} ${p.dificuldade.padEnd(14)} 📏 ${dist.padEnd(6)} 🎯 ${p.match??'?'}%`);
  });
  const sD=provas.filter(p=>!p.distanciaKm).length;
  const sC=provas.filter(p=>!p.cidade).length;
  const sL=provas.filter(p=>!p.link).length;
  console.log("\n  📊 QUALIDADE");
  console.log(`     Distância: ${provas.length-sD}/${provas.length} ${sD===0?"✅":`⚠️  ${sD} sem`}`);
  console.log(`     Cidade:    ${provas.length-sC}/${provas.length} ${sC===0?"✅":`⚠️  ${sC} sem`}`);
  console.log(`     Link:      ${provas.length-sL}/${provas.length} ${sL===0?"✅":`⚠️  ${sL} sem`}`);
  console.log();
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(62));
  console.log("  🏁 PaceMarket — Scraper Unificado v5");
  console.log("  📡 SuaCorrida (todas as páginas) + Webrun");
  console.log("═".repeat(62));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  const todas=[], descartados=[];

  // ── SUACORRIDA: varre todas as páginas ──────────────────
  console.log("  ┌─ 1/2 SuaCorrida / Iguana Sports");
  let paginaAtual = 1;
  while (paginaAtual <= MAX_PAGINAS_SC) {
    const url = paginaAtual===1 ? SUACORRIDA_BASE : `${SUACORRIDA_BASE}pagina/${paginaAtual}/`;
    process.stdout.write(`  │  🔍 Página ${paginaAtual}/${MAX_PAGINAS_SC}... `);
    const texto = await buscarPagina(url);
    if (!texto) { console.log("sem resposta"); break; }

    // Detecta se é a última página (sem "próxima")
    const temProxima = texto.includes("Eventos seguinte") && !texto.includes("Eventos seguinte\n\n* [Hoje]");
    const { provas, descartados:desc } = parsearSuaCorrida(texto);
    console.log(`✅ ${provas.length} provas, ${desc.length} descartadas`);
    todas.push(...provas);
    descartados.push(...desc);

    if (!temProxima || provas.length === 0) break;
    paginaAtual++;
    await new Promise(r=>setTimeout(r,500)); // pausa entre páginas
  }

  // ── WEBRUN ───────────────────────────────────────────────
  console.log("  │");
  console.log("  └─ 2/2 Webrun");
  for (const url of WEBRUN_URLS) {
    process.stdout.write(`     🔍 ${url.replace("https://webrun.com.br","")}... `);
    const texto = await buscarPagina(url);
    if (!texto) { console.log("sem resposta"); continue; }
    const { provas, descartados:desc } = parsearWebrun(texto);
    console.log(`✅ ${provas.length} provas, ${desc.length} descartadas`);
    todas.push(...provas);
    descartados.push(...desc);
  }

  if (todas.length===0) {
    console.log("\n  ⚠️  Nenhuma prova coletada.\n");
    process.exit(0);
  }

  // Filtra só futuras, deduplica e ordena
  const hoje = new Date().toISOString().split("T")[0];
  const unicas = deduplicar(todas)
    .filter(p=>p.data?.iso && p.data.iso>=hoje)
    .sort((a,b)=>a.data.iso>b.data.iso?1:-1);

  exibir(unicas);

  const json = JSON.stringify(unicas, null, 2);
  fs.writeFileSync(ARQUIVO_SAIDA, json, "utf8");
  console.log(`  💾 ${ARQUIVO_SAIDA}  (${(json.length/1024).toFixed(1)} KB · ${unicas.length} provas)\n`);
  console.log("  🎯 Próximo passo: node enviar-firebase.js\n");
}

main().catch(e=>{console.error("\n  ❌ Erro:",e.message);process.exit(1);});
