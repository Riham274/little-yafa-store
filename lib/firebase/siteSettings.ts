import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

const SITE_SETTINGS_COLLECTION = "siteSettings";
const HOMEPAGE_DOC_ID = "homepage";

/** Null when the doc/field doesn't exist yet — callers fall back to the
 * static public/new-hero-banner.png until an admin uploads a replacement
 * through the settings page. */
export async function getHeroBannerUrl(): Promise<string | null> {
  const snap = await getDoc(doc(db, SITE_SETTINGS_COLLECTION, HOMEPAGE_DOC_ID));
  if (!snap.exists()) return null;
  const url = snap.data().heroBannerUrl;
  return typeof url === "string" && url ? url : null;
}

export async function setHeroBannerUrl(url: string): Promise<void> {
  await setDoc(doc(db, SITE_SETTINGS_COLLECTION, HOMEPAGE_DOC_ID), { heroBannerUrl: url }, { merge: true });
}
