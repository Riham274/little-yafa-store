import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { deriveProductColors } from "./products";
import type { CartItem, Order, OrderStatus, ProductColor, ShippingRegion } from "@/lib/types";

const ORDERS_COLLECTION = "orders";
const PRODUCTS_COLLECTION = "products";

export class InsufficientStockError extends Error {
  productName: string;
  available: number;

  constructor(productName: string, available: number) {
    super(`Insufficient stock for ${productName}`);
    this.name = "InsufficientStockError";
    this.productName = productName;
    this.available = available;
  }
}

export type CustomerDetails = {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes: string;
  shippingRegion: ShippingRegion;
  shippingCost: number;
};

/**
 * Places an order and decrements the ordered color+size's stock atomically.
 * Reads every product doc inside the transaction so concurrent checkouts can
 * never push stock below zero; aborts (no writes at all) if any line item
 * can't be fulfilled at the moment the transaction runs. Each product's
 * `colors` array is rewritten in full (Firestore has no per-element array
 * update), with only the ordered color's matching size `stock` entry
 * decremented — every other color/size is carried over unchanged.
 */
export async function placeOrder(items: CartItem[], customer: CustomerDetails): Promise<string> {
  const orderRef = doc(collection(db, ORDERS_COLLECTION));

  await runTransaction(db, async (transaction) => {
    // De-duplicated by product, not by line item — the same product can
    // appear twice in the cart with two different color/size combos, and
    // both decrements must land on one consolidated `colors` array before a
    // single `update()` per product is issued (Firestore has no
    // per-element array update, and two separate `update()` calls on the
    // same doc within one transaction would just overwrite each other).
    const productIds = [...new Set(items.map((item) => item.productId))];
    const productRefs = productIds.map((id) => doc(db, PRODUCTS_COLLECTION, id));
    const productSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

    const colorsByProductId = new Map<string, ProductColor[]>();
    productSnaps.forEach((snap, index) => {
      if (!snap.exists()) return;
      // deriveProductColors() applies the same migration fallback as
      // toProduct() — an unmigrated doc (still on flat images/sizes) can
      // still be successfully ordered, decrementing its synthesized
      // "افتراضي" color and writing it back in the new `colors` shape.
      const rawColors = deriveProductColors(snap.data());
      const colors = rawColors.map((c) => ({ ...c, sizes: c.sizes.map((s) => ({ ...s })) }));
      colorsByProductId.set(productIds[index], colors);
    });

    for (const item of items) {
      const colors = colorsByProductId.get(item.productId);
      if (!colors) {
        throw new InsufficientStockError(item.name.en, 0);
      }
      // item.color is always the color's Arabic label — the stable
      // matching key regardless of which language the customer's site was
      // in when they added it to their cart (see CartItem.color).
      const color = colors.find((c) => c.label.ar === item.color);
      if (!color) {
        throw new InsufficientStockError(item.name.en, 0);
      }
      const sizeIndex = color.sizes.findIndex((s) => s.label === item.size);
      if (sizeIndex === -1) {
        throw new InsufficientStockError(item.name.en, 0);
      }
      const available = Number(color.sizes[sizeIndex].stock) || 0;
      if (available < item.qty) {
        throw new InsufficientStockError(item.name.en, available);
      }
      color.sizes[sizeIndex] = { ...color.sizes[sizeIndex], stock: available - item.qty };
    }

    productRefs.forEach((ref, index) => {
      const colors = colorsByProductId.get(productIds[index]);
      if (colors) transaction.update(ref, { colors });
    });

    // A wholesale item with no price set contributes ₪0 to the order total
    // — Firestore rejects `undefined` field values, and the order record
    // needs a concrete number regardless (unlike storefront display, which
    // hides the price entirely for these items).
    const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0);
    const total = subtotal + customer.shippingCost;

    transaction.set(orderRef, {
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      customerAddress: customer.customerAddress,
      customerNotes: customer.customerNotes,
      shippingRegion: customer.shippingRegion,
      shippingCost: customer.shippingCost,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name.en,
        color: item.color,
        size: item.size,
        qty: item.qty,
        price: item.price ?? 0,
        // Firestore rejects `undefined` field values, so this is only
        // included when the item was actually bought on sale.
        ...(item.originalPrice !== undefined ? { originalPrice: item.originalPrice } : {}),
      })),
      total,
      status: "new" satisfies OrderStatus,
      archived: false,
      createdAt: serverTimestamp(),
    });
  });

  return orderRef.id;
}

function toOrder(id: string, data: Record<string, unknown>): Order {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
  return {
    id,
    customerName: (data.customerName as string) ?? "",
    customerPhone: (data.customerPhone as string) ?? "",
    customerAddress: (data.customerAddress as string) ?? "",
    customerNotes: (data.customerNotes as string) ?? "",
    shippingRegion: (data.shippingRegion as Order["shippingRegion"]) ?? null,
    shippingCost: Number(data.shippingCost) || 0,
    items: (data.items as Order["items"]) ?? [],
    total: Number(data.total) || 0,
    status: (data.status as OrderStatus) ?? "new",
    createdAt: createdAt?.toMillis ? createdAt.toMillis() : Date.now(),
    archived: data.archived === true,
  };
}

export function subscribeToOrders(callback: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toOrder(d.id, d.data())));
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), { status });
}

/** Hides an order from the default Orders list without deleting it — order
 * data (and therefore Finance's historical figures) is untouched. */
export async function archiveOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), { archived: true });
}

export async function unarchiveOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), { archived: false });
}

export { ORDERS_COLLECTION };
