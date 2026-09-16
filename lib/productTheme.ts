import type { Product } from "@/lib/types";

// Theme-based name matching for the "Similar Products" score (see
// getSimilarProducts() in lib/firebase/products.ts) — compares the Arabic
// `name.ar` field (the primary, always-populated admin-entered language)
// looking for shared *distinctive* words (e.g. "حصان"/horse, "فراشة"/
// butterfly) rather than the generic garment/gender/color/material words
// that appear in nearly every product name and would otherwise make almost
// any two products look "similar".

// Garment/category nouns, gender & age-group words, piece/quantity words,
// fabric/material, season, quality/marketing filler, and colors — none of
// these indicate a real theme, they're just how nearly every product name
// in this shop is built. Listed in whatever inflected/spelling form is
// actually seen in real product names; normalizeArabicWord() below folds
// spelling variants (alef forms, ta-marbuta, diacritics) onto the same
// keys, so one entry here also catches close variants.
const STOP_WORDS_RAW = [
  // Garment / category nouns
  "فستان", "فساتين", "طقم", "أطقم", "اطقم", "اوفرهول", "أوفرهول", "رومبر",
  "سيت", "حذاء", "أحذية", "احذية", "بنطلون", "بنطال", "جاكيت", "كنزة",
  "تيشيرت", "تيشرت", "تي شيرت", "بلوزة", "جيبة", "جيب", "كاب", "قبعة",
  "شورت", "ليقنز", "توب", "قميص", "كارديجان", "بيجامة",
  // Piece / quantity words
  "قطعة", "قطعتين", "قطع", "دبل",
  // Gender / age-group / audience words
  "بنات", "بناتي", "بنت", "اولاد", "أولاد", "ولادي", "ولد", "بيبي",
  "مولود", "اطفال", "أطفال", "طفل",
  // Fabric / material
  "قطن", "صوف", "كتان", "لينن", "جينز", "دنيم", "كوردوروي", "فوتر",
  "حرير", "ساتان", "شيفون", "تريكو", "بوليستر", "مخمل",
  // Season
  "شتوي", "صيفي", "خريفي", "ربيعي", "شتاء", "صيف", "خريف", "ربيع",
  // Quality / marketing filler
  "عملي", "مميز", "ترند", "فاخر", "انيق", "أنيق", "دافئ", "ناعم",
  "مضمون", "مضمونة", "مكفول", "جودة", "تصميم", "موديل", "ستايل",
  "جديد", "حديثاً", "طبيعي", "كم", "مخطط", "مطرز", "مطرزة", "مورد",
  // Colors
  "ابيض", "أبيض", "اسود", "أسود", "احمر", "أحمر", "ازرق", "أزرق",
  "اخضر", "أخضر", "اصفر", "أصفر", "بني", "رمادي", "بيج", "وردي",
  "كريمي", "ذهبي", "فضي", "ايفوري", "إيفوري", "فستقي", "فاتح", "غامق",
  "موف", "نبيتي", "تركواز", "زهري",
  // Size / unit words
  "مقاس", "سم", "شهر", "شهور", "سنة", "سنوات", "واحد", "واحدة",
];

const AR_DIACRITICS_RE = /[ً-ٰٟـ]/g;

function normalizeArabicWord(word: string): string {
  return word
    .replace(AR_DIACRITICS_RE, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^\d+|\d+$/g, "") // strips fused numbers like "طقم3" / "3قطع"
    .trim();
}

const STOP_WORDS = new Set(STOP_WORDS_RAW.map(normalizeArabicWord));

/** Splits a product's Arabic name into its distinctive "theme" words —
 * empty/very short tokens, pure numbers, and every generic garment/gender/
 * material/color/season/marketing word in STOP_WORDS are dropped, leaving
 * (ideally) only motif words like "حصان"/"فراشة"/"وردة"/"أرنب"/"نجوم". */
export function extractThemeWords(nameAr: string): Set<string> {
  const words = nameAr
    .split(/[\s\-–—.,،:؛()]+/)
    .map(normalizeArabicWord)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

/** Count of distinctive theme words two products' Arabic names share —
 * e.g. "فستان بنات ثيم حصان" and "طقم أولاد حصان" share "حصان" (score 1)
 * despite being different garment types entirely. Used as an additional
 * ranking boost in getSimilarProducts(), on top of (never instead of) the
 * category-sharing requirement that already scopes the candidate pool. */
export function themeWordOverlapScore(a: Product, b: Product): number {
  const wordsA = extractThemeWords(a.name.ar);
  const wordsB = extractThemeWords(b.name.ar);
  let count = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) count++;
  }
  return count;
}
