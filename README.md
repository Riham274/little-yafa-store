# Little Yafa — Baby & Kids Store

A modern, multilingual e-commerce platform for a boutique baby and kids 
clothing brand based in Palestine. Built with Next.js and Firebase, with 
full Arabic/English/Hebrew support and RTL/LTR layout switching.

**Live site:** [littleyafa.com](https://www.littleyafa.com)

## Overview

Little Yafa is a full-stack storefront + admin system for a real, operating 
retail business. It handles the complete customer journey — browsing by 
category and age group, product discovery, cart, and checkout — alongside 
an internal admin dashboard for inventory and order management, all backed 
by real-time Firestore data with transaction-safe stock control.

## Features

**Storefront**
- Multilingual UI (Arabic, English, Hebrew) with automatic RTL/LTR layout 
  mirroring
- Category browsing (Boys, Girls, Hospital Bag) with age-group filtering 
  (0–12m, 1–3y, 4–6y, 7–12y)
- Product detail pages with image galleries and related/similar product 
  recommendations (matched by category and tags)
- Cart and a lightweight checkout flow (name, phone, delivery address — no 
  account required)
- Paginated product listings with scroll-position and list-state 
  preservation across navigation
- Fully responsive, mobile-first design

**Admin dashboard**
- Firebase Authentication–gated admin access (role-based, checked against 
  Firestore)
- Full product CRUD with image upload to Firebase Storage
- Real-time order management with status tracking (new / processing / 
  delivered)
- Stock-safe order processing via Firestore transactions, preventing 
  overselling under concurrent orders

## Tech stack

| Layer          | Technology                                 |
|----------------|---------------------------------------------|
| Framework      | Next.js (App Router)                        |
| Database       | Firebase Firestore                          |
| Auth           | Firebase Authentication                     |
| Storage        | Firebase Storage                            |
| Styling        | Tailwind CSS                                |
| Language       | TypeScript                                  |
| i18n           | Custom Arabic / English / Hebrew, RTL-aware |

## Data model (Firestore)

```
products/{productId}
  name, description        // multilingual: { ar, en, he }
  price, images[], stock
  section: "boys" | "girls" | "hospital"
  ageGroup: "0-12m" | "1-3y" | "4-6y" | "7-12y" | null
  category, tags[]

orders/{orderId}
  customerName, customerPhone, customerAddress
  items[], total, status, createdAt

admins/{uid}
  role: "admin"
```

## Getting started

```bash
# install dependencies
npm install

# set up environment variables
cp .env.local.example .env.local
# fill in your Firebase project config

# run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the storefront.

## Firestore security

Security rules enforce:
- Public read access to `products`
- Write access to `products` restricted to authenticated admins
- Public create access to `orders` (placing an order), with read/update 
  restricted to admins

See `firestore.rules` for the full rule set.

## Project structure

```
app/(site)/        # customer-facing storefront pages
app/admin/          # admin dashboard (not linked in public navigation)
components/         # shared UI components
lib/                # Firebase config, hooks, data helpers
```

## License

Proprietary — All rights reserved. This is a commercial project built for a 
real, operating retail business (Little Yafa). The code is not licensed for 
reuse, redistribution, or commercial use by third parties.
