// Hand-rolled rather than Intl.RelativeTimeFormat: ICU's Arabic output uses
// "قبل" ("before") and Eastern Arabic-Indic digits (e.g. "قبل ٣ أيام"),
// neither of which matches this admin panel's established conventions —
// "منذ" phrasing and plain Western digits everywhere else in the app.
// Admin-only (AdminLocale is "en" | "ar" — the admin panel doesn't support
// Hebrew), used by the Pending Carts page's "last updated" column.

type ArabicCountForms = { one: string; two: string; few: string; many: string };

function arabicCount(count: number, forms: ArabicCountForms): string {
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  if (count >= 3 && count <= 10) return `${count} ${forms.few}`;
  return `${count} ${forms.many}`;
}

const AR_UNIT_FORMS: Record<"minute" | "hour" | "day", ArabicCountForms> = {
  minute: { one: "دقيقة واحدة", two: "دقيقتين", few: "دقائق", many: "دقيقة" },
  hour: { one: "ساعة واحدة", two: "ساعتين", few: "ساعات", many: "ساعة" },
  day: { one: "يوم واحد", two: "يومين", few: "أيام", many: "يوم" },
};

export function formatRelativeTime(timestampMs: number, locale: "en" | "ar"): string {
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));

  if (diffSeconds < 60) {
    return locale === "ar" ? "منذ لحظات" : "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return locale === "ar"
      ? `منذ ${arabicCount(diffMinutes, AR_UNIT_FORMS.minute)}`
      : `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return locale === "ar"
      ? `منذ ${arabicCount(diffHours, AR_UNIT_FORMS.hour)}`
      : `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return locale === "ar"
    ? `منذ ${arabicCount(diffDays, AR_UNIT_FORMS.day)}`
    : `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
