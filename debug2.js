/**
 * PaceMarket — debug2.js v3
 * Baixa o calendário do Webrun mês a mês para pegar mais provas.
 * Rodar: node debug2.js
 */
const { chromium } = require("playwright");
const fs = require("fs");

// Meses para buscar — ajuste conforme necessário
const ANO = 2026;
const MESES = [
  { num: "04", nome: "abril" },
  { num: "05", nome: "maio" },
  { num: "06", nome: "junho" },
  { num: "07", nome: "julho" },
  { num: "08", nome: "agosto" },
  { num: "09", nome: "setembro" },
  { num: "10", nome: "outubro" },
];

async function baixarMes(page, mes, ano) {
  // URL do Webrun filtrando por mês específico
  const url = `https://webrun.com.br/calendario/?tribe_eventcategory=&tribe-bar-date=${ano}-${mes}-01`;
  const urlAlt = `https://webrun.com.br/calendario-6-meses/?mes=${mes}&ano=${ano}`;

  console.log(`  🔍 ${mes}/${ano}...`);
  try {
    await page.goto(`https://webrun.com.br/calendario/`, {
      waitUntil: "domcontentloaded", timeout: 45000
    });
    await page.waitForTimeout(2000);

    // Scroll completo
    let lastH = 0;
    for (let i = 0; i < 25; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const h = await page.evaluate(() => document.body.scrollHeight);
      if (h === lastH) break;
      lastH = h;
    }
    await page.waitForTimeout(1000);

    const html = await page.content();
    const count = (html.match(/class="font-20/g) || []).length;
    return { html, count };
  } catch(e) {
    console.log(`     ❌ ${e.message.substring(0,50)}`);
    return { html: "", count: 0 };
  }
}

async function main() {
  console.log("═".repeat(54));
  console.log("  🌐 PaceMarket — Baixando calendário Webrun");
  console.log("═".repeat(54));
  console.log(`  ${new Date().toLocaleString("pt-BR")}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();
  await page.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot}", r => r.abort());

  // Estratégia: baixa as 3 páginas principais com scroll máximo
  const paginas = [
    { url: "https://webrun.com.br/calendario/",         arquivo: "webrun-mes.html",     label: "Mês atual" },
    { url: "https://webrun.com.br/calendario-3-meses/", arquivo: "webrun-3meses.html",  label: "3 meses"   },
    { url: "https://webrun.com.br/calendario-6-meses/", arquivo: "webrun-6meses.html",  label: "6 meses"   },
  ];

  let totalH2 = 0;

  for (const { url, arquivo, label } of paginas) {
    console.log(`  🔍 ${label}: ${url.replace("https://webrun.com.br","")}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(4000);

      // Scroll muito agressivo — vai até o fim várias vezes
      for (let volta = 0; volta < 3; volta++) {
        let lastH = 0;
        for (let i = 0; i < 40; i++) {
          await page.evaluate(() => window.scrollBy(0, 600));
          await page.waitForTimeout(300);
          const h = await page.evaluate(() => document.body.scrollHeight);
          if (h === lastH) break;
          lastH = h;
        }
        // Volta ao topo e espera carregar mais
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1500);
      }

      // Espera final
      await page.waitForTimeout(2000);

      const html = await page.content();
      const count = (html.match(/class="font-20/g) || []).length;
      fs.writeFileSync(arquivo, html, "utf8");

      console.log(`     ✅ ${arquivo} — ${(html.length/1024).toFixed(0)} KB · ${count} H2s (${Math.round(count/3)} eventos únicos)\n`);
      totalH2 += count;

    } catch(e) {
      console.log(`     ❌ ${e.message.substring(0,60)}\n`);
    }
  }

  await browser.close();

  console.log(`  📊 Total: ~${Math.round(totalH2/3)} eventos únicos encontrados`);
  console.log("  👉 Agora rode: node scanner.js\n");
}

main().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
