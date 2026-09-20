import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";
import type { LocalizedText } from "@/lib/types";

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

export type SeasonalCategorySettings = {
  name: LocalizedText;
  iconUrl: string;
};

// The homepage's second category row, 4th card, before this became
// admin-editable — kept as the fallback for any field not yet set in
// Firestore (a fresh site, or one that predates this feature), so the card
// never renders blank name/icon.
export const DEFAULT_SEASONAL_CATEGORY: SeasonalCategorySettings = {
  name: { ar: "تشكيلة الشتاء", en: "Winter Collection", he: "קולקציית חורף" },
  iconUrl: "/icon-winter.png",
};

/** Always resolves to a complete, displayable value — missing/partial
 * fields (or no doc at all) fall back per-field to DEFAULT_SEASONAL_CATEGORY
 * rather than surfacing an error, since this feeds directly into a
 * storefront card that must always have something to show. The underlying
 * "winter" category value (routing/product tagging) is untouched by any of
 * this — only the displayed name/icon are dynamic. */
export async function getSeasonalCategory(): Promise<SeasonalCategorySettings> {
  const snap = await getDoc(doc(db, SITE_SETTINGS_COLLECTION, HOMEPAGE_DOC_ID));
  if (!snap.exists()) return DEFAULT_SEASONAL_CATEGORY;
  const data = snap.data();
  const rawName = data.seasonalCategoryName as Partial<LocalizedText> | undefined;
  const iconUrl = data.seasonalCategoryIconUrl;
  return {
    name: {
      ar: rawName?.ar || DEFAULT_SEASONAL_CATEGORY.name.ar,
      en: rawName?.en || DEFAULT_SEASONAL_CATEGORY.name.en,
      he: rawName?.he || DEFAULT_SEASONAL_CATEGORY.name.he,
    },
    iconUrl: typeof iconUrl === "string" && iconUrl ? iconUrl : DEFAULT_SEASONAL_CATEGORY.iconUrl,
  };
}

export async function setSeasonalCategory(settings: SeasonalCategorySettings): Promise<void> {
  await setDoc(
    doc(db, SITE_SETTINGS_COLLECTION, HOMEPAGE_DOC_ID),
    { seasonalCategoryName: settings.name, seasonalCategoryIconUrl: settings.iconUrl },
    { merge: true }
  );
}
