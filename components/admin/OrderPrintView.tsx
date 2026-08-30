import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { resolveColorLabel } from "./OrderDetailDrawer";

type ProductLookup = Record<string, Product | null | undefined>;

const REGION_KEYS = {
  westBank: "regionWestBank",
  jerusalem: "regionJerusalem",
  inside: "regionInside",
  pickup: "regionPickup",
} as const;

/**
 * Rendered off-screen at all times (`hidden print:block` — see the parent
 * drawer) and only ever shown by the browser's print pipeline, via the
 * `.print-area` visibility rule in globals.css that hides everything else
 * on the page for @media print. Kept as plain black-on-white markup rather
 * than the app's usual olive/beige theme tokens, per the printed-order spec.
 */
export default function OrderPrintView({
  order,
  status,
  productsById,
}: {
  order: Order;
  status: OrderStatus;
  productsById: ProductLookup;
}) {
  const { t, locale } = useAdminLanguage();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const subtotal = order.total - order.shippingCost;
  const statusLabel =
    status === "new" ? t.orders.statusNew : status === "processing" ? t.orders.statusProcessing : t.orders.statusDelivered;
  const regionLabel = order.shippingRegion ? t.orders[REGION_KEYS[order.shippingRegion]] : null;

  return (
    <div dir={dir} className="print-area hidden print:block text-black bg-white p-8">
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-header.png" alt="Little Yafa" className="h-12 w-auto" />
        <div className="text-end">
          <p className="text-lg font-bold">
            {t.orders.printOrderTitle} #{order.id.slice(0, 6).toUpperCase()}
          </p>
          <p className="text-sm">
            {t.orders.printDate}: {new Date(order.createdAt).toLocaleString()}
          </p>
          <p className="text-sm">
            {t.orders.printStatus}: {statusLabel}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-1">{t.orders.customer}</h2>
        <p>{order.customerName}</p>
        <p>{order.customerPhone}</p>
        <p>{order.customerAddress}</p>
        {regionLabel && (
          <p className="mt-1">
            {t.orders.deliveryRegion}: {regionLabel} —{" "}
            {order.shippingCost === 0 ? t.orders.shippingFree : formatPrice(order.shippingCost)}
          </p>
        )}
        {order.shippingRegion === "pickup" && <p className="text-sm">{t.orders.pickupAddress}</p>}
        {order.customerNotes && (
          <p className="mt-1">
            {t.orders.printNotes}: {order.customerNotes}
          </p>
        )}
      </div>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-black text-start">
            <th className="py-2 text-start">{t.orders.printItemsHeaderProduct}</th>
            <th className="py-2 text-start">{t.orders.printItemsHeaderColor}</th>
            <th className="py-2 text-start">{t.orders.printItemsHeaderSize}</th>
            <th className="py-2 text-end">{t.orders.printItemsHeaderQty}</th>
            <th className="py-2 text-end">{t.orders.printItemsHeaderPrice}</th>
            <th className="py-2 text-end">{t.orders.printItemsHeaderSubtotal}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i} className="border-b border-black/30">
              <td className="py-2">{item.name}</td>
              <td className="py-2">{resolveColorLabel(productsById[item.productId], item.color, locale)}</td>
              <td className="py-2">{item.size}</td>
              <td className="py-2 text-end">{item.qty}</td>
              <td className="py-2 text-end">{formatPrice(item.price)}</td>
              <td className="py-2 text-end">{formatPrice(item.price * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col items-end gap-1">
        <p>
          {t.orders.subtotal}: {formatPrice(subtotal)}
        </p>
        <p>
          {t.orders.shipping}: {order.shippingCost === 0 ? t.orders.shippingFree : formatPrice(order.shippingCost)}
        </p>
        <p className="text-lg font-bold">
          {t.orders.total}: {formatPrice(order.total)}
        </p>
      </div>
    </div>
  );
}
