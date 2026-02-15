/* ════════════════════════════════════════════
   FinTrack v3 — firebase.js
   Firebase Auth (Email + Google) + Firestore
════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ── Config ──────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBoPwf_3HJdD1CDyjtFzEyAntpiduWC_bg",
  authDomain:        "fintrack-app-d6154.firebaseapp.com",
  projectId:         "fintrack-app-d6154",
  storageBucket:     "fintrack-app-d6154.firebasestorage.app",
  messagingSenderId: "701605537549",
  appId:             "1:701605537549:web:fcdb65429e7defd8273244",
  measurementId:     "G-HW293C2WLX"
};

// ── Initialize ──────────────────────────────
const fbApp      = initializeApp(firebaseConfig);
const analytics  = getAnalytics(fbApp);
const auth        = getAuth(fbApp);
const db          = getFirestore(fbApp);

// ── Auth Providers ──────────────────────────
const googleProvider   = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// ── Auth State Observer ─────────────────────
// Called by app.js on init
function onAuthReady(callback) {
  onAuthStateChanged(auth, callback);
}

// ══════════════════════════════════
// AUTH FUNCTIONS
// ══════════════════════════════════

async function fbSignIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function fbRegister(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Simpan nama ke Firebase Auth profile
  await updateProfile(cred.user, { displayName: name });
  // Buat dokumen user di Firestore
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email,
    createdAt: new Date().toISOString()
  });
  return cred.user;
}

async function fbGoogleSignIn() {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;
  // Buat/update dokumen user di Firestore jika belum ada
  const uRef = doc(db, 'users', user.uid);
  const uSnap = await getDoc(uRef);
  if (!uSnap.exists()) {
    await setDoc(uRef, {
      name:      user.displayName || 'Pengguna',
      email:     user.email,
      photoURL:  user.photoURL || null,
      createdAt: new Date().toISOString()
    });
  }
  return user;
}

async function fbFacebookSignIn() {
  const cred = await signInWithPopup(auth, facebookProvider);
  const user = cred.user;
  const uRef = doc(db, 'users', user.uid);
  const uSnap = await getDoc(uRef);
  if (!uSnap.exists()) {
    await setDoc(uRef, {
      name:      user.displayName || 'Pengguna',
      email:     user.email || '',
      photoURL:  user.photoURL || null,
      createdAt: new Date().toISOString()
    });
  }
  return user;
}

async function fbSignOut() {
  await signOut(auth);
}

// ══════════════════════════════════
// FIRESTORE — USER DATA
// ══════════════════════════════════
async function getUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

async function saveUserSettings(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// ══════════════════════════════════
// FIRESTORE — SAVINGS (Target)
// ══════════════════════════════════
async function getSavings(uid) {
  const q = query(
    collection(db, 'users', uid, 'savings'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addSaving(uid, data) {
  const ref = await addDoc(collection(db, 'users', uid, 'savings'), {
    ...data,
    createdAt: new Date().toISOString()
  });
  return ref.id;
}

async function updateSaving(uid, savingId, data) {
  await updateDoc(doc(db, 'users', uid, 'savings', savingId), data);
}

async function deleteSaving(uid, savingId) {
  await deleteDoc(doc(db, 'users', uid, 'savings', savingId));
}

// ══════════════════════════════════
// FIRESTORE — FLEXIBLE SAVINGS
// ══════════════════════════════════
async function getFlexible(uid) {
  const q = query(
    collection(db, 'users', uid, 'flexible'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addFlexible(uid, data) {
  const ref = await addDoc(collection(db, 'users', uid, 'flexible'), {
    ...data,
    createdAt: new Date().toISOString()
  });
  return ref.id;
}

async function updateFlexible(uid, id, data) {
  await updateDoc(doc(db, 'users', uid, 'flexible', id), data);
}

// ══════════════════════════════════
// FIRESTORE — TODOS
// ══════════════════════════════════
async function getTodos(uid) {
  const q = query(
    collection(db, 'users', uid, 'todos'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addTodo(uid, data) {
  const ref = await addDoc(collection(db, 'users', uid, 'todos'), {
    ...data,
    createdAt: new Date().toISOString()
  });
  return ref.id;
}

async function updateTodo(uid, todoId, data) {
  await updateDoc(doc(db, 'users', uid, 'todos', todoId), data);
}

async function deleteTodo(uid, todoId) {
  await deleteDoc(doc(db, 'users', uid, 'todos', todoId));
}

// ══════════════════════════════════
// FIRESTORE — TRANSACTIONS
// ══════════════════════════════════
async function getTransactions(uid) {
  const q = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addTransaction(uid, data) {
  const ref = await addDoc(collection(db, 'users', uid, 'transactions'), {
    ...data,
    date: new Date().toISOString()
  });
  return ref.id;
}

// ══════════════════════════════════
// EXPORT semua fungsi ke window
// ══════════════════════════════════
// Karena app.js belum pakai ES module, kita expose via window
window.FB = {
  // Auth
  onAuthReady,
  signIn:         fbSignIn,
  register:       fbRegister,
  googleSignIn:   fbGoogleSignIn,
  facebookSignIn: fbFacebookSignIn,
  signOut:        fbSignOut,
  // User
  getUserData,
  saveUserSettings,
  // Savings
  getSavings,
  addSaving,
  updateSaving,
  deleteSaving,
  // Flexible
  getFlexible,
  addFlexible,
  updateFlexible,
  // Todos
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  // Transactions
  getTransactions,
  addTransaction,
  // Current user helper
  get currentUser() { return auth.currentUser; }
};

console.log('[FinTrack] Firebase ready ✓');

// Dispatch event supaya app.js tahu window.FB sudah siap
window.dispatchEvent(new Event('firebase-ready'));
