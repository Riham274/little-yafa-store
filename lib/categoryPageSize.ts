// Kept in its own plain module (no "use client") rather than exported from
// CategoryPageContent.tsx — a Server Component importing a named constant
// from a "use client" file isn't reliable (only the default/component
// export is guaranteed to resolve correctly across that boundary); the
// Shoes page's Server Component (app/(site)/shoes/page.tsx) needs this same
// value to fetch its first page server-side.
export const CATEGORY_PAGE_SIZE = 24;
