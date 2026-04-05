/**
 * PaceMarket v4.0
 * ═══════════════════════════════════════════════════
 * Nova estrutura: 1 prova = 1 card com N distâncias
 * Usuário seleciona a distância e o match recalcula
 * ═══════════════════════════════════════════════════
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

// ── FIREBASE ──────────────────────────────────────────────
const FB_CONFIG = {
  apiKey:            "AIzaSyBwoiW0fZ1UL3h283x0sfmdroVi3_T14bE",
  authDomain:        "pacemarket-be6c9.firebaseapp.com",
  projectId:         "pacemarket-be6c9",
  storageBucket:     "pacemarket-be6c9.firebasestorage.app",
  messagingSenderId: "583598891691",
  appId:             "1:583598891691:web:bfaf831e3b85bdbbfb4dee",
};
const fbApp = initializeApp(FB_CONFIG);
const db    = getFirestore(fbApp);
const UID   = "user_local";

// ── DESIGN ────────────────────────────────────────────────
const C = {
  neon:"#E8FF3A", neon2:"#3AFFD4", orange:"#FF5C1A",
  purple:"#8B5CF6", green:"#22C55E", yellow:"#EAB308",
  red:"#EF4444", gold:"#F59E0B", pink:"#EC4899",
  dark:"#080810", dark2:"#0F0F1A", dark3:"#161622",
  card:"#13131E", card2:"#1A1A28",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.12)",
  text:"#F0F0F5", muted:"#6B6B85", muted2:"#9494AA",
};
const FD = "'Barlow Condensed',sans-serif";
const FB = "'DM Sans',sans-serif";

// ═══════════════════════════════════════════════════════════
//  INTELIGÊNCIA
// ═══════════════════════════════════════════════════════════

function classificarNivel(pace) {
  const p = parseFloat(pace) || 6.0;
  if (p < 4.5) return { id:"elite",         label:"Elite",         icon:"👑", cor:C.gold   };
  if (p < 5.0) return { id:"avancado",      label:"Avançado",      icon:"🔥", cor:C.red    };
  if (p < 6.0) return { id:"intermediario", label:"Intermediário", icon:"⚡", cor:C.yellow };
  return             { id:"iniciante",      label:"Iniciante",     icon:"🌱", cor:C.green  };
}

function calcularMatch(prova, distKm, user) {
  if (!user) return { score:70, motivos:["Configure seu perfil"], chancePR:40, probSucesso:60, wowMoment:null };

  const pace     = parseFloat(user.pace)             || 6.0;
  const distPref = parseInt(user.distanciaPreferida) || 10;
  const km       = distKm                            || distPref;
  const nivel    = user.nivel                        || "iniciante";
  const dif      = km >= 30 ? "brutal" : km >= 21 ? "intermediaria" : "iniciante";
  const freq     = parseInt(user.frequencia)         || 3;

  let score = 0;
  const motivos = [];

  // Distância (35pts)
  const dd = Math.abs(km - distPref);
  if (dd === 0)      { score += 35; motivos.push(`Distância ideal para você (${km}km)`); }
  else if (dd <= 3)  { score += 28; motivos.push("Distância próxima da sua preferência"); }
  else if (dd <= 7)  { score += 20; motivos.push("Boa para ampliar sua distância"); }
  else if (dd <= 15) { score += 12; motivos.push("Desafio de distância para você"); }
  else               { score += 5;  motivos.push("Distância bem acima do seu nível"); }

  // Dificuldade vs nível (30pts)
  const compat = {
    iniciante:    { iniciante:30, intermediaria:18, brutal:5  },
    intermediario:{ iniciante:20, intermediaria:30, brutal:14 },
    avancado:     { iniciante:12, intermediaria:22, brutal:30 },
    elite:        { iniciante:8,  intermediaria:18, brutal:30 },
  };
  const ptsDif = compat[nivel]?.[dif] ?? 15;
  score += ptsDif;
  if (ptsDif >= 28)      motivos.push("Dificuldade perfeita para seu nível");
  else if (ptsDif >= 18) motivos.push("Dificuldade dentro do seu alcance");
  else                   motivos.push("Prova exige preparação extra");

  // Pace (20pts)
  const isTrl = prova.tipo === "trail";
  if (!isTrl && pace <= 5.0)  { score += 20; motivos.push("Percurso rápido para seu pace elite"); }
  else if (!isTrl && pace <= 6.0) { score += 17; motivos.push("Compatível com seu pace atual"); }
  else if (isTrl)             { score += 14; motivos.push("Trail adequado para seu ritmo"); }
  else                        { score += 11; motivos.push("Percurso acessível para seu ritmo"); }

  // Frequência (15pts)
  if (freq >= 4)      { score += 15; motivos.push("Frequência de treino ideal para essa prova"); }
  else if (freq >= 3) { score += 10; motivos.push("Treinos suficientes para essa distância"); }
  else                { score += 5;  motivos.push("Aumente a frequência para melhor preparo"); }

  // Bônus objetivo
  if (user.objetivo === "meia maratona" && km === 21) { score = Math.min(100, score+8); motivos.unshift("🎯 Alinhada com seu objetivo!"); }
  if (user.objetivo === "maratona"      && km === 42) { score = Math.min(100, score+8); motivos.unshift("🎯 Alinhada com seu objetivo!"); }

  score = Math.min(100, Math.max(0, score));

  const chancePR    = Math.min(99, Math.round(dd === 0 ? score * 0.9 + (freq >= 4 ? 8 : 0) : score * 0.5));
  const probSucesso = Math.min(99, Math.round(score * 0.85 + freq * 2));

  let wowMoment = null;
  if (score >= 95)         wowMoment = "🔥 Match quase perfeito para você!";
  else if (chancePR >= 85) wowMoment = `🏆 ${chancePR}% de chance de bater seu PR!`;
  else if (score >= 80 && km > distPref) wowMoment = "🚀 Perfeita para subir de distância!";
  else if (score >= 85)    wowMoment = "⭐ Uma das melhores provas para seu perfil";

  return { score, motivos:motivos.slice(0,3), chancePR, probSucesso, wowMoment };
}

function getProvasRecomendadas(user, provas, limite = 6) {
  return provas
    .map(p => {
      // Pega a distância mais próxima da preferência do usuário
      const distPref = parseInt(user?.distanciaPreferida) || 10;
      const dists = p.distancias || [];
      const melhorDist = dists.length > 0
        ? dists.reduce((a, b) => Math.abs(a.km - distPref) <= Math.abs(b.km - distPref) ? a : b)
        : { km: p.distanciaKm || 10 };
      const m = calcularMatch(p, melhorDist.km, user);
      return { ...p, _match: m, _distSelecionada: melhorDist.km };
    })
    .sort((a, b) => b._match.score - a._match.score)
    .slice(0, limite);
}

// ── HELPERS ───────────────────────────────────────────────
const matchCor  = s => s >= 80 ? C.neon : s >= 60 ? C.yellow : C.red;
const matchGrad = s => s >= 80
  ? `linear-gradient(90deg,${C.neon2},${C.neon})`
  : `linear-gradient(90deg,${C.yellow},${C.orange})`;

function diffLabel(km) {
  if (km >= 30) return { label:"Difícil", cor:C.red,    bg:"rgba(239,68,68,0.1)",  bd:"rgba(239,68,68,0.22)"  };
  if (km >= 21) return { label:"Médio",   cor:C.yellow, bg:"rgba(234,179,8,0.1)",  bd:"rgba(234,179,8,0.22)"  };
  return              { label:"Fácil",    cor:C.green,  bg:"rgba(34,197,94,0.1)",  bd:"rgba(34,197,94,0.22)"  };
}

// ── COMPONENTES BASE ──────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", minHeight:300, gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${C.border2}`, borderTopColor:C.neon, animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13, color:C.muted }}>Carregando...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StatusBar() {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 24px 0", fontSize:12, fontWeight:600, color:C.text, position:"relative" }}>
      <span>9:41</span>
      <div style={{ width:110, height:26, background:C.dark2, borderRadius:"0 0 14px 14px", position:"absolute", top:0, left:"50%", transform:"translateX(-50%)" }} />
      <span style={{ fontSize:11 }}>●●● WiFi 🔋</span>
    </div>
  );
}

function BottomNav({ active, onNav }) {
  const items = [
    { id:"home",    icon:"🏠", label:"Home"     },
    { id:"explore", icon:"🔍", label:"Explorar" },
    { id:"saved",   icon:"❤️", label:"Salvos"   },
    { id:"profile", icon:"👤", label:"Perfil"   },
  ];
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:76, background:"rgba(10,10,18,0.97)", backdropFilter:"blur(20px)", borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-around", padding:"0 8px 10px" }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onNav(it.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer", flex:1, color:active===it.id?C.neon:C.muted, fontFamily:FB, fontSize:9, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>
          <span style={{ fontSize:20 }}>{it.icon}</span>{it.label}
          <div style={{ width:4, height:4, borderRadius:"50%", background:C.neon, opacity:active===it.id?1:0 }} />
        </button>
      ))}
    </div>
  );
}

function ProBadge() {
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:"linear-gradient(135deg,rgba(245,158,11,0.2),rgba(245,158,11,0.1))", border:"1px solid rgba(245,158,11,0.4)", borderRadius:100, padding:"2px 8px", fontSize:9, fontWeight:800, color:C.gold }}>✦ PRO</span>;
}

function LockRow({ label, onUpgrade }) {
  return (
    <div onClick={onUpgrade} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(139,92,246,0.05)", border:`1px solid rgba(139,92,246,0.2)`, borderRadius:9, padding:"8px 12px", cursor:"pointer" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span>🔒</span>
        <span style={{ fontSize:11, color:C.muted2 }}>{label}</span>
      </div>
      <span style={{ fontSize:9, fontWeight:800, color:C.purple, background:"rgba(139,92,246,0.15)", padding:"3px 8px", borderRadius:100 }}>PRO</span>
    </div>
  );
}

// ── SELETOR DE DISTÂNCIA ──────────────────────────────────
function DistSelector({ distancias, selecionada, onSelect }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {distancias.map(d => {
        const sel = selecionada === d.km;
        return (
          <button key={d.km} onClick={e => { e.stopPropagation(); onSelect(d.km); }}
            style={{
              background: sel ? C.neon : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${sel ? C.neon : C.border2}`,
              borderRadius: 8, padding:"5px 10px", cursor:"pointer",
              fontSize:11, fontWeight:700, color: sel ? C.dark : C.muted2,
              transition:"all 0.15s", transform: sel ? "scale(1.05)" : "scale(1)",
            }}>
            {d.km}km
          </button>
        );
      })}
    </div>
  );
}

// ── CARD DE PROVA ─────────────────────────────────────────
function ProvaCard({ prova, onRace, user, salvo, onSalvo, loadingSalvo, isPro, onUpgrade }) {
  const distPref = parseInt(user?.distanciaPreferida) || 10;
  const dists    = prova.distancias || [];

  // Seleciona automaticamente a distância mais próxima da preferência
  const defaultDist = dists.length > 0
    ? dists.reduce((a, b) => Math.abs(a.km - distPref) <= Math.abs(b.km - distPref) ? a : b).km
    : (prova.distanciaKm || 10);

  const [distSel, setDistSel] = useState(defaultDist);

  const match  = useMemo(() => calcularMatch(prova, distSel, user), [prova, distSel, user]);
  const dLabel = diffLabel(distSel);
  const distObj = dists.find(d => d.km === distSel) || { km: distSel, preco: prova.preco };
  const c = matchCor(match.score);

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", position:"relative" }}>
      {/* Linha de cor do match no topo */}
      <div style={{ height:3, background:matchGrad(match.score) }} />

      <div style={{ padding:"12px 13px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div style={{ flex:1, paddingRight:8 }}>
            <div style={{ fontFamily:FD, fontSize:16, fontWeight:800, lineHeight:1.1, color:C.text, marginBottom:3, cursor:"pointer" }}
              onClick={() => onRace(prova, distSel)}>
              {prova.nome}
            </div>
            <div style={{ fontSize:9, color:C.muted }}>
              📅 {prova.data?.label || "Data a confirmar"} &nbsp;·&nbsp; 📍 {prova.cidade || "Brasil"}{prova.estado ? `, ${prova.estado}` : ""}
            </div>
          </div>
          {/* Botão salvar */}
          <button onClick={e => { e.stopPropagation(); onSalvo(prova, distSel); }}
            style={{ background:salvo?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.05)", border:`1px solid ${salvo?"rgba(239,68,68,0.4)":C.border2}`, borderRadius:8, padding:"5px 7px", cursor:"pointer", fontSize:14, transition:"all 0.2s", transform:loadingSalvo===prova.id?"scale(0.8)":"scale(1)", flexShrink:0 }}>
            {salvo ? "❤️" : "🤍"}
          </button>
        </div>

        {/* Seletor de distâncias */}
        {dists.length > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
              Escolha sua distância:
            </div>
            <DistSelector distancias={dists} selecionada={distSel} onSelect={setDistSel} />
          </div>
        )}

        {/* Info da distância selecionada */}
        <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:10, flexWrap:"wrap" }}>
          <span style={{ background:prova.tipo==="trail"?"rgba(58,255,212,0.07)":"rgba(232,255,58,0.07)", border:`1px solid ${prova.tipo==="trail"?"rgba(58,255,212,0.18)":"rgba(232,255,58,0.18)"}`, borderRadius:5, padding:"2px 7px", fontSize:9, fontWeight:700, textTransform:"uppercase", color:prova.tipo==="trail"?C.neon2:C.neon }}>
            {prova.tipo === "trail" ? "Trail" : "Urbana"}
          </span>
          <span style={{ background:dLabel.bg, border:`1px solid ${dLabel.bd}`, borderRadius:5, padding:"2px 7px", fontSize:9, fontWeight:700, color:dLabel.cor }}>
            {dLabel.label}
          </span>
          {distObj?.preco && (
            <span style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border2}`, borderRadius:5, padding:"2px 7px", fontSize:9, fontWeight:700, color:C.muted2 }}>
              {distObj.preco}
            </span>
          )}
        </div>

        {/* Match */}
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:9 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:9, color:C.muted, fontWeight:600 }}>🎯 Match para {distSel}km</span>
            <span style={{ fontFamily:FD, fontSize:16, fontWeight:800, color:c }}>{match.score}%</span>
          </div>
          <div style={{ height:4, background:C.dark3, borderRadius:2, overflow:"hidden", marginBottom:6 }}>
            <div style={{ height:"100%", width:`${match.score}%`, background:matchGrad(match.score), borderRadius:2, transition:"width 0.5s ease" }} />
          </div>
          <div style={{ fontSize:9, color:C.muted2 }}>✓ {match.motivos[0]}</div>
        </div>

        {/* Wow moment */}
        {match.wowMoment && (
          <div style={{ marginTop:7, background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:7, padding:"5px 9px", fontSize:9, fontWeight:700, color:C.gold }}>
            {match.wowMoment}
          </div>
        )}

        {/* Botão ver detalhes */}
        <button onClick={() => onRace(prova, distSel)}
          style={{ width:"100%", marginTop:10, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border2}`, borderRadius:9, padding:"8px", fontSize:11, fontWeight:700, color:C.muted2, cursor:"pointer", fontFamily:FB }}>
          Ver detalhes e inscrição →
        </button>
      </div>
    </div>
  );
}

// ── DETALHE ───────────────────────────────────────────────
function DetalheScreen({ prova, distInicial, onVoltar, user, salvo, onSalvo, loadingSalvo, isPro, onUpgrade }) {
  const dists   = prova.distancias || [];
  const [distSel, setDistSel] = useState(distInicial || (dists[0]?.km || prova.distanciaKm || 10));
  const match   = useMemo(() => calcularMatch(prova, distSel, user), [prova, distSel, user]);
  const distObj = dists.find(d => d.km === distSel) || { km:distSel, preco:prova.preco, link:prova.link };
  const c = matchCor(match.score);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      {/* Hero */}
      <div style={{ height:180, background:"linear-gradient(160deg,#051A14,#071F18,#0A0F1A)", position:"relative", display:"flex", alignItems:"flex-end", padding:"16px 18px", overflow:"hidden" }}>
        <button onClick={onVoltar} style={{ position:"absolute", top:50, left:16, zIndex:10, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(12px)", border:`1px solid ${C.border2}`, borderRadius:10, padding:"7px 11px", fontSize:16, color:C.text, cursor:"pointer" }}>←</button>
        <div style={{ position:"absolute", top:50, right:16, zIndex:10 }}>
          <button onClick={() => onSalvo(prova, distSel)}
            style={{ background:salvo?"rgba(239,68,68,0.15)":"rgba(0,0,0,0.5)", backdropFilter:"blur(12px)", border:`1px solid ${salvo?"rgba(239,68,68,0.4)":C.border2}`, borderRadius:10, padding:"7px 10px", fontSize:14, cursor:"pointer" }}>
            {salvo ? "❤️" : "🤍"}
          </button>
        </div>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ background:C.neon2, color:C.dark, fontSize:9, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", padding:"2px 9px", borderRadius:5, display:"inline-block", marginBottom:7 }}>
            {prova.tipo==="trail" ? "🌿 Trail" : "🏙 Urbana"}
          </div>
          <div style={{ fontFamily:FD, fontSize:24, fontWeight:900, textTransform:"uppercase", lineHeight:0.95, color:C.text }}>{prova.nome}</div>
        </div>
      </div>

      <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:12, paddingBottom:16 }}>

        {/* Seletor de distância */}
        {dists.length > 0 && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted2, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>
              📏 Escolha sua distância
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {dists.map(d => {
                const sel = distSel === d.km;
                const dl  = diffLabel(d.km);
                return (
                  <button key={d.km} onClick={() => setDistSel(d.km)} style={{
                    background: sel ? `linear-gradient(135deg,rgba(232,255,58,0.12),rgba(58,255,212,0.06))` : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${sel ? C.neon : C.border2}`,
                    borderRadius:12, padding:"10px 14px", cursor:"pointer", textAlign:"center",
                    minWidth:60, transition:"all 0.15s",
                  }}>
                    <div style={{ fontFamily:FD, fontSize:20, fontWeight:900, color:sel?C.neon:C.text, lineHeight:1 }}>{d.km}km</div>
                    <div style={{ fontSize:8, color:sel?C.neon2:dl.cor, marginTop:2, fontWeight:700 }}>{dl.label}</div>
                    {d.preco && <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{d.preco}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Match */}
        <div style={{ background:"linear-gradient(135deg,rgba(232,255,58,0.06),rgba(58,255,212,0.03))", border:"1px solid rgba(232,255,58,0.18)", borderRadius:14, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:10, color:C.muted2, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>🎯 Match para {distSel}km</span>
            <span style={{ fontFamily:FD, fontSize:28, fontWeight:900, color:c }}>{match.score}%</span>
          </div>
          <div style={{ height:5, background:C.dark3, borderRadius:2, overflow:"hidden", marginBottom:10 }}>
            <div style={{ height:"100%", width:`${match.score}%`, background:matchGrad(match.score), borderRadius:2, transition:"width 0.8s ease" }} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ fontSize:10, color:C.muted2 }}>✓ {match.motivos[0]}</div>
            {isPro ? (
              <>
                {match.motivos.slice(1).map((m,i) => <div key={i} style={{ fontSize:10, color:C.muted2 }}>✓ {m}</div>)}
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <div style={{ flex:1, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontFamily:FD, fontSize:20, fontWeight:900, color:C.red }}>{match.chancePR}%</div>
                    <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase" }}>Chance de PR</div>
                  </div>
                  <div style={{ flex:1, background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontFamily:FD, fontSize:20, fontWeight:900, color:C.green }}>{match.probSucesso}%</div>
                    <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase" }}>Prob. sucesso</div>
                  </div>
                </div>
              </>
            ) : (
              <LockRow label={`${match.chancePR}% de chance de bater seu PR nessa distância`} onUpgrade={onUpgrade} />
            )}
          </div>
          {match.wowMoment && <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:C.gold }}>{match.wowMoment}</div>}
        </div>

        {/* Info */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {[
            ["📅","Data",prova.data?.label||"A confirmar"],
            ["📍","Local",prova.cidade?`${prova.cidade}${prova.estado?`, ${prova.estado}`:""}`:"-"],
            ["📏","Distância selecionada",`${distSel} km`],
            ["🏷️","Tipo",prova.tipo==="trail"?"Trail":"Corrida de Rua"],
          ].map(([ic,lbl,val]) => (
            <div key={lbl} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{ic}</span>
              <div>
                <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{lbl}</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Inscrição */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase" }}>Inscrição — {distSel}km</div>
            <div style={{ fontFamily:FD, fontSize:32, fontWeight:900, color:C.neon, lineHeight:1 }}>{distObj?.preco || "Ver site"}</div>
          </div>
          <a href={distObj?.link || prova.link} target="_blank" rel="noopener noreferrer"
            style={{ background:C.neon, color:C.dark, fontFamily:FD, fontSize:14, fontWeight:900, letterSpacing:"0.05em", textTransform:"uppercase", border:"none", borderRadius:11, padding:"13px 16px", cursor:"pointer", textDecoration:"none" }}>
            Inscrever-se →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── HOOKS ─────────────────────────────────────────────────
function useProvas() {
  const [todas, setTodas]   = useState([]);
  const [loading, setLoad]  = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "provas"));
        if (!snap.empty) {
          const hoje = new Date().toISOString().split("T")[0];
          setTodas(snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(p => p.data?.iso && p.data.iso >= hoje));
        }
      } catch(e) { console.warn(e.message); }
      finally { setLoad(false); }
    })();
  }, []);
  return { todas, loading };
}

function useUser() {
  const [user, setUser]       = useState(null);
  const [loadingUser, setLU]  = useState(true);
  useEffect(() => {
    (async () => {
      try { const s = await getDoc(doc(db,"users",UID)); if(s.exists()) setUser(s.data()); }
      catch(e) { console.warn(e.message); }
      finally { setLU(false); }
    })();
  }, []);
  const salvarUser = useCallback(async dados => {
    try { await setDoc(doc(db,"users",UID), dados); setUser(dados); }
    catch(e) { console.warn(e.message); }
  }, []);
  return { user, loadingUser, salvarUser };
}

function useSalvos() {
  const [salvos, setSalvos] = useState({});
  const [loadingSalvo, setLS] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const s = await getDocs(collection(db,"users",UID,"salvos"));
        const m = {}; s.docs.forEach(d => { m[d.id]=d.data(); }); setSalvos(m);
      } catch(e) { console.warn(e.message); }
    })();
  }, []);
  const toggleSalvo = useCallback(async (prova, distKm) => {
    const key = prova.id + "_" + distKm;
    setLS(prova.id);
    try {
      const ref = doc(db,"users",UID,"salvos",key);
      if (salvos[key]) {
        await deleteDoc(ref); setSalvos(p => { const n={...p}; delete n[key]; return n; });
      } else {
        const dados = { ...prova, distanciaSalva: distKm };
        await setDoc(ref, dados); setSalvos(p => ({ ...p, [key]: dados }));
      }
    } catch(e) { console.warn(e.message); }
    finally { setLS(null); }
  }, [salvos]);
  return { salvos, toggleSalvo, loadingSalvo };
}

// ══════════════════════════════════════════════════════════
//  TELAS
// ══════════════════════════════════════════════════════════

// ── ONBOARDING ────────────────────────────────────────────
function OnboardingScreen({ onConcluir }) {
  const [step, setStep]   = useState(0);
  const [dados, setDados] = useState({ pace:"6:00", distanciaPreferida:"10", objetivo:"performance", frequencia:"3" });

  const steps = [
    { emoji:"⚡", titulo:"Qual é seu pace médio?", subtitulo:"Tempo por km que você corre confortavelmente", campo:"pace",
      opcoes:[{valor:"4:30",label:"4:30 min/km",sub:"Elite"},{valor:"5:00",label:"5:00 min/km",sub:"Avançado"},{valor:"5:30",label:"5:30 min/km",sub:"Intermediário"},{valor:"6:00",label:"6:00 min/km",sub:"Regular"},{valor:"6:30",label:"6:30 min/km",sub:"Iniciante"},{valor:"7:00",label:"7:00+ min/km",sub:"Começando"}]},
    { emoji:"📏", titulo:"Distância favorita?", subtitulo:"A distância que você mais gosta de correr", campo:"distanciaPreferida",
      opcoes:[{valor:"5",label:"5 km",sub:"Corrida curta"},{valor:"10",label:"10 km",sub:"A mais popular"},{valor:"21",label:"21 km",sub:"Meia maratona"},{valor:"42",label:"42 km",sub:"Maratona"}]},
    { emoji:"🎯", titulo:"Qual é seu objetivo?", subtitulo:"O que você quer alcançar", campo:"objetivo",
      opcoes:[{valor:"performance",label:"Melhorar performance",sub:"Bater meu recorde"},{valor:"completar",label:"Completar uma prova",sub:"Cruzar a chegada"},{valor:"meia maratona",label:"Correr 21km",sub:"Minha primeira meia"},{valor:"maratona",label:"Correr 42km",sub:"O grande sonho"},{valor:"saude",label:"Saúde e prazer",sub:"Correr por bem-estar"}]},
    { emoji:"📅", titulo:"Frequência de treino?", subtitulo:"Quantas vezes você treina por semana", campo:"frequencia",
      opcoes:[{valor:"1",label:"1x por semana",sub:"Começando"},{valor:"2",label:"2x por semana",sub:"Leve"},{valor:"3",label:"3x por semana",sub:"Consistente"},{valor:"4",label:"4x por semana",sub:"Dedicado"},{valor:"5",label:"5x ou mais",sub:"Atleta"}]},
  ];
  const s = steps[step];
  function selecionar(valor) {
    const novos = { ...dados, [s.campo]: valor };
    setDados(novos);
    if (step < steps.length - 1) { setTimeout(() => setStep(step+1), 180); }
    else { const n = classificarNivel(novos.pace); onConcluir({ ...novos, nivel:n.id, plano:"free", criadoEm:new Date().toISOString() }); }
  }
  return (
    <div style={{ height:"100%", overflowY:"auto", fontFamily:FB, background:C.dark2 }}>
      <div style={{ padding:"52px 24px 24px", background:`linear-gradient(160deg,${C.dark2},#0A0A18)` }}>
        <div style={{ display:"flex", gap:4, marginBottom:20 }}>
          {steps.map((_,i) => <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=step?C.neon:C.border, transition:"background 0.3s" }} />)}
        </div>
        <div style={{ fontSize:32, marginBottom:8 }}>{s.emoji}</div>
        <div style={{ fontSize:11, color:C.muted, marginBottom:6, letterSpacing:"0.08em", textTransform:"uppercase" }}>{step+1} de {steps.length}</div>
        <div style={{ fontFamily:FD, fontSize:28, fontWeight:900, color:C.text, lineHeight:1.1, marginBottom:6 }}>{s.titulo}</div>
        <div style={{ fontSize:12, color:C.muted2 }}>{s.subtitulo}</div>
      </div>
      <div style={{ padding:"0 18px 100px", display:"flex", flexDirection:"column", gap:8 }}>
        {s.opcoes.map(op => {
          const sel = dados[s.campo] === op.valor;
          return (
            <button key={op.valor} onClick={() => selecionar(op.valor)} style={{ background:sel?"linear-gradient(135deg,rgba(232,255,58,0.08),rgba(58,255,212,0.04))":C.card, border:`1.5px solid ${sel?C.neon:C.border}`, borderRadius:14, padding:"14px 16px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all 0.15s" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:sel?C.neon:C.text, marginBottom:2 }}>{op.label}</div>
                <div style={{ fontSize:11, color:C.muted }}>{op.sub}</div>
              </div>
              <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${sel?C.neon:C.border2}`, background:sel?C.neon:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {sel && <div style={{ width:8, height:8, borderRadius:"50%", background:C.dark }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PAYWALL ───────────────────────────────────────────────
function PaywallModal({ onClose, onUpgrade }) {
  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:100, display:"flex", alignItems:"flex-end" }}>
      <div style={{ background:C.dark2, borderRadius:"24px 24px 0 0", padding:"32px 24px 48px", width:"100%", border:`1px solid ${C.border2}` }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👑</div>
          <div style={{ fontFamily:FD, fontSize:28, fontWeight:900, color:C.gold, marginBottom:6 }}>PaceMarket PRO</div>
          <div style={{ fontSize:13, color:C.muted2, lineHeight:1.5 }}>Desbloqueia análise completa e chance de PR em cada distância</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
          {["🧠 Chance de bater seu PR em cada distância","🎯 Análise completa do match","📊 Probabilidade de sucesso","🗺 Plano de evolução personalizado","🔔 Alertas de provas ideais"].map((f,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:C.text }}>
              <span>{f.split(" ")[0]}</span><span>{f.split(" ").slice(1).join(" ")}</span>
            </div>
          ))}
        </div>
        <button onClick={onUpgrade} style={{ width:"100%", background:`linear-gradient(135deg,${C.gold},#D97706)`, color:C.dark, fontFamily:FD, fontSize:18, fontWeight:900, border:"none", borderRadius:14, padding:"16px", cursor:"pointer", marginBottom:12 }}>
          ATIVAR PRO — R$14,90/mês
        </button>
        <button onClick={onClose} style={{ width:"100%", background:"transparent", border:"none", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:FB }}>
          Continuar no gratuito
        </button>
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────
function HomeScreen({ provas, loading, user, onRace, onBuscar, salvos, onSalvo, loadingSalvo, isPro, onUpgrade }) {
  const [busca, setBusca]    = useState("");
  const nivelInfo            = useMemo(() => user ? classificarNivel(user.pace) : null, [user]);
  const recomendadas         = useMemo(() => getProvasRecomendadas(user, provas, 3), [user, provas]);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ background:C.dark2, padding:"52px 18px 20px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-70, right:-50, width:260, height:260, background:"radial-gradient(circle,rgba(139,92,246,0.1),transparent 65%)", borderRadius:"50%", pointerEvents:"none" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, position:"relative", zIndex:1 }}>
          <div>
            <div style={{ fontSize:12, color:C.muted2 }}>Bom dia, corredor 👋</div>
            {nivelInfo && <div style={{ fontSize:10, color:nivelInfo.cor, marginTop:2, fontWeight:700 }}>{nivelInfo.icon} {nivelInfo.label} · {user.pace} min/km</div>}
          </div>
          {!isPro && (
            <button onClick={onUpgrade} style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.08))", border:"1px solid rgba(245,158,11,0.3)", borderRadius:100, padding:"4px 10px", fontSize:9, fontWeight:800, color:C.gold, cursor:"pointer", fontFamily:FB }}>✦ PRO</button>
          )}
        </div>
        <div style={{ fontFamily:FD, fontSize:36, fontWeight:900, lineHeight:0.95, marginBottom:16, color:C.text }}>
          Sua próxima<br/><span style={{ color:C.neon }}>corrida</span><br/><span style={{ color:C.neon2 }}>perfeita.</span>
        </div>
        <div style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${busca?C.neon2:C.border2}`, borderRadius:12, padding:"11px 14px", display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ fontSize:15 }}>🔎</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key==="Enter"&&busca.trim()&&onBuscar(busca)} placeholder="Buscar por prova ou cidade..." style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:C.text, fontFamily:FB }} />
          {busca && <button onClick={() => onBuscar(busca)} style={{ background:C.neon, color:C.dark, border:"none", borderRadius:7, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Buscar</button>}
        </div>
      </div>

      <div style={{ display:"flex", gap:7, padding:"12px 18px" }}>
        {[[String(provas.length),"Provas"],[String(Object.keys(salvos).length),"Salvos"],["IA","Match"]].map(([v,l]) => (
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:"10px 8px", flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:FD, fontSize:v.length>4?14:22, fontWeight:800, color:C.neon, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:9, color:C.muted, marginTop:2, textTransform:"uppercase", letterSpacing:"0.04em" }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 18px", marginBottom:10 }}>
        <span style={{ fontFamily:FD, fontSize:16, fontWeight:800, textTransform:"uppercase", color:C.text }}>🎯 Para você</span>
        <span onClick={() => onBuscar("")} style={{ fontSize:11, color:C.neon, fontWeight:700, cursor:"pointer" }}>Ver todas →</span>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ padding:"0 18px", display:"flex", flexDirection:"column", gap:10, paddingBottom:16 }}>
          {recomendadas.map(r => (
            <ProvaCard key={r.id} prova={r} onRace={onRace} user={user}
              salvo={!!Object.keys(salvos).find(k => k.startsWith(r.id))}
              onSalvo={onSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={onUpgrade} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── EXPLORAR ──────────────────────────────────────────────
function ExploreScreen({ provas, loading, user, onRace, buscaInicial, salvos, onSalvo, loadingSalvo, isPro, onUpgrade }) {
  const [busca, setBusca] = useState(buscaInicial||"");
  const [tipo, setTipo]   = useState("Todas");
  const [ordem, setOrdem] = useState("match");
  const tipos = ["Todas","Corrida de Rua","Trail","5km","10km","21km","42km"];

  const filtradas = useMemo(() => {
    let r = [...provas];
    if (busca.trim()) { const t=busca.toLowerCase(); r=r.filter(p=>p.nome?.toLowerCase().includes(t)||p.cidade?.toLowerCase().includes(t)); }
    if (tipo==="Trail")        r=r.filter(p=>p.tipo==="trail");
    if (tipo==="Corrida de Rua") r=r.filter(p=>p.tipo==="urban");
    if (["5km","10km","21km","42km"].includes(tipo)) {
      const km=parseInt(tipo); r=r.filter(p=>(p.distancias||[]).some(d=>d.km===km));
    }
    if (ordem==="match") r=r.map(p=>({...p,_s:calcularMatch(p,parseInt(user?.distanciaPreferida)||10,user).score})).sort((a,b)=>b._s-a._s);
    if (ordem==="data")  r.sort((a,b)=>(a.data?.iso||"")>(b.data?.iso||"")?1:-1);
    return r;
  }, [provas, busca, tipo, ordem, user]);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ background:C.dark2, padding:"52px 18px 16px" }}>
        <div style={{ fontFamily:FD, fontSize:32, fontWeight:900, textTransform:"uppercase", lineHeight:0.95, marginBottom:14, color:C.text }}>Explorar<br/><span style={{ color:C.neon2 }}>Provas</span></div>
        <div style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${busca?C.neon2:C.border2}`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
          <span style={{ fontSize:14 }}>🔎</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Prova, cidade..." style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:C.text, fontFamily:FB }} />
          {busca && <button onClick={()=>setBusca("")} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }}>✕</button>}
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
          {tipos.map(t => <button key={t} onClick={()=>setTipo(t)} style={{ background:tipo===t?C.neon:C.card, border:`1px solid ${tipo===t?C.neon:C.border}`, borderRadius:100, padding:"6px 13px", fontSize:11, fontWeight:600, whiteSpace:"nowrap", color:tipo===t?C.dark:C.muted2, cursor:"pointer", flexShrink:0, fontFamily:FB }}>{t}</button>)}
        </div>
      </div>
      <div style={{ display:"flex", gap:6, padding:"10px 18px 0", overflowX:"auto", scrollbarWidth:"none" }}>
        {[["match","🎯 Por match"],["data","📅 Por data"]].map(([v,l]) => (
          <button key={v} onClick={()=>setOrdem(v)} style={{ background:ordem===v?C.card2:C.card, border:`1px solid ${ordem===v?C.neon2:C.border2}`, borderRadius:9, padding:"6px 12px", fontSize:11, fontWeight:600, whiteSpace:"nowrap", flexShrink:0, color:ordem===v?C.neon2:C.muted2, cursor:"pointer", fontFamily:FB }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 18px 4px" }}>
        <span style={{ fontSize:10, color:C.muted }}>{loading?"Carregando...":`${filtradas.length} provas`}</span>
        {busca && <span onClick={()=>setBusca("")} style={{ fontSize:10, color:C.neon, fontWeight:700, cursor:"pointer" }}>Limpar ✕</span>}
      </div>
      {loading ? <Spinner /> : filtradas.length===0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:200, gap:12, padding:24 }}>
          <span style={{ fontSize:36 }}>🔍</span>
          <span style={{ fontFamily:FD, fontSize:18, fontWeight:700, color:C.text }}>Nada encontrado</span>
          <button onClick={()=>{setBusca("");setTipo("Todas");}} style={{ background:C.neon, color:C.dark, border:"none", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Ver todas</button>
        </div>
      ) : (
        <div style={{ padding:"6px 18px", display:"flex", flexDirection:"column", gap:10, paddingBottom:16 }}>
          {filtradas.map(r => (
            <ProvaCard key={r.id} prova={r} onRace={onRace} user={user}
              salvo={!!Object.keys(salvos).find(k=>k.startsWith(r.id))}
              onSalvo={onSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={onUpgrade} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── SALVOS ────────────────────────────────────────────────
function SavedScreen({ salvos, onRace, user, onSalvo, loadingSalvo, isPro, onUpgrade }) {
  const lista = Object.values(salvos);
  if (lista.length===0) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:16, padding:24, fontFamily:FB }}>
      <span style={{ fontSize:48 }}>🤍</span>
      <span style={{ fontFamily:FD, fontSize:22, fontWeight:900, textTransform:"uppercase", color:C.text }}>Nenhuma prova salva</span>
      <span style={{ fontSize:13, color:C.muted, textAlign:"center" }}>Toque no ❤️ para salvar uma prova</span>
    </div>
  );
  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ background:C.dark2, padding:"52px 18px 20px" }}>
        <div style={{ fontFamily:FD, fontSize:32, fontWeight:900, textTransform:"uppercase", color:C.text }}>Provas<br/><span style={{ color:C.red }}>Salvas ❤️</span></div>
        <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>{lista.length} prova{lista.length!==1?"s":""}</div>
      </div>
      <div style={{ padding:"12px 18px", display:"flex", flexDirection:"column", gap:10, paddingBottom:16 }}>
        {lista.map(r => (
          <ProvaCard key={r.id+(r.distanciaSalva||"")} prova={r} onRace={onRace} user={user}
            salvo={true} onSalvo={onSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={onUpgrade} />
        ))}
      </div>
    </div>
  );
}

// ── PERFIL ────────────────────────────────────────────────
function ProfileScreen({ user, onEditar, provas, onRace, onUpgrade, isPro }) {
  const nivelInfo    = useMemo(() => classificarNivel(user?.pace), [user]);
  const recomendadas = useMemo(() => getProvasRecomendadas(user, provas, 2), [user, provas]);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ background:`linear-gradient(160deg,#0A0020,#0F0F1A)`, padding:"52px 18px 22px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-50, right:-60, width:200, height:200, background:"radial-gradient(circle,rgba(139,92,246,0.12),transparent 65%)", borderRadius:"50%" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${nivelInfo.cor}44,${nivelInfo.cor}22)`, border:`2px solid ${nivelInfo.cor}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{nivelInfo.icon}</div>
            <div>
              <div style={{ fontFamily:FD, fontSize:22, fontWeight:900, color:C.text }}>Meu Perfil</div>
              <div style={{ fontSize:11, color:nivelInfo.cor, fontWeight:700, marginTop:2 }}>{nivelInfo.label}</div>
            </div>
          </div>
          <button onClick={onEditar} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border2}`, borderRadius:9, padding:"7px 12px", fontSize:11, fontWeight:700, color:C.muted2, cursor:"pointer", fontFamily:FB }}>✏️ Editar</button>
        </div>
      </div>

      <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:12 }}>
        {!isPro && (
          <button onClick={onUpgrade} style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.05))", border:"1px solid rgba(245,158,11,0.3)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", width:"100%" }}>
            <div style={{ textAlign:"left" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><span style={{ fontSize:16 }}>👑</span><span style={{ fontSize:13, fontWeight:700, color:C.gold }}>Desbloquear PRO</span></div>
              <div style={{ fontSize:11, color:C.muted }}>Chance de PR · Análise completa por distância</div>
            </div>
            <span style={{ fontSize:12, color:C.gold }}>→</span>
          </button>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {[["⚡","Pace",`${user?.pace} min/km`],["📏","Distância fav.",`${user?.distanciaPreferida} km`],["🎯","Objetivo",user?.objetivo],["📅","Treinos/sem.",`${user?.frequencia}x`]].map(([ic,lbl,val]) => (
            <div key={lbl} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:"12px" }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{ic}</div>
              <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase", marginBottom:2 }}>{lbl}</div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, textTransform:"capitalize" }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"linear-gradient(135deg,rgba(139,92,246,0.08),rgba(58,255,212,0.04))", border:"1px solid rgba(139,92,246,0.2)", borderRadius:14, padding:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
            <div style={{ background:`linear-gradient(135deg,${C.purple},#6366F1)`, color:"#fff", fontSize:8, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", padding:"2px 8px", borderRadius:5 }}>✨ IA</div>
            <span style={{ fontSize:12, fontWeight:700, color:C.text }}>Recomendações para você</span>
          </div>
          {recomendadas.map(r => {
            const m = r._match || calcularMatch(r, r._distSelecionada||10, user);
            return (
              <button key={r.id} onClick={() => onRace(r, r._distSelecionada)} style={{ background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 12px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", marginBottom:7 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>{r.nome.substring(0,35)}</div>
                  <div style={{ fontSize:9, color:C.muted }}>📏 {r._distSelecionada}km · {r.data?.label||"A confirmar"}</div>
                </div>
                <span style={{ fontFamily:FD, fontSize:16, fontWeight:800, color:matchCor(m.score) }}>{m.score}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════════════════════════
export default function PaceMarket() {
  const [tela,  setTela]  = useState("home");
  const [prova, setProva] = useState(null);
  const [distDetalhe, setDistDetalhe] = useState(null);
  const [busca, setBusca] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);

  const { todas, loading }              = useProvas();
  const { user, loadingUser, salvarUser } = useUser();
  const { salvos, toggleSalvo, loadingSalvo } = useSalvos();

  const isPro = user?.plano === "pro";

  function abrirProva(p, distKm) { setProva(p); setDistDetalhe(distKm); setTela("detalhe"); }
  function navegar(id)           { setProva(null); setBusca(""); setTela(id); }
  function buscarExplore(t)      { setBusca(t); setTela("explore"); }

  async function concluirOnboarding(dados) { await salvarUser(dados); setTela("home"); }
  async function ativarPro() { if(user) { await salvarUser({...user,plano:"pro"}); setShowPaywall(false); } }

  if (loadingUser) return (
    <div style={{ width:"100%", height:"100vh", background:C.dark, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid rgba(255,255,255,0.1)`, borderTopColor:C.neon, animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const mostrarOnboarding = tela==="onboarding" || !user;
  const navAtivo = ["detalhe","onboarding"].includes(tela) ? "home" : tela;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;}
        input::placeholder{color:#6B6B85;}
        button{font-family:'DM Sans',sans-serif;}
      `}</style>

      <div style={{ width:"100%", minHeight:"100vh", background:C.dark, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 16px 40px", fontFamily:FB }}>
        {!mostrarOnboarding && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{ width:28, height:28, background:C.neon, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🏁</div>
            <span style={{ fontFamily:FD, fontSize:22, fontWeight:900, letterSpacing:"0.05em", textTransform:"uppercase", color:C.text }}>Pace<span style={{ color:C.neon }}>·</span>Market</span>
            <div style={{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:100, padding:"3px 10px", fontSize:9, fontWeight:700, color:C.muted2, marginLeft:6 }}>
              {isPro ? <span style={{ color:C.gold }}>✦ PRO</span> : <span>v4 · <span style={{ color:C.neon }}>free</span></span>}
            </div>
          </div>
        )}

        <div style={{ width:375, height:812, background:C.dark2, borderRadius:mostrarOnboarding?32:48, border:"1.5px solid rgba(255,255,255,0.08)", overflow:"hidden", position:"relative", boxShadow:"0 0 0 1px rgba(0,0,0,0.5),0 50px 100px rgba(0,0,0,0.7)", display:"flex", flexDirection:"column" }}>
          {mostrarOnboarding ? (
            <OnboardingScreen onConcluir={concluirOnboarding} />
          ) : (
            <>
              <StatusBar />
              <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
                {tela==="home"    && <HomeScreen    provas={todas} loading={loading} user={user} onRace={abrirProva} onBuscar={buscarExplore} salvos={salvos} onSalvo={toggleSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={()=>setShowPaywall(true)} />}
                {tela==="explore" && <ExploreScreen provas={todas} loading={loading} user={user} onRace={abrirProva} buscaInicial={busca} salvos={salvos} onSalvo={toggleSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={()=>setShowPaywall(true)} />}
                {tela==="detalhe" && prova && <DetalheScreen prova={prova} distInicial={distDetalhe} onVoltar={()=>setTela("explore")} user={user} salvo={!!Object.keys(salvos).find(k=>k.startsWith(prova.id))} onSalvo={toggleSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={()=>setShowPaywall(true)} />}
                {tela==="saved"   && <SavedScreen salvos={salvos} onRace={abrirProva} user={user} onSalvo={toggleSalvo} loadingSalvo={loadingSalvo} isPro={isPro} onUpgrade={()=>setShowPaywall(true)} />}
                {tela==="profile" && user && <ProfileScreen user={user} onEditar={()=>setTela("onboarding")} provas={todas} onRace={abrirProva} onUpgrade={()=>setShowPaywall(true)} isPro={isPro} />}
              </div>
              <BottomNav active={navAtivo} onNav={navegar} />
              {showPaywall && <PaywallModal onClose={()=>setShowPaywall(false)} onUpgrade={ativarPro} />}
            </>
          )}
        </div>

        {!mostrarOnboarding && (
          <div style={{ marginTop:14, fontSize:10, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {loading ? "Carregando..." : `${todas.length} provas · v4 · ${isPro?"PRO ✦":"Free"}`}
          </div>
        )}
      </div>
    </>
  );
}
