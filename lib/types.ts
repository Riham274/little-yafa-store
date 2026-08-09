export type Locale = "en" | "ar" | "he";

export type LocalizedText = {
  en: string;
  ar: string;
  he: string;
};

export type Section = "boys" | "girls" | "hospital";

export type AgeGroup = "0-3m" | "3-24m" | "2-10y";

export type ProductSize = {
  label: string;
  stock: number;
};

export type Product = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  images: string[];
  sections: Section[];
  ageGroups: AgeGroup[];
  sizes: ProductSize[];
  isVisible: boolean;
};

export type ProductInput = Omit<Product, "id">;

export type OrderStatus = "new" | "processing" | "delivered";

export type ShippingRegion = "westBank" | "jerusalem" | "inside";

export type OrderItem = {
  productId: string;
  name: string;
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
  price: number;
  image: string | null;
  size: string;
  qty: number;
  stock: number;
};
