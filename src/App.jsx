import { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, orderBy, query } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBwoiW0fZ1UL3h283x0sfmdroVi3_T14bE",
  authDomain:        "pacemarket-be6c9.firebaseapp.com",
  projectId:         "pacemarket-be6c9",
  storageBucket:     "pacemarket-be6c9.firebasestorage.app",
  messagingSenderId: "583598891691",
  appId:             "1:583598891691:web:bfaf831e3b85bdbbfb4dee",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(firebaseApp);

const C = {
  neon:"#E8FF3A",neon2:"#3AFFD4",orange:"#FF5C1A",
  purple:"#8B5CF6",green:"#22C55E",yellow:"#EAB308",red:"#EF4444",
  dark:"#080810",dark2:"#0F0F1A",dark3:"#161622",
  card:"#13131E",card2:"#1A1A28",
  border:"rgba(255,255,255,0.07)",border2:"rgba(255,255,255,0.12)",
  text:"#F0F0F5",muted:"#6B6B85",muted2:"#9494AA",
};
const FD="'Barlow Condensed',sans-serif";
const FB="'DM Sans',sans-serif";

function diffInfo(d){
  const m={
    iniciante:    {icon:"🟢",label:"Fácil", cor:C.green, bg:"rgba(34,197,94,0.1)", bd:"rgba(34,197,94,0.22)"},
    intermediaria:{icon:"🟡",label:"Médio", cor:C.yellow,bg:"rgba(234,179,8,0.1)", bd:"rgba(234,179,8,0.22)"},
    brutal:       {icon:"🔴",label:"Brutal",cor:C.red,   bg:"rgba(239,68,68,0.1)", bd:"rgba(239,68,68,0.22)"},
  };
  return m[d]||m.iniciante;
}
const matchCor=m=>m>=80?C.neon:m>=60?C.yellow:C.red;
const matchGrad=m=>m>=80?`linear-gradient(90deg,${C.neon2},${C.neon})`:`linear-gradient(90deg,${C.yellow},${C.orange})`;

function useProvas(){
  const [todas,setTodas]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    (async()=>{
      try{
        const q=query(collection(db,"provas"),orderBy("match","desc"));
        const snap=await getDocs(q);
        if(!snap.empty) setTodas(snap.docs.map(d=>({id:d.id,...d.data()})));
      }catch(e){console.warn("Firebase:",e.message);}
      finally{setLoading(false);}
    })();
  },[]);
  return {todas,loading};
}

function DiffBadge({diff,small}){
  const d=diffInfo(diff);
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:d.bg,border:`1px solid ${d.bd}`,borderRadius:100,padding:small?"2px 7px":"3px 10px",fontSize:small?9:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:d.cor}}>{d.icon} {d.label}</span>;
}
function MatchBadge({match,small}){
  const c=matchCor(match);
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${c}18`,border:`1px solid ${c}40`,borderRadius:100,padding:small?"2px 8px":"4px 10px",fontSize:small?10:11,fontWeight:700,color:c}}>🎯 {match}% match</span>;
}
function ScorePill({score}){
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border2}`,borderRadius:100,padding:"3px 9px",fontSize:11,fontWeight:700,color:C.text}}><span style={{color:"#FFB800",fontSize:10}}>★</span> {score}</span>;
}
function Spinner(){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300,gap:16}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${C.border2}`,borderTopColor:C.neon,animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontSize:13,color:C.muted}}>Buscando provas...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function StatusBar(){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px 0",fontSize:12,fontWeight:600,color:C.text,position:"relative"}}>
      <span>9:41</span>
      <div style={{width:110,height:26,background:C.dark2,borderRadius:"0 0 14px 14px",position:"absolute",top:0,left:"50%",transform:"translateX(-50%)"}}/>
      <span style={{fontSize:11}}>●●● WiFi 🔋</span>
    </div>
  );
}
function BottomNav({active,onNav}){
  const items=[{id:"home",icon:"🏠",label:"Home"},{id:"explore",icon:"🔍",label:"Explorar"},{id:"saved",icon:"❤️",label:"Salvos"},{id:"profile",icon:"👤",label:"Perfil"}];
  return(
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:76,background:"rgba(10,10,18,0.97)",backdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-around",padding:"0 8px 10px"}}>
      {items.map(it=>(
        <button key={it.id} onClick={()=>onNav(it.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",flex:1,color:active===it.id?C.neon:C.muted,fontFamily:FB,fontSize:9,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>
          <span style={{fontSize:20}}>{it.icon}</span>{it.label}
          <div style={{width:4,height:4,borderRadius:"50%",background:C.neon,opacity:active===it.id?1:0}}/>
        </button>
      ))}
    </div>
  );
}

function HomeScreen({provas,loading,onRace,onBuscar}){
  const [busca,setBusca]=useState("");
  const proximas=provas.slice(0,3);
  const destaque=provas.filter(r=>r.match>=75).slice(0,2);
  return(
    <div style={{paddingBottom:80,overflowY:"auto",height:"100%",fontFamily:FB}}>
      <div style={{background:C.dark2,padding:"52px 18px 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-70,right:-50,width:260,height:260,background:"radial-gradient(circle,rgba(139,92,246,0.1),transparent 65%)",borderRadius:"50%",pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,position:"relative",zIndex:1}}>
          <span style={{fontSize:12,color:C.muted2,fontWeight:500}}>Bom dia, corredor 👋</span>
          <div style={{width:32,height:32,background:C.card2,border:`1px solid ${C.border2}`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🔔</div>
        </div>
        <div style={{fontFamily:FD,fontSize:38,fontWeight:900,lineHeight:0.95,letterSpacing:"-0.01em",marginBottom:16,position:"relative",zIndex:1,color:C.text}}>
          Sua próxima<br/><span style={{color:C.neon}}>corrida</span><br/><span style={{color:C.neon2}}>perfeita.</span>
        </div>
        <div style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${busca?C.neon2:C.border2}`,borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:9,position:"relative",zIndex:1,transition:"border 0.2s"}}>
          <span style={{fontSize:15}}>🔎</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>e.key==="Enter"&&busca.trim()&&onBuscar(busca.trim())} placeholder="Buscar por prova ou cidade..." style={{flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:C.text,fontFamily:FB}}/>
          {busca&&<button onClick={()=>onBuscar(busca)} style={{background:C.neon,color:C.dark,border:"none",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FB}}>Buscar</button>}
        </div>
      </div>
      <div style={{display:"flex",gap:7,padding:"12px 18px"}}>
        {[[String(provas.length),"Provas"],["94%","Match médio"],["4.7","Score médio"]].map(([v,l])=>(
          <div key={l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"10px 8px",flex:1,textAlign:"center"}}>
            <div style={{fontFamily:FD,fontSize:22,fontWeight:800,color:C.neon,lineHeight:1}}>{v}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 18px",marginBottom:10}}>
        <span style={{fontFamily:FD,fontSize:16,fontWeight:800,textTransform:"uppercase",color:C.text}}>📍 Próximas de você</span>
      </div>
      {loading?<Spinner/>:(
        <div style={{display:"flex",gap:10,padding:"0 18px",overflowX:"auto",scrollbarWidth:"none"}}>
          {proximas.map(r=>(
            <button key={r.id} onClick={()=>onRace(r)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:15,padding:13,minWidth:185,flexShrink:0,textAlign:"left",cursor:"pointer",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:r.match>=80?`linear-gradient(90deg,${C.neon},${C.neon2})`:`linear-gradient(90deg,${C.yellow},${C.orange})`}}/>
              <div style={{fontFamily:FD,fontSize:15,fontWeight:700,lineHeight:1.1,color:C.text,marginBottom:4}}>{r.nome}</div>
              <DiffBadge diff={r.dificuldade} small/>
              <div style={{fontSize:9,color:C.muted,margin:"5px 0 7px"}}>📅 {r.data?.dia} {r.data?.mes} · {r.cidade}</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}><MatchBadge match={r.match} small/></div>
            </button>
          ))}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 18px",margin:"18px 0 10px"}}>
        <span style={{fontFamily:FD,fontSize:16,fontWeight:800,textTransform:"uppercase",color:C.text}}>🔥 Em destaque</span>
      </div>
      <div style={{display:"flex",gap:10,padding:"0 18px",overflowX:"auto",scrollbarWidth:"none",paddingBottom:16}}>
        {destaque.map((r,i)=>(
          <button key={r.id} onClick={()=>onRace(r)} style={{minWidth:230,flexShrink:0,borderRadius:15,padding:16,textAlign:"left",cursor:"pointer",background:i===0?"linear-gradient(145deg,#1F0A00,#2A1000)":"linear-gradient(145deg,#001A16,#002018)",border:`1px solid ${i===0?"rgba(255,92,26,0.2)":"rgba(58,255,212,0.2)"}`}}>
            <div style={{background:i===0?C.orange:C.neon2,color:i===0?"#fff":C.dark,fontSize:9,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",padding:"2px 8px",borderRadius:5,display:"inline-block",marginBottom:8}}>{i===0?"⭐ Destaque":"🌿 Trail"}</div>
            <div style={{fontFamily:FD,fontSize:19,fontWeight:900,textTransform:"uppercase",lineHeight:1,marginBottom:5,color:C.text}}>{r.nome}</div>
            <div style={{fontSize:10,color:C.muted2,marginBottom:10}}>📅 {r.data?.label} · {r.cidade}</div>
            <div style={{fontFamily:FD,fontSize:22,fontWeight:800,color:i===0?C.orange:C.neon2}}>{r.preco||"Ver inscrição"}</div>
            <div style={{display:"flex",gap:4,marginTop:7}}><DiffBadge diff={r.dificuldade} small/><MatchBadge match={r.match} small/></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExploreScreen({provas,loading,onRace,buscaInicial}){
  const [busca,setBusca]=useState(buscaInicial||"");
  const [tipo,setTipo]=useState("Todas");
  const [ordem,setOrdem]=useState("match");
  const tipos=["Todas","Corrida de Rua","Trail","Meia","Maratona"];
  const filtradas=useMemo(()=>{
    let r=[...provas];
    if(busca.trim()){const t=busca.toLowerCase();r=r.filter(p=>p.nome?.toLowerCase().includes(t)||p.cidade?.toLowerCase().includes(t)||p.distancia?.toLowerCase().includes(t));}
    if(tipo==="Trail") r=r.filter(p=>p.tipo==="trail");
    if(tipo==="Corrida de Rua") r=r.filter(p=>p.tipo==="urban");
    if(tipo==="Meia") r=r.filter(p=>p.distanciaKm===21);
    if(tipo==="Maratona") r=r.filter(p=>p.distanciaKm===42);
    if(ordem==="match") r.sort((a,b)=>b.match-a.match);
    if(ordem==="score") r.sort((a,b)=>(b.score||0)-(a.score||0));
    return r;
  },[provas,busca,tipo,ordem]);
  return(
    <div style={{paddingBottom:80,overflowY:"auto",height:"100%",fontFamily:FB}}>
      <div style={{background:C.dark2,padding:"52px 18px 16px",position:"relative",overflow:"hidden"}}>
        <div style={{fontFamily:FD,fontSize:34,fontWeight:900,textTransform:"uppercase",lineHeight:0.95,marginBottom:14,color:C.text}}>Explorar<br/><span style={{color:C.neon2}}>Provas</span></div>
        <div style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${busca?C.neon2:C.border2}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:9,marginBottom:14,transition:"border 0.2s"}}>
          <span style={{fontSize:14}}>🔎</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar prova, cidade, distância..." style={{flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:C.text,fontFamily:FB}}/>
          {busca&&<button onClick={()=>setBusca("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>✕</button>}
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
          {tipos.map(t=><button key={t} onClick={()=>setTipo(t)} style={{background:tipo===t?C.neon:C.card,border:`1px solid ${tipo===t?C.neon:C.border}`,borderRadius:100,padding:"6px 13px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",color:tipo===t?C.dark:C.muted2,cursor:"pointer",flexShrink:0,fontFamily:FB}}>{t}</button>)}
        </div>
      </div>
      <div style={{display:"flex",gap:6,padding:"10px 18px 0",overflowX:"auto",scrollbarWidth:"none"}}>
        {[["match","🎯 Por match"],["score","⭐ Por score"]].map(([v,l])=>(
          <button key={v} onClick={()=>setOrdem(v)} style={{background:ordem===v?C.card2:C.card,border:`1px solid ${ordem===v?C.neon2:C.border2}`,borderRadius:9,padding:"6px 12px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",flexShrink:0,color:ordem===v?C.neon2:C.muted2,cursor:"pointer",fontFamily:FB}}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px 4px"}}>
        <span style={{fontSize:10,color:C.muted}}>{loading?"Buscando...":`${filtradas.length} prova${filtradas.length!==1?"s":""}`}</span>
        {busca&&<span onClick={()=>setBusca("")} style={{fontSize:10,color:C.neon,fontWeight:700,cursor:"pointer"}}>Limpar ✕</span>}
      </div>
      {loading?<Spinner/>:filtradas.length===0?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200,gap:12,padding:24}}>
          <span style={{fontSize:36}}>🔍</span>
          <span style={{fontFamily:FD,fontSize:18,fontWeight:700,color:C.text}}>Nenhuma prova encontrada</span>
          <button onClick={()=>{setBusca("");setTipo("Todas");}} style={{background:C.neon,color:C.dark,border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>Ver todas</button>
        </div>
      ):(
        <div style={{padding:"6px 18px",display:"flex",flexDirection:"column",gap:9,paddingBottom:16}}>
          {filtradas.map(r=>(
            <button key={r.id} onClick={()=>onRace(r)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:15,padding:13,textAlign:"left",cursor:"pointer",width:"100%"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:9}}>
                <div style={{background:C.dark3,borderRadius:9,padding:"7px 9px",textAlign:"center",flexShrink:0,minWidth:42}}>
                  <div style={{fontFamily:FD,fontSize:22,fontWeight:900,color:C.neon,lineHeight:1}}>{r.data?.dia||"--"}</div>
                  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:"0.1em",color:C.muted}}>{r.data?.mes||"---"}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:FD,fontSize:15,fontWeight:800,lineHeight:1.1,marginBottom:3,color:C.text}}>{r.nome}</div>
                  <div style={{fontSize:9,color:C.muted,marginBottom:5}}>📍 {r.cidade}{r.estado?`, ${r.estado}`:""}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    <span style={{background:r.tipo==="trail"?"rgba(58,255,212,0.07)":"rgba(232,255,58,0.07)",border:`1px solid ${r.tipo==="trail"?"rgba(58,255,212,0.18)":"rgba(232,255,58,0.18)"}`,borderRadius:5,padding:"2px 6px",fontSize:9,fontWeight:700,textTransform:"uppercase",color:r.tipo==="trail"?C.neon2:C.neon}}>{r.tipo==="trail"?"Trail":"Urbana"}</span>
                    {r.distancia&&<span style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border2}`,borderRadius:5,padding:"2px 6px",fontSize:9,fontWeight:700,textTransform:"uppercase",color:C.muted2}}>{r.distancia}</span>}
                    <DiffBadge diff={r.dificuldade} small/>
                  </div>
                </div>
                {r.preco&&<div style={{fontFamily:FD,fontSize:15,fontWeight:800,background:C.dark3,borderRadius:7,padding:"3px 9px",flexShrink:0,color:C.text}}>{r.preco}</div>}
              </div>
              {r.match&&(
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:9}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:9,color:C.muted,fontWeight:600}}>🎯 Compatibilidade</span>
                    <span style={{fontFamily:FD,fontSize:14,fontWeight:800,color:matchCor(r.match)}}>{r.match}%</span>
                  </div>
                  <div style={{height:4,background:C.dark3,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${r.match}%`,background:matchGrad(r.match),borderRadius:2}}/>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetalheScreen({prova:r,onVoltar}){
  return(
    <div style={{paddingBottom:80,overflowY:"auto",height:"100%",fontFamily:FB}}>
      <div style={{height:200,background:"linear-gradient(160deg,#051A14,#071F18,#0A0F1A)",position:"relative",display:"flex",alignItems:"flex-end",padding:"16px 18px",overflow:"hidden"}}>
        <button onClick={onVoltar} style={{position:"absolute",top:50,left:16,zIndex:10,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",border:`1px solid ${C.border2}`,borderRadius:10,padding:"7px 11px",fontSize:16,color:C.text,cursor:"pointer"}}>←</button>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{background:C.neon2,color:C.dark,fontSize:9,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",padding:"2px 9px",borderRadius:5,display:"inline-block",marginBottom:7}}>{r.tipo==="trail"?"🌿 Trail":"🏙 Urbana"}{r.distancia?` · ${r.distancia}`:""}</div>
          <div style={{fontFamily:FD,fontSize:30,fontWeight:900,textTransform:"uppercase",lineHeight:0.95,color:C.text}}>{r.nome}</div>
        </div>
        {r.fonte&&<div style={{position:"absolute",top:50,right:16,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",border:`1px solid ${C.border2}`,borderRadius:8,padding:"4px 10px",fontSize:9,color:C.muted2}}>via {r.fonte}</div>}
      </div>
      <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12,paddingBottom:16}}>
        {r.match&&(
          <div style={{background:"linear-gradient(135deg,rgba(232,255,58,0.06),rgba(58,255,212,0.03))",border:"1px solid rgba(232,255,58,0.18)",borderRadius:15,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
              <span style={{fontSize:10,fontWeight:700,color:C.muted2,textTransform:"uppercase",letterSpacing:"0.07em"}}>🎯 Match com você</span>
              <DiffBadge diff={r.dificuldade}/>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,marginBottom:5}}>
              <span style={{fontFamily:FD,fontSize:44,fontWeight:900,color:matchCor(r.match),lineHeight:1}}>{r.match}%</span>
              <span style={{fontSize:10,color:C.muted2,paddingBottom:5}}>de compatibilidade</span>
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {[["📅","Data",r.data?.label||"—"],["📍","Local",r.cidade?`${r.cidade}${r.estado?`, ${r.estado}`:""}`:"-"],["📏","Distância",r.distancia||"—"],["🏷️","Fonte",r.fonte||"—"]].map(([ic,lbl,val])=>(
            <div key={lbl} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18,flexShrink:0}}>{ic}</span>
              <div><div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{lbl}</div><div style={{fontSize:12,fontWeight:700,color:C.text}}>{val}</div></div>
            </div>
          ))}
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:15,padding:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Inscrição</div>
            <div style={{fontFamily:FD,fontSize:36,fontWeight:900,color:C.neon,lineHeight:1}}>{r.preco||"Ver site"}</div>
          </div>
          <a href={r.link} target="_blank" rel="noopener noreferrer" style={{background:C.neon,color:C.dark,fontFamily:FD,fontSize:16,fontWeight:900,letterSpacing:"0.05em",textTransform:"uppercase",border:"none",borderRadius:11,padding:"13px 20px",cursor:"pointer",textDecoration:"none",boxShadow:"0 4px 20px rgba(232,255,58,0.2)"}}>
            Inscrever-se →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaceMarket(){
  const [tela,setTela]=useState("home");
  const [prova,setProva]=useState(null);
  const [busca,setBusca]=useState("");
  const {todas,loading}=useProvas();
  function abrirProva(r){setProva(r);setTela("detalhe");}
  function navegar(id){setProva(null);setBusca("");setTela(id);}
  function buscarExplore(termo){setBusca(termo);setTela("explore");}
  const navAtivo=tela==="detalhe"?"explore":tela;
  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;}
        input::placeholder{color:#6B6B85;}
      `}</style>
      <div style={{width:"100%",minHeight:"100vh",background:C.dark,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px 40px",fontFamily:FB}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <div style={{width:28,height:28,background:C.neon,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏁</div>
          <span style={{fontFamily:FD,fontSize:22,fontWeight:900,letterSpacing:"0.05em",textTransform:"uppercase",color:C.text}}>Pace<span style={{color:C.neon}}>·</span>Market</span>
          <div style={{background:C.card2,border:`1px solid ${C.border2}`,borderRadius:100,padding:"3px 10px",fontSize:9,fontWeight:700,color:C.muted2,marginLeft:6}}>
            Firebase · <span style={{color:C.neon}}>live</span>
          </div>
        </div>
        <div style={{width:375,height:812,background:C.dark2,borderRadius:48,border:"1.5px solid rgba(255,255,255,0.08)",overflow:"hidden",position:"relative",boxShadow:"0 0 0 1px rgba(0,0,0,0.5),0 50px 100px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.05)",display:"flex",flexDirection:"column"}}>
          <StatusBar/>
          <div style={{flex:1,overflow:"hidden",position:"relative"}}>
            {tela==="home"    &&<HomeScreen    provas={todas} loading={loading} onRace={abrirProva} onBuscar={buscarExplore}/>}
            {tela==="explore" &&<ExploreScreen provas={todas} loading={loading} onRace={abrirProva} buscaInicial={busca}/>}
            {tela==="detalhe" &&prova&&<DetalheScreen prova={prova} onVoltar={()=>setTela("explore")}/>}
            {tela==="saved"   &&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}><span style={{fontSize:44}}>❤️</span><span style={{fontFamily:FD,fontSize:18,fontWeight:700,textTransform:"uppercase",color:C.text}}>Provas Salvas</span><span style={{fontSize:12,color:C.muted}}>Em breve</span></div>}
            {tela==="profile" &&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12}}><span style={{fontSize:44}}>👤</span><span style={{fontFamily:FD,fontSize:18,fontWeight:700,textTransform:"uppercase",color:C.text}}>Perfil</span><span style={{fontSize:12,color:C.muted}}>Em breve</span></div>}
          </div>
          <BottomNav active={navAtivo} onNav={navegar}/>
        </div>
        <div style={{marginTop:14,fontSize:10,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase"}}>
          {loading?"Carregando...":`${todas.length} provas · Firebase live`}
        </div>
      </div>
    </>
  );
}
