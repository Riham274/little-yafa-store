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
  | "bath";

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
export type ProductColor = {
  label: string;
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
  colors: ProductColor[];
  categories: Category[];
  newbornGender?: NewbornGender;
  ageGroups: AgeGroup[];
  isVisible: boolean;
};

export type ProductInput = Omit<Product, "id">;

export type OrderStatus = "new" | "processing" | "delivered";

export type ShippingRegion = "westBank" | "jerusalem" | "inside";

export type OrderItem = {
  productId: string;
  name: string;
  color: string;
  size: string;
  qty: number;
  price: number;
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
};

export type CartItem = {
  productId: string;
  name: LocalizedText;
  // Optional to carry a priceless wholesale product through the cart — kept
  // undefined rather than defaulted to 0 so display code can hide it.
  price?: number;
  image: string | null;
  color: string;
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
