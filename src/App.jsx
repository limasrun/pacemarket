/**
 * PaceMarket — v3.0 (Produto 13/10)
 * ═══════════════════════════════════════════════════════
 * Sistema completo: Free/Pro, Match Avançado,
 * Gamificação, Onboarding, Wow Moments, Paywall
 * ═══════════════════════════════════════════════════════
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useProvas, useUser, useSalvos } from "./firebase";
import {
  calcularMatch, getProvasRecomendadas,
  classificarNivel, sugestaoEvolucao,
  calcularBadges, gerarWowMoment,
} from "./intelligence";

// ── CORES ────────────────────────────────────────────────
const C = {
  neon:"#E8FF3A", neon2:"#3AFFD4", orange:"#FF5C1A",
  purple:"#8B5CF6", gold:"#FFD700", green:"#22C55E",
  yellow:"#EAB308", red:"#EF4444",
  dark:"#080810", dark2:"#0F0F1A", dark3:"#161622",
  card:"#13131E", card2:"#1A1A28",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.12)",
  text:"#F0F0F5", muted:"#6B6B85", muted2:"#9494AA",
};
const FD = "'Barlow Condensed',sans-serif";
const FB = "'DM Sans',sans-serif";

const matchCor  = s => s >= 80 ? C.neon : s >= 60 ? C.yellow : C.red;
const matchGrad = s => s >= 80
  ? `linear-gradient(90deg,${C.neon2},${C.neon})`
  : `linear-gradient(90deg,${C.yellow},${C.orange})`;

function diffInfo(d) {
  const m = {
    iniciante:    { icon:"🟢", label:"Fácil",  cor:C.green,  bg:"rgba(34,197,94,0.1)",  bd:"rgba(34,197,94,0.22)"  },
    intermediaria:{ icon:"🟡", label:"Médio",  cor:C.yellow, bg:"rgba(234,179,8,0.1)",  bd:"rgba(234,179,8,0.22)"  },
    brutal:       { icon:"🔴", label:"Brutal", cor:C.red,    bg:"rgba(239,68,68,0.1)",  bd:"rgba(239,68,68,0.22)"  },
  };
  return m[d] || m.iniciante;
}

// ── COMPONENTES BASE ─────────────────────────────────────
function DiffBadge({ diff, small }) {
  const d = diffInfo(diff);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:d.bg,
      border:`1px solid ${d.bd}`, borderRadius:100,
      padding:small?"2px 7px":"3px 10px", fontSize:small?9:10,
      fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:d.cor }}>
      {d.icon} {d.label}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", minHeight:300, gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:"50%",
        border:`3px solid ${C.border2}`, borderTopColor:C.neon,
        animation:"spin 0.8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.muted }}>Carregando...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StatusBar() {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 24px 0", fontSize:12, fontWeight:600, color:C.text, position:"relative" }}>
      <span>9:41</span>
      <div style={{ width:110, height:26, background:C.dark2, borderRadius:"0 0 14px 14px",
        position:"absolute", top:0, left:"50%", transform:"translateX(-50%)" }}/>
      <span style={{ fontSize:11 }}>●●● WiFi 🔋</span>
    </div>
  );
}

function BottomNav({ active, onNav, savedCount }) {
  const items = [
    { id:"home", icon:"🏠", label:"Home" },
    { id:"explore", icon:"🔍", label:"Explorar" },
    { id:"saved", icon:"❤️", label:"Salvos", badge: savedCount },
    { id:"profile", icon:"👤", label:"Perfil" },
  ];
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:76,
      background:"rgba(10,10,18,0.97)", backdropFilter:"blur(20px)",
      borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center",
      justifyContent:"space-around", padding:"0 8px 10px" }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onNav(it.id)} style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          background:"none", border:"none", cursor:"pointer", flex:1,
          color:active===it.id?C.neon:C.muted, fontFamily:FB,
          fontSize:9, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
          position:"relative" }}>
          <span style={{ fontSize:20 }}>{it.icon}</span>
          {it.label}
          {it.badge > 0 && (
            <div style={{ position:"absolute", top:0, right:"20%", width:14, height:14,
              borderRadius:"50%", background:C.red, fontSize:8, fontWeight:800,
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {it.badge > 9 ? "9+" : it.badge}
            </div>
          )}
          <div style={{ width:4, height:4, borderRadius:"50%", background:C.neon,
            opacity:active===it.id?1:0 }}/>
        </button>
      ))}
    </div>
  );
}

// ── PRO BADGE ────────────────────────────────────────────
function ProBadge({ small }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3,
      background:"linear-gradient(135deg,#FFD700,#FF8C00)",
      borderRadius:100, padding:small?"1px 6px":"2px 8px",
      fontSize:small?8:9, fontWeight:800, color:"#000",
      letterSpacing:"0.08em", textTransform:"uppercase" }}>
      ⚡ PRO
    </span>
  );
}

// ── PAYWALL LOCK ─────────────────────────────────────────
function PaywallLock({ texto, onUpgrade }) {
  return (
    <div onClick={onUpgrade} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.25)",
      borderRadius:10, padding:"10px 12px", cursor:"pointer", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:16 }}>🔒</span>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted2 }}>{texto}</div>
          <div style={{ fontSize:9, color:C.purple, fontWeight:600 }}>Desbloquear no PRO →</div>
        </div>
      </div>
      <ProBadge small/>
    </div>
  );
}

// ── MATCH CARD ───────────────────────────────────────────
function MatchDisplay({ matchData, isPro, onUpgrade, compact }) {
  const { score, motivos, motivosBloqueados, probabilidadeSucesso, chancePR } = matchData;
  const c = matchCor(score);

  if (compact) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      background:`${c}18`, border:`1px solid ${c}40`,
      borderRadius:100, padding:"2px 8px", fontSize:10, fontWeight:700, color:c }}>
      🎯 {score}%
    </span>
  );

  return (
    <div style={{ background:"linear-gradient(135deg,rgba(232,255,58,0.05),rgba(58,255,212,0.02))",
      border:"1px solid rgba(232,255,58,0.15)", borderRadius:14, padding:14, display:"flex",
      flexDirection:"column", gap:10 }}>
      {/* Score principal */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:10, color:C.muted2, fontWeight:700, textTransform:"uppercase",
          letterSpacing:"0.06em" }}>🎯 Compatibilidade</span>
        <span style={{ fontFamily:FD, fontSize:26, fontWeight:900, color:c }}>{score}%</span>
      </div>
      <div style={{ height:5, background:C.dark3, borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:matchGrad(score),
          borderRadius:3, transition:"width 0.6s ease" }}/>
      </div>

      {/* Motivos FREE */}
      {motivos.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {motivos.map((m, i) => (
            <span key={i} style={{ fontSize:10, color:C.muted2, display:"flex",
              alignItems:"center", gap:6 }}>
              <span style={{ color:C.neon, fontSize:10, fontWeight:800 }}>✓</span>{m}
            </span>
          ))}
        </div>
      )}

      {/* PRO: probabilidade e chance de PR */}
      {isPro ? (
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10,
          display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, background:"rgba(34,197,94,0.08)",
              border:"1px solid rgba(34,197,94,0.2)", borderRadius:9, padding:"8px 10px" }}>
              <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.06em", marginBottom:2 }}>Prob. Sucesso</div>
              <div style={{ fontFamily:FD, fontSize:20, fontWeight:900,
                color:C.green }}>{probabilidadeSucesso}%</div>
            </div>
            <div style={{ flex:1, background:"rgba(255,215,0,0.08)",
              border:"1px solid rgba(255,215,0,0.2)", borderRadius:9, padding:"8px 10px" }}>
              <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.06em", marginBottom:2 }}>Chance de PR</div>
              <div style={{ fontFamily:FD, fontSize:20, fontWeight:900,
                color:C.gold }}>{chancePR}%</div>
            </div>
          </div>
          {motivosBloqueados.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {motivosBloqueados.map((m, i) => (
                <span key={i} style={{ fontSize:9, color:C.muted,
                  display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ color:C.yellow }}>⚠</span>{m}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <PaywallLock
          texto={`🔥 ${chancePR}% de chance de bater seu PR`}
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  );
}

// ── PROVA CARD ───────────────────────────────────────────
function ProvaCard({ prova, user, isPro, salvo, onSalvo, onRace, onUpgrade, loadingSalvo }) {
  const matchData = useMemo(() => calcularMatch(prova, user), [prova, user]);
  const [saving, setSaving] = useState(false);

  async function handleSalvo(e) {
    e.stopPropagation();
    setSaving(true);
    await onSalvo(prova);
    setSaving(false);
  }

  return (
    <button onClick={() => onRace(prova)} style={{ background:C.card,
      border:`1px solid ${C.border}`, borderRadius:15, padding:13,
      textAlign:"left", cursor:"pointer", width:"100%", position:"relative" }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:9 }}>
        {/* Data */}
        <div style={{ background:C.dark3, borderRadius:9, padding:"7px 9px",
          textAlign:"center", flexShrink:0, minWidth:42 }}>
          <div style={{ fontFamily:FD, fontSize:20, fontWeight:900,
            color:C.neon, lineHeight:1 }}>{prova.data?.dia || "--"}</div>
          <div style={{ fontSize:8, textTransform:"uppercase",
            letterSpacing:"0.1em", color:C.muted }}>{prova.data?.mes || "---"}</div>
        </div>
        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FD, fontSize:15, fontWeight:800, lineHeight:1.1,
            marginBottom:3, color:C.text, paddingRight:36 }}>{prova.nome}</div>
          <div style={{ fontSize:9, color:C.muted, marginBottom:5 }}>
            📍 {prova.cidade || "Brasil"}{prova.estado ? `, ${prova.estado}` : ""}
          </div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            <span style={{ background:prova.tipo==="trail"?"rgba(58,255,212,0.07)":"rgba(232,255,58,0.07)",
              border:`1px solid ${prova.tipo==="trail"?"rgba(58,255,212,0.18)":"rgba(232,255,58,0.18)"}`,
              borderRadius:5, padding:"2px 6px", fontSize:9, fontWeight:700,
              textTransform:"uppercase", color:prova.tipo==="trail"?C.neon2:C.neon }}>
              {prova.tipo === "trail" ? "Trail" : "Urbana"}
            </span>
            {prova.distancia && (
              <span style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border2}`,
                borderRadius:5, padding:"2px 6px", fontSize:9, fontWeight:700, color:C.muted2 }}>
                {prova.distancia}
              </span>
            )}
            <DiffBadge diff={prova.dificuldade} small/>
          </div>
        </div>
        {prova.preco && (
          <div style={{ fontFamily:FD, fontSize:13, fontWeight:800, background:C.dark3,
            borderRadius:7, padding:"3px 8px", flexShrink:0, color:C.text }}>
            {prova.preco}
          </div>
        )}
      </div>

      {/* Match resumido */}
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:9, color:C.muted, fontWeight:600 }}>🎯 Compatibilidade</span>
            {isPro && <ProBadge small/>}
          </div>
          <span style={{ fontFamily:FD, fontSize:14, fontWeight:800,
            color:matchCor(matchData.score) }}>{matchData.score}%</span>
        </div>
        <div style={{ height:4, background:C.dark3, borderRadius:2, overflow:"hidden", marginBottom:5 }}>
          <div style={{ height:"100%", width:`${matchData.score}%`,
            background:matchGrad(matchData.score), borderRadius:2 }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:9, color:C.muted2 }}>{matchData.motivos[0]}</span>
          {isPro && matchData.chancePR > 70 && (
            <span style={{ fontSize:9, color:C.gold, fontWeight:700 }}>
              🔥 {matchData.chancePR}% PR
            </span>
          )}
        </div>
      </div>

      {/* Botão salvar */}
      <div style={{ position:"absolute", top:13, right:13 }} onClick={e => e.stopPropagation()}>
        <button onClick={handleSalvo} style={{
          background:salvo?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.05)",
          border:`1px solid ${salvo?"rgba(239,68,68,0.4)":C.border2}`,
          borderRadius:8, padding:"5px 7px", cursor:"pointer", fontSize:13,
          transition:"all 0.2s", transform:saving?"scale(0.8)":"scale(1)" }}>
          {salvo ? "❤️" : "🤍"}
        </button>
      </div>
    </button>
  );
}

// ── ONBOARDING ───────────────────────────────────────────
function OnboardingScreen({ onConcluir }) {
  const [step, setStep] = useState(0);
  const [dados, setDados] = useState({
    pace: "6:00", distanciaPreferida: "10",
    objetivo: "performance", frequencia: "3",
  });

  const steps = [
    {
      titulo: "Qual é seu pace médio?",
      sub: "Tempo por km que você corre confortavelmente",
      campo: "pace",
      opcoes: [
        { valor:"4:30", label:"4:30 min/km", sub:"Elite 👑" },
        { valor:"5:00", label:"5:00 min/km", sub:"Avançado 🔥" },
        { valor:"5:30", label:"5:30 min/km", sub:"Intermediário ⚡" },
        { valor:"6:00", label:"6:00 min/km", sub:"Regular 🌱" },
        { valor:"6:30", label:"6:30 min/km", sub:"Iniciante" },
        { valor:"7:00", label:"7:00+ min/km", sub:"Começando agora" },
      ],
    },
    {
      titulo: "Distância preferida?",
      sub: "A distância que você mais gosta ou quer correr",
      campo: "distanciaPreferida",
      opcoes: [
        { valor:"5",  label:"5 km",  sub:"Corrida rápida e divertida" },
        { valor:"10", label:"10 km", sub:"A mais popular do Brasil" },
        { valor:"21", label:"21 km", sub:"Meia maratona — o próximo nível" },
        { valor:"42", label:"42 km", sub:"Maratona — o grande desafio" },
      ],
    },
    {
      titulo: "Qual seu objetivo?",
      sub: "O que você quer alcançar nas corridas",
      campo: "objetivo",
      opcoes: [
        { valor:"performance",   label:"Melhorar performance",   sub:"Bater meu recorde pessoal" },
        { valor:"completar",     label:"Completar a prova",      sub:"Chegar na linha de chegada" },
        { valor:"meia maratona", label:"Correr meia maratona",   sub:"21K é o meu próximo passo" },
        { valor:"maratona",      label:"Correr maratona",        sub:"42K é o sonho" },
        { valor:"saude",         label:"Saúde e bem-estar",      sub:"Correr por prazer e saúde" },
      ],
    },
    {
      titulo: "Frequência de treino?",
      sub: "Quantas vezes você corre por semana",
      campo: "frequencia",
      opcoes: [
        { valor:"1", label:"1x por semana",  sub:"Começando agora" },
        { valor:"2", label:"2x por semana",  sub:"Rotina leve" },
        { valor:"3", label:"3x por semana",  sub:"Consistente" },
        { valor:"4", label:"4x por semana",  sub:"Dedicado" },
        { valor:"5", label:"5x ou mais",     sub:"Atleta comprometido 💪" },
      ],
    },
  ];

  const s = steps[step];

  function selecionar(valor) {
    const novos = { ...dados, [s.campo]: valor };
    setDados(novos);
    if (step < steps.length - 1) {
      setTimeout(() => setStep(step + 1), 180);
    } else {
      const nivelInfo = classificarNivel(novos.pace);
      onConcluir({ ...novos, nivel: nivelInfo.nivel, plano: "free", criadoEm: new Date().toISOString() });
    }
  }

  return (
    <div style={{ height:"100%", overflowY:"auto", fontFamily:FB, background:C.dark2 }}>
      <div style={{ padding:"52px 24px 24px", background:`linear-gradient(160deg,${C.dark2},#0A0A18)` }}>
        {/* Progress */}
        <div style={{ display:"flex", gap:4, marginBottom:20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2,
              background:i<=step?C.neon:C.border, transition:"background 0.3s" }}/>
          ))}
        </div>
        <div style={{ fontSize:11, color:C.muted, marginBottom:6,
          letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Passo {step + 1} de {steps.length}
        </div>
        <div style={{ fontFamily:FD, fontSize:28, fontWeight:900,
          color:C.text, lineHeight:1.1, marginBottom:4 }}>{s.titulo}</div>
        <div style={{ fontSize:12, color:C.muted2 }}>{s.sub}</div>
      </div>

      <div style={{ padding:"0 18px 100px", display:"flex", flexDirection:"column", gap:8 }}>
        {s.opcoes.map(op => {
          const sel = dados[s.campo] === op.valor;
          return (
            <button key={op.valor} onClick={() => selecionar(op.valor)} style={{
              background:sel?"linear-gradient(135deg,rgba(232,255,58,0.08),rgba(58,255,212,0.04))":C.card,
              border:`1.5px solid ${sel?C.neon:C.border}`, borderRadius:14,
              padding:"14px 16px", textAlign:"left", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              transition:"all 0.15s" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:sel?C.neon:C.text, marginBottom:2 }}>
                  {op.label}
                </div>
                <div style={{ fontSize:11, color:C.muted }}>{op.sub}</div>
              </div>
              <div style={{ width:20, height:20, borderRadius:"50%",
                border:`2px solid ${sel?C.neon:C.border2}`, background:sel?C.neon:"transparent",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {sel && <div style={{ width:8, height:8, borderRadius:"50%", background:C.dark }}/>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PAYWALL / UPGRADE ────────────────────────────────────
function UpgradeScreen({ onClose, onUpgrade }) {
  const features = [
    { icon:"🧠", title:"Match Avançado", desc:"Chance de PR + probabilidade de sucesso" },
    { icon:"🎯", title:"Top 3 Recomendadas", desc:"Provas selecionadas especialmente para você" },
    { icon:"📊", title:"Evolução do Corredor", desc:"Acompanhe seu progresso semanal" },
    { icon:"🧭", title:"Plano de Evolução", desc:"\"Você está a 6 semanas da meia maratona\"" },
    { icon:"🔔", title:"Alertas Inteligentes", desc:"Novas provas ideais para o seu perfil" },
    { icon:"🏆", title:"Badges Exclusivos", desc:"Conquistas especiais para assinantes PRO" },
  ];

  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(8,8,16,0.97)",
      backdropFilter:"blur(20px)", zIndex:100, overflowY:"auto", fontFamily:FB }}>
      <div style={{ padding:"52px 22px 100px" }}>
        <button onClick={onClose} style={{ background:"none", border:"none",
          color:C.muted, fontSize:20, cursor:"pointer", marginBottom:20 }}>←</button>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>⚡</div>
          <div style={{ fontFamily:FD, fontSize:36, fontWeight:900,
            background:"linear-gradient(135deg,#FFD700,#FF8C00)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            marginBottom:6 }}>PACEMARKET PRO</div>
          <div style={{ fontSize:14, color:C.muted2, lineHeight:1.5 }}>
            Transforme seus treinos com inteligência<br/>real de corrida
          </div>
        </div>

        {/* Features */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`,
              borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:2 }}>{f.title}</div>
                <div style={{ fontSize:11, color:C.muted }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Preço */}
        <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,140,0,0.05))",
          border:"1px solid rgba(255,215,0,0.25)", borderRadius:16, padding:20,
          textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Apenas</div>
          <div style={{ fontFamily:FD, fontSize:44, fontWeight:900, color:C.gold, lineHeight:1 }}>
            R$19<span style={{ fontSize:20 }}>,90</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>por mês · cancele quando quiser</div>
        </div>

        {/* CTA */}
        <button onClick={onUpgrade} style={{ width:"100%", background:"linear-gradient(135deg,#FFD700,#FF8C00)",
          color:"#000", border:"none", borderRadius:14, padding:"16px",
          fontFamily:FD, fontSize:20, fontWeight:900, letterSpacing:"0.05em",
          cursor:"pointer", textTransform:"uppercase",
          boxShadow:"0 8px 30px rgba(255,215,0,0.3)" }}>
          Assinar PRO Agora ⚡
        </button>
        <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:C.muted }}>
          7 dias grátis · sem compromisso
        </div>
      </div>
    </div>
  );
}

// ── HOME ─────────────────────────────────────────────────
function HomeScreen({ provas, loading, user, isPro, onRace, onBuscar, salvos, onSalvo, loadingSalvo, onUpgrade }) {
  const [busca, setBusca] = useState("");
  const wowMoment = useMemo(() => gerarWowMoment(user, provas), [user, provas]);
  const recomendadas = useMemo(() => getProvasRecomendadas(user, provas, 3), [user, provas]);
  const nivelInfo = user ? classificarNivel(user.pace) : null;

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      {/* Header */}
      <div style={{ background:C.dark2, padding:"52px 18px 20px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-70, right:-50, width:260, height:260,
          background:"radial-gradient(circle,rgba(139,92,246,0.1),transparent 65%)",
          borderRadius:"50%", pointerEvents:"none" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:14, position:"relative", zIndex:1 }}>
          <div>
            <div style={{ fontSize:12, color:C.muted2, fontWeight:500 }}>Bom dia, corredor 👋</div>
            {nivelInfo && (
              <div style={{ fontSize:10, color:nivelInfo.cor, marginTop:2, fontWeight:700 }}>
                {nivelInfo.icon} {nivelInfo.label} · {user.pace} min/km
              </div>
            )}
          </div>
          {isPro ? <ProBadge/> : (
            <button onClick={onUpgrade} style={{ background:"linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,140,0,0.1))",
              border:"1px solid rgba(255,215,0,0.3)", borderRadius:9, padding:"5px 10px",
              fontSize:10, fontWeight:700, color:C.gold, cursor:"pointer", fontFamily:FB }}>
              ⚡ Seja PRO
            </button>
          )}
        </div>
        <div style={{ fontFamily:FD, fontSize:38, fontWeight:900, lineHeight:0.95,
          marginBottom:16, position:"relative", zIndex:1, color:C.text }}>
          Sua próxima<br/><span style={{ color:C.neon }}>corrida</span><br/>
          <span style={{ color:C.neon2 }}>perfeita.</span>
        </div>
        {/* Busca */}
        <div style={{ background:"rgba(255,255,255,0.05)",
          border:`1px solid ${busca?C.neon2:C.border2}`, borderRadius:12,
          padding:"11px 14px", display:"flex", alignItems:"center", gap:9,
          position:"relative", zIndex:1 }}>
          <span style={{ fontSize:15 }}>🔎</span>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === "Enter" && busca.trim() && onBuscar(busca.trim())}
            placeholder="Buscar por prova ou cidade..."
            style={{ flex:1, background:"none", border:"none", outline:"none",
              fontSize:13, color:C.text, fontFamily:FB }}/>
          {busca && (
            <button onClick={() => onBuscar(busca)} style={{ background:C.neon, color:C.dark,
              border:"none", borderRadius:7, padding:"4px 10px", fontSize:11,
              fontWeight:700, cursor:"pointer", fontFamily:FB }}>Buscar</button>
          )}
        </div>
      </div>

      {/* Wow Moment */}
      {wowMoment && (
        <div style={{ margin:"12px 18px 0", background:"linear-gradient(135deg,rgba(232,255,58,0.06),rgba(58,255,212,0.03))",
          border:"1px solid rgba(232,255,58,0.15)", borderRadius:12, padding:"10px 14px",
          display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>💡</span>
          <span style={{ fontSize:12, color:C.muted2, lineHeight:1.4 }}>{wowMoment}</span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"flex", gap:7, padding:"12px 18px" }}>
        {[
          [String(provas.length), "Provas"],
          [String(Object.keys(salvos).length), "Salvos"],
          [isPro ? "PRO ⚡" : "Free", "Plano"],
        ].map(([v, l]) => (
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:11, padding:"10px 8px", flex:1, textAlign:"center" }}>
            <div style={{ fontFamily:FD, fontSize:v.length > 5 ? 14 : 20,
              fontWeight:800, color:l==="Plano"?(isPro?C.gold:C.muted):C.neon, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:9, color:C.muted, marginTop:2,
              textTransform:"uppercase", letterSpacing:"0.04em" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Para você */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"0 18px", marginBottom:10 }}>
        <span style={{ fontFamily:FD, fontSize:16, fontWeight:800,
          textTransform:"uppercase", color:C.text }}>🎯 Para você</span>
        <span onClick={() => onBuscar("")} style={{ fontSize:11, color:C.neon,
          fontWeight:700, cursor:"pointer" }}>Ver todas →</span>
      </div>

      {loading ? <Spinner/> : (
        <div style={{ display:"flex", gap:10, padding:"0 18px",
          overflowX:"auto", scrollbarWidth:"none" }}>
          {recomendadas.map(r => {
            const m = calcularMatch(r, user);
            return (
              <button key={r.id} onClick={() => onRace(r)} style={{ background:C.card,
                border:`1px solid ${C.border}`, borderRadius:15, padding:13,
                minWidth:195, flexShrink:0, textAlign:"left", cursor:"pointer",
                position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0,
                  height:2, background:matchGrad(m.score) }}/>
                <div style={{ fontFamily:FD, fontSize:14, fontWeight:700,
                  lineHeight:1.1, color:C.text, marginBottom:4 }}>{r.nome}</div>
                <DiffBadge diff={r.dificuldade} small/>
                <div style={{ fontSize:9, color:C.muted, margin:"5px 0 7px" }}>
                  📅 {r.data?.label || "Data a confirmar"}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:10, fontWeight:700,
                    color:matchCor(m.score) }}>🎯 {m.score}%</span>
                  {isPro && m.chancePR > 70 && (
                    <span style={{ fontSize:9, color:C.gold }}>🔥 {m.chancePR}% PR</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* PRO banner se free */}
      {!isPro && (
        <div onClick={onUpgrade} style={{ margin:"16px 18px 0", cursor:"pointer",
          background:"linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,140,0,0.05))",
          border:"1px solid rgba(255,215,0,0.2)", borderRadius:14, padding:"14px 16px",
          display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>⚡</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:FD, fontSize:16, fontWeight:900, color:C.gold,
              marginBottom:2 }}>Desbloqueie o PRO</div>
            <div style={{ fontSize:11, color:C.muted }}>
              Chance de PR, probabilidade de sucesso e muito mais
            </div>
          </div>
          <span style={{ fontSize:16, color:C.gold }}>→</span>
        </div>
      )}
    </div>
  );
}

// ── EXPLORAR ─────────────────────────────────────────────
function ExploreScreen({ provas, loading, user, isPro, onRace, buscaInicial, salvos, onSalvo, loadingSalvo, onUpgrade }) {
  const [busca, setBusca]   = useState(buscaInicial || "");
  const [tipo, setTipo]     = useState("Todas");
  const [ordem, setOrdem]   = useState("match");
  const tipos = ["Todas", "Corrida de Rua", "Trail", "Meia", "Maratona"];

  const filtradas = useMemo(() => {
    let r = [...provas];
    if (busca.trim()) {
      const t = busca.toLowerCase();
      r = r.filter(p =>
        p.nome?.toLowerCase().includes(t) ||
        p.cidade?.toLowerCase().includes(t) ||
        p.distancia?.toLowerCase().includes(t)
      );
    }
    if (tipo === "Trail")        r = r.filter(p => p.tipo === "trail");
    if (tipo === "Corrida de Rua") r = r.filter(p => p.tipo === "urban");
    if (tipo === "Meia")         r = r.filter(p => p.distanciaKm === 21);
    if (tipo === "Maratona")     r = r.filter(p => p.distanciaKm === 42);
    if (ordem === "match")
      r = r.map(p => ({ ...p, _s: calcularMatch(p, user).score })).sort((a, b) => b._s - a._s);
    if (ordem === "data")
      r.sort((a, b) => (a.data?.iso || "") > (b.data?.iso || "") ? 1 : -1);
    return r;
  }, [provas, busca, tipo, ordem, user]);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ background:C.dark2, padding:"52px 18px 16px" }}>
        <div style={{ fontFamily:FD, fontSize:34, fontWeight:900, textTransform:"uppercase",
          lineHeight:0.95, marginBottom:14, color:C.text }}>
          Explorar<br/><span style={{ color:C.neon2 }}>Provas</span>
        </div>
        <div style={{ background:"rgba(255,255,255,0.05)",
          border:`1px solid ${busca?C.neon2:C.border2}`, borderRadius:12,
          padding:"10px 14px", display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
          <span style={{ fontSize:14 }}>🔎</span>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Prova, cidade, distância..."
            style={{ flex:1, background:"none", border:"none", outline:"none",
              fontSize:13, color:C.text, fontFamily:FB }}/>
          {busca && (
            <button onClick={() => setBusca("")} style={{ background:"none", border:"none",
              color:C.muted, cursor:"pointer", fontSize:16 }}>✕</button>
          )}
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setTipo(t)} style={{
              background:tipo===t?C.neon:C.card,
              border:`1px solid ${tipo===t?C.neon:C.border}`,
              borderRadius:100, padding:"6px 13px", fontSize:11, fontWeight:600,
              whiteSpace:"nowrap", color:tipo===t?C.dark:C.muted2,
              cursor:"pointer", flexShrink:0, fontFamily:FB }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:6, padding:"10px 18px 0", overflowX:"auto", scrollbarWidth:"none" }}>
        {[["match","🎯 Por match"],["data","📅 Por data"]].map(([v, l]) => (
          <button key={v} onClick={() => setOrdem(v)} style={{
            background:ordem===v?C.card2:C.card,
            border:`1px solid ${ordem===v?C.neon2:C.border2}`,
            borderRadius:9, padding:"6px 12px", fontSize:11, fontWeight:600,
            whiteSpace:"nowrap", flexShrink:0,
            color:ordem===v?C.neon2:C.muted2, cursor:"pointer", fontFamily:FB }}>{l}</button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 18px 4px" }}>
        <span style={{ fontSize:10, color:C.muted }}>
          {loading ? "Carregando..." : `${filtradas.length} provas`}
        </span>
        {busca && (
          <span onClick={() => setBusca("")} style={{ fontSize:10, color:C.neon,
            fontWeight:700, cursor:"pointer" }}>Limpar ✕</span>
        )}
      </div>

      {loading ? <Spinner/> : filtradas.length === 0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", minHeight:200, gap:12, padding:24 }}>
          <span style={{ fontSize:36 }}>🔍</span>
          <span style={{ fontFamily:FD, fontSize:18, fontWeight:700, color:C.text }}>
            Nenhuma prova encontrada
          </span>
          <button onClick={() => { setBusca(""); setTipo("Todas"); }} style={{
            background:C.neon, color:C.dark, border:"none", borderRadius:10,
            padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Ver todas
          </button>
        </div>
      ) : (
        <div style={{ padding:"6px 18px", display:"flex", flexDirection:"column",
          gap:9, paddingBottom:16 }}>
          {filtradas.map(r => (
            <ProvaCard key={r.id} prova={r} user={user} isPro={isPro}
              salvo={!!salvos[r.id]} onSalvo={onSalvo} onRace={onRace}
              onUpgrade={onUpgrade} loadingSalvo={loadingSalvo}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DETALHE ──────────────────────────────────────────────
function DetalheScreen({ prova: r, onVoltar, user, isPro, salvo, onSalvo, loadingSalvo, onUpgrade }) {
  const matchData = useMemo(() => calcularMatch(r, user), [r, user]);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ height:200, background:"linear-gradient(160deg,#051A14,#071F18,#0A0F1A)",
        position:"relative", display:"flex", alignItems:"flex-end",
        padding:"16px 18px", overflow:"hidden" }}>
        <button onClick={onVoltar} style={{ position:"absolute", top:50, left:16, zIndex:10,
          background:"rgba(0,0,0,0.5)", backdropFilter:"blur(12px)",
          border:`1px solid ${C.border2}`, borderRadius:10, padding:"7px 11px",
          fontSize:16, color:C.text, cursor:"pointer" }}>←</button>
        <div style={{ position:"absolute", top:50, right:16, zIndex:10 }}>
          <button onClick={() => onSalvo(r)} style={{
            background:salvo?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.05)",
            border:`1px solid ${salvo?"rgba(239,68,68,0.4)":C.border2}`,
            borderRadius:8, padding:"6px 8px", cursor:"pointer", fontSize:14 }}>
            {salvo ? "❤️" : "🤍"}
          </button>
        </div>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ background:C.neon2, color:C.dark, fontSize:9, fontWeight:800,
            letterSpacing:"0.12em", textTransform:"uppercase", padding:"2px 9px",
            borderRadius:5, display:"inline-block", marginBottom:7 }}>
            {r.tipo === "trail" ? "🌿 Trail" : "🏙 Urbana"}
            {r.distancia ? ` · ${r.distancia}` : ""}
          </div>
          <div style={{ fontFamily:FD, fontSize:26, fontWeight:900,
            textTransform:"uppercase", lineHeight:0.95, color:C.text }}>{r.nome}</div>
        </div>
      </div>

      <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column",
        gap:12, paddingBottom:16 }}>
        {/* Match completo */}
        <MatchDisplay matchData={matchData} isPro={isPro} onUpgrade={onUpgrade}/>

        {/* Dados */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {[
            ["📅", "Data",      r.data?.label || "Data a confirmar"],
            ["📍", "Local",     r.cidade ? `${r.cidade}${r.estado?`, ${r.estado}`:""}` : "—"],
            ["📏", "Distância", r.distancia || "—"],
            ["🏷️", "Tipo",      r.tipo === "trail" ? "Trail" : "Corrida de Rua"],
          ].map(([ic, lbl, val]) => (
            <div key={lbl} style={{ background:C.card, border:`1px solid ${C.border}`,
              borderRadius:11, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{ic}</span>
              <div>
                <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase",
                  letterSpacing:"0.05em" }}>{lbl}</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fonte clicável */}
        {r.fonte && (
          <a href={r.link} target="_blank" rel="noopener noreferrer" style={{
            background:C.card, border:`1px solid ${C.border}`, borderRadius:11,
            padding:"10px 14px", display:"flex", alignItems:"center",
            justifyContent:"space-between", textDecoration:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>🔗</span>
              <div>
                <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase",
                  letterSpacing:"0.05em" }}>Fonte</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.neon }}>{r.fonte}</div>
              </div>
            </div>
            <span style={{ fontSize:12, color:C.muted }}>→</span>
          </a>
        )}

        {/* CTA */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15,
          padding:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:9, color:C.muted, textTransform:"uppercase",
              letterSpacing:"0.07em" }}>Inscrição</div>
            <div style={{ fontFamily:FD, fontSize:36, fontWeight:900,
              color:C.neon, lineHeight:1 }}>{r.preco || "Ver site"}</div>
          </div>
          <a href={r.link} target="_blank" rel="noopener noreferrer" style={{
            background:C.neon, color:C.dark, fontFamily:FD, fontSize:15, fontWeight:900,
            letterSpacing:"0.05em", textTransform:"uppercase", border:"none",
            borderRadius:11, padding:"13px 18px", cursor:"pointer", textDecoration:"none",
            boxShadow:"0 4px 20px rgba(232,255,58,0.2)" }}>
            Inscrever-se →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── SALVOS ───────────────────────────────────────────────
function SavedScreen({ salvos, onRace, user, isPro, onSalvo, loadingSalvo, onUpgrade }) {
  const lista = Object.values(salvos);
  if (lista.length === 0) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", gap:16, padding:24, fontFamily:FB }}>
      <span style={{ fontSize:48 }}>🤍</span>
      <span style={{ fontFamily:FD, fontSize:22, fontWeight:900,
        textTransform:"uppercase", color:C.text }}>Nenhuma prova salva</span>
      <span style={{ fontSize:13, color:C.muted, textAlign:"center" }}>
        Toque no ❤️ em qualquer prova para salvar
      </span>
    </div>
  );

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      <div style={{ background:C.dark2, padding:"52px 18px 20px" }}>
        <div style={{ fontFamily:FD, fontSize:34, fontWeight:900,
          textTransform:"uppercase", lineHeight:0.95, color:C.text }}>
          Provas<br/><span style={{ color:C.red }}>Salvas ❤️</span>
        </div>
        <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>
          {lista.length} prova{lista.length !== 1 ? "s" : ""} na sua lista
        </div>
      </div>
      <div style={{ padding:"12px 18px", display:"flex", flexDirection:"column",
        gap:9, paddingBottom:16 }}>
        {lista.map(r => (
          <ProvaCard key={r.id} prova={r} user={user} isPro={isPro}
            salvo={true} onSalvo={onSalvo} onRace={onRace}
            onUpgrade={onUpgrade} loadingSalvo={loadingSalvo}/>
        ))}
      </div>
    </div>
  );
}

// ── PERFIL ───────────────────────────────────────────────
function ProfileScreen({ user, isPro, onEditar, onUpgrade, provas, onRace }) {
  const nivelInfo   = classificarNivel(user?.pace);
  const badges      = calcularBadges(user);
  const evolucao    = sugestaoEvolucao(user);
  const recomendadas = useMemo(() => getProvasRecomendadas(user, provas, 3), [user, provas]);

  return (
    <div style={{ paddingBottom:80, overflowY:"auto", height:"100%", fontFamily:FB }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(160deg,#0A0020,#0F0F1A)`,
        padding:"52px 18px 22px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-50, right:-60, width:200, height:200,
          background:"radial-gradient(circle,rgba(139,92,246,0.12),transparent 65%)",
          borderRadius:"50%" }}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:56, height:56, borderRadius:16,
              background:`linear-gradient(135deg,${nivelInfo.cor}44,${nivelInfo.cor}22)`,
              border:`2px solid ${nivelInfo.cor}66`, display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:24 }}>
              {nivelInfo.icon}
            </div>
            <div>
              <div style={{ fontFamily:FD, fontSize:22, fontWeight:900, color:C.text }}>
                Meu Perfil
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                <div style={{ fontSize:11, color:nivelInfo.cor, fontWeight:700 }}>
                  {nivelInfo.label}
                </div>
                {isPro && <ProBadge small/>}
              </div>
            </div>
          </div>
          <button onClick={onEditar} style={{ background:"rgba(255,255,255,0.05)",
            border:`1px solid ${C.border2}`, borderRadius:9, padding:"7px 12px",
            fontSize:11, fontWeight:700, color:C.muted2, cursor:"pointer", fontFamily:FB }}>
            ✏️ Editar
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column",
        gap:12, paddingBottom:16 }}>
        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {[
            ["⚡", "Pace médio",       `${user?.pace || "—"} min/km`],
            ["📏", "Distância fav.",   `${user?.distanciaPreferida || "—"} km`],
            ["🎯", "Objetivo",         user?.objetivo || "—"],
            ["📅", "Treinos/semana",   `${user?.frequencia || "—"}x`],
          ].map(([ic, lbl, val]) => (
            <div key={lbl} style={{ background:C.card, border:`1px solid ${C.border}`,
              borderRadius:11, padding:12 }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{ic}</div>
              <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase",
                letterSpacing:"0.05em", marginBottom:2 }}>{lbl}</div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text,
                textTransform:"capitalize" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:14, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted2,
              textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
              🏅 Conquistas
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {badges.map((b, i) => (
                <div key={i} style={{ background:C.dark3, border:`1px solid ${C.border2}`,
                  borderRadius:10, padding:"8px 10px", textAlign:"center", minWidth:70 }}>
                  <div style={{ fontSize:20, marginBottom:3 }}>{b.icon}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:C.text }}>{b.label}</div>
                  <div style={{ fontSize:8, color:C.muted, marginTop:1 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximo desafio */}
        <div style={{ background:"linear-gradient(135deg,rgba(139,92,246,0.08),rgba(58,255,212,0.04))",
          border:"1px solid rgba(139,92,246,0.2)", borderRadius:14, padding:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
            <div style={{ background:`linear-gradient(135deg,${C.purple},#6366F1)`,
              color:"#fff", fontSize:8, fontWeight:800, letterSpacing:"0.1em",
              textTransform:"uppercase", padding:"2px 8px", borderRadius:5 }}>✨ IA</div>
            <span style={{ fontSize:12, fontWeight:700, color:C.text }}>Próximo desafio</span>
          </div>
          <p style={{ fontSize:12, color:C.muted2, lineHeight:1.5, marginBottom:12 }}>
            {evolucao.texto}
          </p>
          {evolucao.semanas > 0 && (
            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:9, padding:"8px 12px",
              marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>🗓️</span>
              <span style={{ fontSize:11, color:C.muted2 }}>
                Previsão: <strong style={{ color:C.neon }}>{evolucao.semanas} semanas</strong> de treino
              </span>
            </div>
          )}
          {/* Provas recomendadas */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {recomendadas.slice(0, 2).map(r => {
              const m = calcularMatch(r, user);
              return (
                <button key={r.id} onClick={() => onRace(r)} style={{
                  background:"rgba(0,0,0,0.3)", border:`1px solid ${C.border}`,
                  borderRadius:9, padding:"10px 12px", textAlign:"left", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>
                      {r.nome}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>
                      {r.data?.label || "A confirmar"} · {r.cidade}
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700,
                    color:matchCor(m.score) }}>🎯 {m.score}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRO features bloqueadas */}
        {!isPro && (
          <div onClick={onUpgrade} style={{ cursor:"pointer",
            background:"linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,140,0,0.03))",
            border:"1px solid rgba(255,215,0,0.2)", borderRadius:14, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.gold }}>
                ⚡ Recursos PRO bloqueados
              </span>
              <ProBadge/>
            </div>
            {[
              "📊 Evolução do pace ao longo do tempo",
              "🔔 Alertas de novas provas para seu perfil",
              "🏆 Badges exclusivos de assinante",
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                marginBottom:6 }}>
                <span style={{ fontSize:12 }}>🔒</span>
                <span style={{ fontSize:11, color:C.muted }}>{item}</span>
              </div>
            ))}
            <div style={{ marginTop:10, background:"linear-gradient(135deg,#FFD700,#FF8C00)",
              borderRadius:9, padding:"8px 14px", textAlign:"center",
              fontSize:12, fontWeight:800, color:"#000" }}>
              Assinar PRO — R$19,90/mês
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP ROOT ─────────────────────────────────────────────
export default function PaceMarket() {
  const [tela, setTela]         = useState("home");
  const [prova, setProva]       = useState(null);
  const [busca, setBusca]       = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { todas, loading }          = useProvas();
  const { user, loadingUser, salvarUser, atualizarPlano } = useUser();
  const { salvos, toggleSalvo, loadingSalvo } = useSalvos();

  const isPro = user?.plano === "pro";

  function abrirProva(r)     { setProva(r); setTela("detalhe"); }
  function navegar(id)       { setProva(null); setBusca(""); setTela(id); }
  function buscarExplore(t)  { setBusca(t); setTela("explore"); }
  function editarPerfil()    { setTela("onboarding"); }
  function abrirUpgrade()    { setShowUpgrade(true); }

  async function concluirOnboarding(dados) {
    await salvarUser(dados);
    setTela("home");
  }

  async function handleUpgrade() {
    // Simula assinatura PRO (integrar com Stripe em produção)
    await atualizarPlano("pro");
    setShowUpgrade(false);
  }

  const navAtivo = ["detalhe", "onboarding"].includes(tela) ? "home" : tela;
  const mostrarOnboarding = tela === "onboarding" || (!loadingUser && !user);

  if (loadingUser) return (
    <div style={{ width:"100%", height:"100vh", background:C.dark,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, borderRadius:"50%",
        border:`3px solid rgba(255,255,255,0.1)`, borderTopColor:C.neon,
        animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;}
        input::placeholder{color:#6B6B85;}
        button{font-family:'DM Sans',sans-serif;}
      `}</style>

      <div style={{ width:"100%", minHeight:"100vh", background:C.dark,
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"20px 16px 40px", fontFamily:FB }}>

        {!mostrarOnboarding && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{ width:28, height:28, background:C.neon, borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🏁</div>
            <span style={{ fontFamily:FD, fontSize:22, fontWeight:900,
              letterSpacing:"0.05em", textTransform:"uppercase", color:C.text }}>
              Pace<span style={{ color:C.neon }}>·</span>Market
            </span>
            {isPro ? (
              <div style={{ background:"linear-gradient(135deg,#FFD700,#FF8C00)",
                borderRadius:100, padding:"3px 10px", fontSize:9,
                fontWeight:800, color:"#000", marginLeft:6 }}>⚡ PRO</div>
            ) : (
              <div style={{ background:C.card2, border:`1px solid ${C.border2}`,
                borderRadius:100, padding:"3px 10px", fontSize:9,
                fontWeight:700, color:C.muted2, marginLeft:6 }}>
                v3 · <span style={{ color:C.neon }}>live</span>
              </div>
            )}
          </div>
        )}

        <div style={{ width:375, height:812, background:C.dark2, borderRadius:48,
          border:"1.5px solid rgba(255,255,255,0.08)", overflow:"hidden",
          position:"relative",
          boxShadow:"0 0 0 1px rgba(0,0,0,0.5),0 50px 100px rgba(0,0,0,0.7)",
          display:"flex", flexDirection:"column" }}>

          {/* Paywall overlay */}
          {showUpgrade && (
            <UpgradeScreen onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade}/>
          )}

          {mostrarOnboarding ? (
            <OnboardingScreen onConcluir={concluirOnboarding}/>
          ) : (
            <>
              <StatusBar/>
              <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
                {tela === "home"    && <HomeScreen provas={todas} loading={loading} user={user}
                  isPro={isPro} onRace={abrirProva} onBuscar={buscarExplore}
                  salvos={salvos} onSalvo={toggleSalvo} loadingSalvo={loadingSalvo}
                  onUpgrade={abrirUpgrade}/>}
                {tela === "explore" && <ExploreScreen provas={todas} loading={loading} user={user}
                  isPro={isPro} onRace={abrirProva} buscaInicial={busca}
                  salvos={salvos} onSalvo={toggleSalvo} loadingSalvo={loadingSalvo}
                  onUpgrade={abrirUpgrade}/>}
                {tela === "detalhe" && prova && <DetalheScreen prova={prova}
                  onVoltar={() => setTela("explore")} user={user} isPro={isPro}
                  salvo={!!salvos[prova.id]} onSalvo={toggleSalvo}
                  loadingSalvo={loadingSalvo} onUpgrade={abrirUpgrade}/>}
                {tela === "saved"   && <SavedScreen salvos={salvos} onRace={abrirProva}
                  user={user} isPro={isPro} onSalvo={toggleSalvo}
                  loadingSalvo={loadingSalvo} onUpgrade={abrirUpgrade}/>}
                {tela === "profile" && user && <ProfileScreen user={user} isPro={isPro}
                  onEditar={editarPerfil} onUpgrade={abrirUpgrade}
                  provas={todas} onRace={abrirProva}/>}
              </div>
              <BottomNav active={navAtivo} onNav={navegar}
                savedCount={Object.keys(salvos).length}/>
            </>
          )}
        </div>

        {!mostrarOnboarding && (
          <div style={{ marginTop:14, fontSize:10, color:C.muted,
            letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {loading ? "Carregando..." : `${todas.length} provas · Match inteligente ativo`}
          </div>
        )}
      </div>
    </>
  );
}
