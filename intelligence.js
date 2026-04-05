/**
 * PaceMarket — Motor de Inteligência
 * Todas as funções de match, nível, recomendações e insights.
 * Importar em App.jsx: import * as AI from './intelligence'
 */

// ── NÍVEL DO CORREDOR ────────────────────────────────────
export function classificarNivel(pace) {
  const p = parseFloat(String(pace).replace(",", ".")) || 6.0;
  if (p < 4.5)  return { nivel: "elite",         label: "Elite",         icon: "👑", cor: "#FFD700", pts: 4 };
  if (p < 5.0)  return { nivel: "avancado",       label: "Avançado",      icon: "🔥", cor: "#EF4444", pts: 3 };
  if (p < 6.0)  return { nivel: "intermediario",  label: "Intermediário", icon: "⚡", cor: "#EAB308", pts: 2 };
  return              { nivel: "iniciante",       label: "Iniciante",     icon: "🌱", cor: "#22C55E", pts: 1 };
}

// ── BADGES ───────────────────────────────────────────────
export function calcularBadges(user) {
  const badges = [];
  const nivel = classificarNivel(user?.pace);
  const freq = parseInt(user?.frequencia) || 0;
  const dist = parseInt(user?.distanciaPreferida) || 0;

  if (nivel.nivel === "elite")         badges.push({ icon: "👑", label: "Elite Runner",    desc: "Pace abaixo de 4:30" });
  if (nivel.nivel === "avancado")      badges.push({ icon: "🔥", label: "Speed Demon",     desc: "Pace abaixo de 5:00" });
  if (nivel.nivel === "intermediario") badges.push({ icon: "⚡", label: "On The Rise",     desc: "Pace entre 5:00-6:00" });
  if (freq >= 5)  badges.push({ icon: "💪", label: "Ironwill",      desc: "5+ treinos por semana" });
  if (freq >= 3)  badges.push({ icon: "🎯", label: "Consistente",   desc: "3+ treinos por semana" });
  if (dist >= 42) badges.push({ icon: "🏆", label: "Maratonista",   desc: "Corre maratonas" });
  if (dist >= 21) badges.push({ icon: "🥈", label: "Half Runner",   desc: "Corre meias maratonas" });
  if (dist >= 10) badges.push({ icon: "🏃", label: "10K Runner",    desc: "Corredor de 10km" });

  return badges.slice(0, 4);
}

// ── SUGESTÃO DE EVOLUÇÃO ─────────────────────────────────
export function sugestaoEvolucao(user) {
  const dist = parseInt(user?.distanciaPreferida) || 10;
  const pace = parseFloat(String(user?.pace).replace(",", ".")) || 6.0;
  const freq = parseInt(user?.frequencia) || 3;

  const proxDist = { 3: 5, 5: 10, 10: 21, 21: 42, 42: 42 };
  const prox = proxDist[dist] || 10;
  const semanas = { 5: 4, 10: 6, 21: 12, 42: 20 };
  const semanasNecessarias = semanas[prox] || 8;

  if (dist === 42) return { texto: "Você já é um maratonista! Foco em bater seu PR.", semanas: 0, prox: 42 };

  const prontoAgora = (pace < 6.5 && freq >= 3 && dist >= (prox / 2));

  return {
    texto: prontoAgora
      ? `Você está pronto para evoluir para ${prox}km! 🎯`
      : `Continue treinando — em ${semanasNecessarias} semanas você estará pronto para ${prox}km`,
    semanas: prontoAgora ? 0 : semanasNecessarias,
    prox,
    pronto: prontoAgora,
  };
}

// ── MATCH AVANÇADO ───────────────────────────────────────
/**
 * calcularMatch(prova, usuario)
 * Retorna { score, motivos, probabilidadeSucesso, chancePR }
 */
export function calcularMatch(prova, usuario) {
  if (!usuario) {
    return { score: prova.match || 70, motivos: ["Configure seu perfil para match personalizado"], probabilidadeSucesso: 70, chancePR: 30 };
  }

  const paceUser   = parseFloat(String(usuario.pace).replace(",", ".")) || 6.0;
  const distPref   = parseInt(usuario.distanciaPreferida) || 10;
  const distProva  = prova.distanciaKm || 10;
  const nivelUser  = classificarNivel(paceUser).nivel;
  const freq       = parseInt(usuario.frequencia) || 3;
  const dif        = prova.dificuldade || "iniciante";
  const tipo       = prova.tipo || "urban";

  let score = 0;
  const motivos = [];
  const motivosBloqueados = [];

  // ── 1. DISTÂNCIA (35 pts) ────────────────────────────
  const diffDist = Math.abs(distProva - distPref);
  if (diffDist === 0) {
    score += 35; motivos.push("Distância ideal para você");
  } else if (diffDist <= 3) {
    score += 28; motivos.push("Distância muito próxima da sua preferência");
  } else if (diffDist <= 7) {
    score += 20; motivos.push("Boa prova para evolução de distância");
  } else if (diffDist <= 12) {
    score += 12; motivos.push("Distância desafiadora para seu perfil");
  } else {
    score += 5;  motivosBloqueados.push("Distância muito diferente da sua preferência");
  }

  // ── 2. DIFICULDADE vs NÍVEL (30 pts) ────────────────
  const tabela = {
    iniciante:    { iniciante: 30, intermediaria: 18, brutal: 5  },
    intermediario:{ iniciante: 20, intermediaria: 30, brutal: 14 },
    avancado:     { iniciante: 12, intermediaria: 22, brutal: 30 },
    elite:        { iniciante: 8,  intermediaria: 18, brutal: 30 },
  };
  const ptsDif = tabela[nivelUser]?.[dif] ?? 15;
  score += ptsDif;
  if (ptsDif >= 25) motivos.push(`Nível compatível com seu perfil`);
  else if (ptsDif >= 15) motivos.push("Bom desafio para seu nível atual");
  else motivosBloqueados.push("Prova acima do seu nível atual");

  // ── 3. PACE vs TIPO (20 pts) ─────────────────────────
  if (tipo === "trail" && paceUser > 6.0) {
    score += 10; motivosBloqueados.push("Trail exige treino específico de trilha");
  } else if (tipo === "trail" && paceUser <= 6.0) {
    score += 18; motivos.push("Trail compatível com seu ritmo");
  } else if (tipo === "urban" && paceUser < 5.5) {
    score += 20; motivos.push("Percurso rápido — ideal para o seu pace");
  } else {
    score += 15; motivos.push("Percurso urbano adequado ao seu nível");
  }

  // ── 4. FREQUÊNCIA (15 pts) ───────────────────────────
  if (freq >= 4) {
    score += 15; motivos.push("Sua frequência de treino é excelente");
  } else if (freq >= 3) {
    score += 10;
  } else {
    score += 5; motivosBloqueados.push("Aumente a frequência de treino para melhorar o match");
  }

  // ── BÔNUS OBJETIVO ───────────────────────────────────
  const obj = usuario.objetivo || "";
  if ((obj === "meia maratona" && distProva === 21) ||
      (obj === "maratona" && distProva === 42)) {
    score = Math.min(100, score + 8);
    motivos.push(`Alinhada com seu objetivo: ${obj}`);
  }
  if (obj === "performance" && dif !== "brutal") {
    score = Math.min(100, score + 5);
  }

  score = Math.min(100, Math.max(0, score));

  // ── PROBABILIDADE DE SUCESSO (PRO) ───────────────────
  let probSucesso = score;
  if (freq >= 4) probSucesso = Math.min(100, probSucesso + 8);
  if (diffDist === 0) probSucesso = Math.min(100, probSucesso + 5);
  probSucesso = Math.round(probSucesso * 0.95 + Math.random() * 5);

  // ── CHANCE DE PR (PRO) ───────────────────────────────
  let chancePR = 0;
  if (tipo === "urban" && dif === "iniciante" && paceUser < 5.5) chancePR = 85;
  else if (tipo === "urban" && dif === "iniciante") chancePR = 72;
  else if (tipo === "urban" && dif === "intermediaria") chancePR = 55;
  else if (tipo === "trail") chancePR = 35;
  else chancePR = 60;
  chancePR = Math.min(97, chancePR + (freq - 3) * 5);

  return {
    score,
    motivos:              motivos.slice(0, 3),
    motivosBloqueados:    motivosBloqueados.slice(0, 2),
    probabilidadeSucesso: Math.round(probSucesso),
    chancePR:             Math.round(chancePR),
  };
}

// ── RECOMENDAÇÕES ────────────────────────────────────────
export function getProvasRecomendadas(usuario, provas, limite = 10) {
  return [...provas]
    .map(p => {
      const m = calcularMatch(p, usuario);
      return { ...p, _matchData: m, _score: m.score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limite);
}

// ── WOW MOMENTS ─────────────────────────────────────────
export function gerarWowMoment(usuario, provas) {
  if (!usuario) return null;
  const nivel = classificarNivel(usuario.pace);
  const evolucao = sugestaoEvolucao(usuario);
  const dist = parseInt(usuario.distanciaPreferida) || 10;

  const mensagens = [
    nivel.nivel === "avancado" && "🔥 Você está entre os 20% mais rápidos do Brasil!",
    nivel.nivel === "elite" && "👑 Pace de elite! Você está no topo do jogo.",
    evolucao.pronto && `🎯 ${evolucao.texto}`,
    parseInt(usuario.frequencia) >= 4 && "💪 Treinar 4x/semana coloca você à frente de 80% dos corredores.",
    dist >= 21 && "🏅 Corredores de meia maratona são a elite do esporte amador.",
    "📈 Continue treinando — cada km te aproxima do seu melhor tempo.",
  ].filter(Boolean);

  return mensagens[Math.floor(Math.random() * mensagens.length)] || null;
}
