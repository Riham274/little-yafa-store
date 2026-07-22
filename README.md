# Little Yafa — Baby Boutique E-Commerce

Real Next.js + Firebase e-commerce app built on top of the Little Yafa Stitch
design export (see `../stitch_little_yafa_boutique_e_commerce`). Firestore for
data, Firebase Authentication for the admin panel, Firebase Storage for
product images. Supports English, Arabic, and Hebrew with full RTL/LTR
switching.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Firebase config**

   Copy `.env.local.example` to `.env.local` and fill in the six
   `NEXT_PUBLIC_FIREBASE_*` values from Firebase Console → Project Settings →
   General → "Your apps" → your Web app's SDK config. If no Web app exists
   yet in the project, create one there first (registering a web client does
   not affect the existing Firestore/Auth/Storage setup or the existing admin
   account).

   ```bash
   cp .env.local.example .env.local
   ```

3. **Deploy security rules** (from the Firebase CLI, or paste into the
   Console's Rules editors)

   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

   `firestore.rules` and `storage.rules` are at the project root.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   App runs at http://localhost:3000.

## Adding your first products

There's no seed script — add products through the admin panel:

1. Go to `/admin/login` and sign in with the existing admin account.
2. Go to `/admin/dashboard/products` → "New Product" and fill in the form
   (name/description in EN/AR/HE, price, section, age group, category, tags,
   stock, images).

Admin routes (`/admin/login`, `/admin/dashboard/*`) are intentionally not
linked from any public page — reachable only by typing the URL.

## Project structure

- `app/(site)/` — public storefront pages, wrapped in the shared header/
  footer/mobile-nav shell (`app/(site)/layout.tsx`).
- `app/admin/` — admin login (no shell) + dashboard (own `AdminShell`,
  guarded by `app/admin/dashboard/layout.tsx`).
- `components/` — `layout/`, `product/`, `cart/`, `checkout/`, `admin/`.
- `context/` — `CartContext` (localStorage-persisted cart) and
  `LanguageContext` (locale + RTL/LTR, localStorage-persisted).
- `lib/firebase/` — `config.ts`, `products.ts`, `orders.ts`, `auth.ts`,
  `storage.ts`. `orders.ts` has the stock-safe `placeOrder` transaction.
- `lib/i18n/dictionaries.ts` — EN/AR/HE UI strings.
- `firestore.rules`, `storage.rules` — security rules matching the spec
  (public product reads, public order creation, admin-only everything else).

## Notes / known simplifications

- Data fetching is client-side (Firestore Web SDK in Client Components) —
  no Admin SDK/service account is used or required.
- The order confirmation page reads the just-placed order from
  `sessionStorage` (set at checkout time) rather than re-fetching it from
  Firestore, since orders are admin-read-only per the security rules —
  refreshing that page directly (without having just checked out) shows a
  generic thank-you without order details.
- The Contact page is visual only (client-side validation, no Firestore
  write) — not part of the original spec's data model.
