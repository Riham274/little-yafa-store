export type Locale = "en" | "ar" | "he";

export type LocalizedText = {
  en: string;
  ar: string;
  he: string;
};

export type Section = "boys" | "girls" | "hospital";

export type AgeGroup = "0-12m" | "1-3y" | "4-6y" | "7-12y";

export type Product = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  images: string[];
  section: Section;
  ageGroup: AgeGroup | null;
  category: string;
  tags: string[];
  stock: number;
};

export type ProductInput = Omit<Product, "id">;

export type OrderStatus = "new" | "processing" | "delivered";

export type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
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
  qty: number;
  stock: number;
};
