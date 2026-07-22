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
import type { CartItem, Order, OrderStatus } from "@/lib/types";

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
};

/**
 * Places an order and decrements product stock atomically. Reads every
 * product doc inside the transaction so concurrent checkouts can never push
 * stock below zero; aborts (no writes at all) if any line item can't be
 * fulfilled at the moment the transaction runs.
 */
export async function placeOrder(items: CartItem[], customer: CustomerDetails): Promise<string> {
  const orderRef = doc(collection(db, ORDERS_COLLECTION));

  await runTransaction(db, async (transaction) => {
    const productRefs = items.map((item) => doc(db, PRODUCTS_COLLECTION, item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

    productSnaps.forEach((snap, index) => {
      const item = items[index];
      if (!snap.exists()) {
        throw new InsufficientStockError(item.name.en, 0);
      }
      const stock = Number(snap.data().stock) || 0;
      if (stock < item.qty) {
        throw new InsufficientStockError(item.name.en, stock);
      }
    });

    productSnaps.forEach((snap, index) => {
      const item = items[index];
      const stock = Number(snap.data()!.stock) || 0;
      transaction.update(productRefs[index], { stock: stock - item.qty });
    });

    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    transaction.set(orderRef, {
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      customerAddress: customer.customerAddress,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name.en,
        qty: item.qty,
        price: item.price,
      })),
      total,
      status: "new" satisfies OrderStatus,
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
    items: (data.items as Order["items"]) ?? [],
    total: Number(data.total) || 0,
    status: (data.status as OrderStatus) ?? "new",
    createdAt: createdAt?.toMillis ? createdAt.toMillis() : Date.now(),
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

export { ORDERS_COLLECTION };
