import { doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from "firebase/auth";
import { app, db } from "./config";

// Admin-only — see the comment in config.ts for why this lives here instead
// of being initialized alongside `db`.
export const auth = getAuth(app);

export async function isAdminUser(user: User): Promise<boolean> {
  const snap = await getDoc(doc(db, "admins", user.uid));
  return snap.exists() && snap.data().role === "admin";
}

export async function loginAdmin(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const ok = await isAdminUser(credential.user);
  if (!ok) {
    await firebaseSignOut(auth);
    throw new Error("This account does not have admin access.");
  }
  return credential.user;
}

export async function logoutAdmin() {
  await firebaseSignOut(auth);
}
