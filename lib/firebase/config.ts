import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Auth and Storage are deliberately NOT initialized here. Every
// customer-facing page only needs `db` (Firestore reads); the Auth and
// Storage SDKs are admin-only concerns. `getAuth()`/`getStorage()` are
// side-effecting calls a bundler can't prove are safe to drop, so having
// them here forced their ~680KB combined SDK weight into every storefront
// page's JS bundle. They now live in lib/firebase/auth.ts and
// lib/firebase/storage.ts respectively, which only admin code imports —
// keeping them out of this shared module lets route-based code splitting
// exclude them from the customer bundle entirely.
