import type { ShippingRegion } from "./types";

export const SHIPPING_RATES: Record<ShippingRegion, number> = {
  westBank: 20,
  jerusalem: 30,
  inside: 70,
  pickup: 3,
};
