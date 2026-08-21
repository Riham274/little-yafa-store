export type Locale = "en" | "ar" | "he";

export type LocalizedText = {
  en: string;
  ar: string;
  he: string;
};

// A product can belong to any combination of these at once (e.g. both
// "girls" and "gift-wrapping"). "newborn" replaces the old "hospital" value
// — see the migration in toProduct() for docs still holding the old value.
// "wholesale" replaces the old "towels" value — no migration for that one:
// any product still tagged "towels" simply stops matching any category.
export type Category =
  | "boys"
  | "girls"
  | "newborn"
  | "new-in"
  | "gift-wrapping"
  | "wholesale"
  | "blankets"
  | "accessories"
  | "bath"
  | "shoes"
  | "dresses"
  | "winter";

export type AgeGroup = "0-3m" | "3-24m" | "2-10y";

// Independent from the main "boys"/"girls" category values — only meaningful
// on products tagged with the "newborn" category, and never used to decide
// whether a product appears on the main Boys/Girls pages.
export type NewbornGender = "boys" | "girls" | "unisex";

export type ProductSize = {
  label: string;
  stock: number;
};

// Each color variant carries its own images and size/stock tracking — price
// is deliberately NOT here, it stays a single top-level field shared across
// every color of a product.
//
// `label` is multi-language like name/description, but it doubles as a
// matching key (cart dedup, Firestore stock decrement, order records) —
// everywhere that identity matters uses `label.ar` specifically (the
// required/primary field, same convention as name/description), never the
// whole object, so switching site language never changes which color/size
// combination is being referenced.
export type ProductColor = {
  label: LocalizedText;
  images: string[];
  sizes: ProductSize[];
};

export type Product = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  // Optional so wholesale ("الجملة") items can be listed without a price —
  // display code must hide the price entirely rather than showing ₪0.
  price?: number;
  // A product is "on sale" when this is set and lower than `price` — see
  // isProductOnSale() in lib/sale.ts. Not a separate category: the Sale page
  // and card derive membership from this field rather than a manual tag.
  salePrice?: number;
  // What the admin paid to source the product — admin-only, never shown to
  // customers. Undefined/0 both mean "not set" for profit-calculation
  // purposes (see lib/finance.ts), not "sourced for free".
  costPrice?: number;
  colors: ProductColor[];
  categories: Category[];
  newbornGender?: NewbornGender;
  ageGroups: AgeGroup[];
  isVisible: boolean;
  // Server-set at creation time (see createProduct()) — powers the "New"
  // badge, not editable through the admin form. Defaults to 0 (epoch) for
  // any doc that predates this field, so old products never show as new.
  createdAt: number;
};

export type ProductInput = Omit<Product, "id" | "createdAt">;

export type OrderStatus = "new" | "processing" | "delivered";

export type ShippingRegion = "westBank" | "jerusalem" | "inside";

export type OrderItem = {
  productId: string;
  name: string;
  color: string;
  size: string;
  qty: number;
  // Amount actually charged per unit (the sale price when the item was
  // bought on sale, otherwise the regular price).
  price: number;
  // Regular price, present only if this item was bought on sale — kept so
  // order records can still show the discount after the fact.
  originalPrice?: number;
};

export type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes: string;
  shippingRegion: ShippingRegion | null;
  shippingCost: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  // Purely an admin-side organizational flag for the Orders list — archived
  // orders are hidden from the default view but never excluded from
  // anything else (Finance's historical sales/profit figures must always
  // include every order regardless of this field). Missing on any doc
  // predating this field, which is treated as false (not archived).
  archived: boolean;
};

export type CartItem = {
  productId: string;
  name: LocalizedText;
  // Optional to carry a priceless wholesale product through the cart — kept
  // undefined rather than defaulted to 0 so display code can hide it.
  // Amount actually charged per unit (the sale price if the product was on
  // sale when added, otherwise the regular price) — used directly in
  // subtotal/total math elsewhere so those calculations stay untouched.
  price?: number;
  // Regular price, present only if this item was on sale when added to the
  // cart — used purely for the strikethrough display, never in totals.
  originalPrice?: number;
  image: string | null;
  // Canonical identifier — always the color's Arabic label, used to match
  // against product.colors and for Firestore stock decrements. Never shown
  // to the customer directly; see colorLabel for that.
  color: string;
  // Multi-language snapshot for display, mirroring `name` above. Optional
  // so carts saved to localStorage before this field existed still parse —
  // display code falls back to the raw `color` string for those.
  colorLabel?: LocalizedText;
  size: string;
  qty: number;
  stock: number;
};

export type ContactMessageStatus = "new" | "read";

export type ContactMessage = {
  id: string;
  name: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: number;
};
