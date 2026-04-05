/**
 * PaceMarket — Firebase Hooks
 * Todos os hooks e operações do Firebase centralizados.
 */
import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs,
  doc, setDoc, getDoc, deleteDoc, updateDoc
} from "firebase/firestore";

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBwoiW0fZ1UL3h283x0sfmdroVi3_T14bE",
  authDomain:        "pacemarket-be6c9.firebaseapp.com",
  projectId:         "pacemarket-be6c9",
  storageBucket:     "pacemarket-be6c9.firebasestorage.app",
  messagingSenderId: "583598891691",
  appId:             "1:583598891691:web:bfaf831e3b85bdbbfb4dee",
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(firebaseApp);

export const USER_ID = "user_local";

// ── HOOK: PROVAS ─────────────────────────────────────────
export function useProvas() {
  const [todas, setTodas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "provas"));
        if (!snap.empty) {
          const hoje = new Date().toISOString().split("T")[0];
          const futuras = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.data?.iso && p.data.iso >= hoje);
          setTodas(futuras);
        }
      } catch (e) {
        console.warn("Provas:", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { todas, loading };
}

// ── HOOK: USUÁRIO ────────────────────────────────────────
export function useUser() {
  const [user, setUser]         = useState(null);
  const [loadingUser, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", USER_ID));
        if (snap.exists()) setUser(snap.data());
      } catch (e) {
        console.warn("User:", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const salvarUser = useCallback(async (dados) => {
    try {
      await setDoc(doc(db, "users", USER_ID), dados);
      setUser(dados);
    } catch (e) {
      console.warn("Salvar user:", e.message);
    }
  }, []);

  const atualizarPlano = useCallback(async (plano) => {
    if (!user) return;
    const atualizado = { ...user, plano };
    await setDoc(doc(db, "users", USER_ID), atualizado);
    setUser(atualizado);
  }, [user]);

  return { user, loadingUser, salvarUser, atualizarPlano };
}

// ── HOOK: SALVOS ─────────────────────────────────────────
export function useSalvos() {
  const [salvos, setSalvos]         = useState({});
  const [loadingSalvo, setLoading]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users", USER_ID, "salvos"));
        const mapa = {};
        snap.docs.forEach(d => { mapa[d.id] = d.data(); });
        setSalvos(mapa);
      } catch (e) {
        console.warn("Salvos:", e.message);
      }
    })();
  }, []);

  const toggleSalvo = useCallback(async (prova) => {
    setLoading(prova.id);
    try {
      const ref = doc(db, "users", USER_ID, "salvos", prova.id);
      if (salvos[prova.id]) {
        await deleteDoc(ref);
        setSalvos(prev => { const n = { ...prev }; delete n[prova.id]; return n; });
      } else {
        await setDoc(ref, prova);
        setSalvos(prev => ({ ...prev, [prova.id]: prova }));
      }
    } catch (e) {
      console.warn("Toggle salvo:", e.message);
    } finally {
      setLoading(null);
    }
  }, [salvos]);

  return { salvos, toggleSalvo, loadingSalvo };
}
