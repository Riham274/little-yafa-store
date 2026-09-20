export type CountryCode = {
  iso: string;
  dial: string;
  nameEn: string;
  nameAr: string;
  nameHe: string;
};

// Palestine first (the default/pre-selected choice — see DEFAULT_COUNTRY_DIAL
// below), then Israel and neighboring countries most likely for this shop's
// customers, then the rest of the world roughly grouped by region. Not an
// exhaustive ISO list — just a practical "searchable" set (native <select>
// type-ahead, see the country-code <select> in checkout/page.tsx) covering
// every country a real customer or admin is plausibly dialing.
export const COUNTRY_CODES: CountryCode[] = [
  { iso: "PS", dial: "970", nameEn: "Palestine", nameAr: "فلسطين", nameHe: "פלסטין" },
  { iso: "IL", dial: "972", nameEn: "Israel", nameAr: "إسرائيل", nameHe: "ישראל" },
  { iso: "JO", dial: "962", nameEn: "Jordan", nameAr: "الأردن", nameHe: "ירדן" },
  { iso: "EG", dial: "20", nameEn: "Egypt", nameAr: "مصر", nameHe: "מצרים" },
  { iso: "LB", dial: "961", nameEn: "Lebanon", nameAr: "لبنان", nameHe: "לבנון" },
  { iso: "SY", dial: "963", nameEn: "Syria", nameAr: "سوريا", nameHe: "סוריה" },
  { iso: "IQ", dial: "964", nameEn: "Iraq", nameAr: "العراق", nameHe: "עיראק" },
  { iso: "SA", dial: "966", nameEn: "Saudi Arabia", nameAr: "السعودية", nameHe: "ערב הסעודית" },
  { iso: "AE", dial: "971", nameEn: "United Arab Emirates", nameAr: "الإمارات", nameHe: "איחוד האמירויות" },
  { iso: "QA", dial: "974", nameEn: "Qatar", nameAr: "قطر", nameHe: "קטאר" },
  { iso: "KW", dial: "965", nameEn: "Kuwait", nameAr: "الكويت", nameHe: "כווית" },
  { iso: "BH", dial: "973", nameEn: "Bahrain", nameAr: "البحرين", nameHe: "בחריין" },
  { iso: "OM", dial: "968", nameEn: "Oman", nameAr: "عمان", nameHe: "עומאן" },
  { iso: "YE", dial: "967", nameEn: "Yemen", nameAr: "اليمن", nameHe: "תימן" },
  { iso: "TR", dial: "90", nameEn: "Turkey", nameAr: "تركيا", nameHe: "טורקיה" },
  { iso: "MA", dial: "212", nameEn: "Morocco", nameAr: "المغرب", nameHe: "מרוקו" },
  { iso: "DZ", dial: "213", nameEn: "Algeria", nameAr: "الجزائر", nameHe: "אלג'יריה" },
  { iso: "TN", dial: "216", nameEn: "Tunisia", nameAr: "تونس", nameHe: "טוניסיה" },
  { iso: "LY", dial: "218", nameEn: "Libya", nameAr: "ليبيا", nameHe: "לוב" },
  { iso: "SD", dial: "249", nameEn: "Sudan", nameAr: "السودان", nameHe: "סודן" },
  { iso: "US", dial: "1", nameEn: "United States", nameAr: "الولايات المتحدة", nameHe: "ארצות הברית" },
  { iso: "CA", dial: "1", nameEn: "Canada", nameAr: "كندا", nameHe: "קנדה" },
  { iso: "GB", dial: "44", nameEn: "United Kingdom", nameAr: "المملكة المتحدة", nameHe: "בריטניה" },
  { iso: "DE", dial: "49", nameEn: "Germany", nameAr: "ألمانيا", nameHe: "גרמניה" },
  { iso: "FR", dial: "33", nameEn: "France", nameAr: "فرنسا", nameHe: "צרפת" },
  { iso: "IT", dial: "39", nameEn: "Italy", nameAr: "إيطاليا", nameHe: "איטליה" },
  { iso: "ES", dial: "34", nameEn: "Spain", nameAr: "إسبانيا", nameHe: "ספרד" },
  { iso: "NL", dial: "31", nameEn: "Netherlands", nameAr: "هولندا", nameHe: "הולנד" },
  { iso: "BE", dial: "32", nameEn: "Belgium", nameAr: "بلجيكا", nameHe: "בלגיה" },
  { iso: "CH", dial: "41", nameEn: "Switzerland", nameAr: "سويسرا", nameHe: "שווייץ" },
  { iso: "AT", dial: "43", nameEn: "Austria", nameAr: "النمسا", nameHe: "אוסטריה" },
  { iso: "SE", dial: "46", nameEn: "Sweden", nameAr: "السويد", nameHe: "שוודיה" },
  { iso: "NO", dial: "47", nameEn: "Norway", nameAr: "النرويج", nameHe: "נורווגיה" },
  { iso: "DK", dial: "45", nameEn: "Denmark", nameAr: "الدنمارك", nameHe: "דנמרק" },
  { iso: "FI", dial: "358", nameEn: "Finland", nameAr: "فنلندا", nameHe: "פינלנד" },
  { iso: "IE", dial: "353", nameEn: "Ireland", nameAr: "أيرلندا", nameHe: "אירלנד" },
  { iso: "PT", dial: "351", nameEn: "Portugal", nameAr: "البرتغال", nameHe: "פורטוגל" },
  { iso: "GR", dial: "30", nameEn: "Greece", nameAr: "اليونان", nameHe: "יוון" },
  { iso: "PL", dial: "48", nameEn: "Poland", nameAr: "بولندا", nameHe: "פולין" },
  { iso: "RU", dial: "7", nameEn: "Russia", nameAr: "روسيا", nameHe: "רוסיה" },
  { iso: "UA", dial: "380", nameEn: "Ukraine", nameAr: "أوكرانيا", nameHe: "אוקראינה" },
  { iso: "CN", dial: "86", nameEn: "China", nameAr: "الصين", nameHe: "סין" },
  { iso: "IN", dial: "91", nameEn: "India", nameAr: "الهند", nameHe: "הודו" },
  { iso: "PK", dial: "92", nameEn: "Pakistan", nameAr: "باكستان", nameHe: "פקיסטן" },
  { iso: "BD", dial: "880", nameEn: "Bangladesh", nameAr: "بنغلاديش", nameHe: "בנגלדש" },
  { iso: "ID", dial: "62", nameEn: "Indonesia", nameAr: "إندونيسيا", nameHe: "אינדונזיה" },
  { iso: "MY", dial: "60", nameEn: "Malaysia", nameAr: "ماليزيا", nameHe: "מלזיה" },
  { iso: "PH", dial: "63", nameEn: "Philippines", nameAr: "الفلبين", nameHe: "פיליפינים" },
  { iso: "JP", dial: "81", nameEn: "Japan", nameAr: "اليابان", nameHe: "יפן" },
  { iso: "KR", dial: "82", nameEn: "South Korea", nameAr: "كوريا الجنوبية", nameHe: "דרום קוריאה" },
  { iso: "AU", dial: "61", nameEn: "Australia", nameAr: "أستراليا", nameHe: "אוסטרליה" },
  { iso: "NZ", dial: "64", nameEn: "New Zealand", nameAr: "نيوزيلندا", nameHe: "ניו זילנד" },
  { iso: "BR", dial: "55", nameEn: "Brazil", nameAr: "البرازيل", nameHe: "ברזיל" },
  { iso: "MX", dial: "52", nameEn: "Mexico", nameAr: "المكسيك", nameHe: "מקסיקו" },
  { iso: "AR", dial: "54", nameEn: "Argentina", nameAr: "الأرجنتين", nameHe: "ארגנטינה" },
  { iso: "ZA", dial: "27", nameEn: "South Africa", nameAr: "جنوب أفريقيا", nameHe: "דרום אפריקה" },
  { iso: "NG", dial: "234", nameEn: "Nigeria", nameAr: "نيجيريا", nameHe: "ניגריה" },
  { iso: "KE", dial: "254", nameEn: "Kenya", nameAr: "كينيا", nameHe: "קניה" },
];

// Palestine — the overwhelming majority of this shop's customers, per the
// existing ar-locale phone placeholder ("+970 59 000 0000") that predates
// this file.
export const DEFAULT_COUNTRY_DIAL = "970";

export function countryName(country: CountryCode, locale: "en" | "ar" | "he"): string {
  return locale === "ar" ? country.nameAr : locale === "he" ? country.nameHe : country.nameEn;
}
