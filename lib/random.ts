/** Returns up to `count` items from `items` in random order — used to keep
 * homepage/shop-all product picks fresh on every visit without persisting
 * a selection anywhere. */
export function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
