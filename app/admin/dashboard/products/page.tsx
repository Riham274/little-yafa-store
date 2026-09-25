"use client";

import { useEffect, useMemo, useState } from "react";
import {
  subscribeToProducts,
  deleteProduct,
  getTotalStock,
  isProductLowStock,
  isProductOutOfStock,
  setProductVisibility,
  setProductsVisibility,
} from "@/lib/firebase/products";
import { formatPrice } from "@/lib/format";
import type { AgeGroup, Category, Product } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatCard from "@/components/admin/StatCard";
import ProductFormModal from "@/components/admin/ProductFormModal";
import { proxiedImageUrl } from "@/lib/imageProxy";

const LOW_STOCK_THRESHOLD = 10;

type StockFilter = "all" | "low" | "out";
type VisibilityFilter = "all" | "visible" | "hidden";

export default function AdminProductsPage() {
  const { t, locale } = useAdminLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState<AgeGroup | "all">("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  // Client-side only — products are already loaded for the table via
  // subscribeToProducts() above, so this never triggers a new Firestore
  // read, just narrows the same array the other filters already narrow.
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => subscribeToProducts(setProducts), []);

  const lowStock = products.filter((p) => getTotalStock(p) > 0 && getTotalStock(p) <= LOW_STOCK_THRESHOLD).length;
  const outOfStock = products.filter((p) => getTotalStock(p) <= 0).length;

  // Age groups only apply to Boys/Girls — disabled for every other category
  // filter (but left enabled for "all", same as the admin form's behavior).
  const ageFilterDisabled = categoryFilter !== "all" && categoryFilter !== "boys" && categoryFilter !== "girls";

  // Trimmed and lowercased once per render rather than per-product inside
  // the filter below.
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = categoryFilter === "all" || p.categories.includes(categoryFilter);
      const matchesAge = ageFilterDisabled || ageGroupFilter === "all" || p.ageGroups.includes(ageGroupFilter);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && isProductLowStock(p)) ||
        (stockFilter === "out" && isProductOutOfStock(p));
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && p.isVisible) ||
        (visibilityFilter === "hidden" && !p.isVisible);
      // Matches either language regardless of the admin's own UI language,
      // so a product named in Arabic is still findable by typing its
      // English name (or the reverse) — or by its internal product code,
      // for matching physical stock that only has the code on it.
      const matchesSearch =
        normalizedSearch === "" ||
        p.name.ar.toLowerCase().includes(normalizedSearch) ||
        p.name.en.toLowerCase().includes(normalizedSearch) ||
        (p.internalCode?.toLowerCase().includes(normalizedSearch) ?? false);
      return matchesCategory && matchesAge && matchesStock && matchesVisibility && matchesSearch;
    });
  }, [products, categoryFilter, ageGroupFilter, ageFilterDisabled, stockFilter, visibilityFilter, normalizedSearch]);

  const handleCategoryFilterChange = (value: Category | "all") => {
    setCategoryFilter(value);
    if (value !== "all" && value !== "boys" && value !== "girls") setAgeGroupFilter("all");
  };

  const openCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(t.products.deleteConfirm.replace("{name}", product.name.en))) return;
    await deleteProduct(product.id);
  };

  const handleToggleVisibility = async (product: Product) => {
    await setProductVisibility(product.id, !product.isVisible);
  };

  // Master toggle reflects the currently filtered rows only, so an admin
  // filtered to one category can bulk-show/hide just that category.
  const visibleFilteredCount = filteredProducts.filter((p) => p.isVisible).length;
  const bulkDisabled = filteredProducts.length === 0;
  const bulkMajorityVisible = !bulkDisabled && visibleFilteredCount / filteredProducts.length >= 0.5;

  const handleBulkToggleVisibility = async () => {
    if (bulkDisabled) return;
    const nextVisible = !bulkMajorityVisible;
    const confirmMessage = (nextVisible ? t.products.bulkShowConfirm : t.products.bulkHideConfirm).replace(
      "{count}",
      String(filteredProducts.length)
    );
    if (!window.confirm(confirmMessage)) return;
    await setProductsVisibility(
      filteredProducts.map((p) => p.id),
      nextVisible
    );
  };

  const CATEGORIES: { value: Category; label: string }[] = [
    { value: "boys", label: t.products.sectionBoys },
    { value: "girls", label: t.products.sectionGirls },
    { value: "newborn", label: t.products.sectionNewborn },
    { value: "new-in", label: t.products.sectionNewIn },
    { value: "gift-wrapping", label: t.products.sectionGiftWrapping },
    { value: "wholesale", label: t.products.sectionWholesale },
    { value: "blankets", label: t.products.sectionBlankets },
    { value: "accessories", label: t.products.sectionAccessories },
    { value: "bath", label: t.products.sectionBath },
  ];
  const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
    { value: "0-3m", label: t.products.age0to3m },
    { value: "3-24m", label: t.products.age3to24m },
    { value: "2-10y", label: t.products.age2to10y },
  ];

  // Full label lookups for the table's display columns — separate from
  // CATEGORIES above (which is only the filter dropdown's option list, and
  // deliberately omits shoes/dresses/winter there), since every category a
  // product can actually be tagged with needs a translated label here.
  const CATEGORY_LABELS: Record<Category, string> = {
    boys: t.products.sectionBoys,
    girls: t.products.sectionGirls,
    newborn: t.products.sectionNewborn,
    "new-in": t.products.sectionNewIn,
    "gift-wrapping": t.products.sectionGiftWrapping,
    wholesale: t.products.sectionWholesale,
    blankets: t.products.sectionBlankets,
    accessories: t.products.sectionAccessories,
    bath: t.products.sectionBath,
    shoes: t.products.sectionShoes,
    dresses: t.products.sectionDresses,
    winter: t.products.sectionWinter,
  };
  const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
    "0-3m": t.products.age0to3m,
    "3-24m": t.products.age3to24m,
    "2-10y": t.products.age2to10y,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg gap-md flex-wrap">
        <h1 className="font-headline-md text-headline-md text-on-surface">{t.products.title}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          {t.products.newProduct}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
        <StatCard label={t.products.statTotalProducts} value={products.length} icon="inventory_2" tone="primary" />
        <StatCard label={t.products.statLowStock} value={lowStock} icon="warning" tone="secondary" />
        <StatCard label={t.products.statOutOfStock} value={outOfStock} icon="error" tone="error" />
        <StatCard
          label={t.products.statStockValue}
          value={formatPrice(products.reduce((sum, p) => sum + (p.price ?? 0) * getTotalStock(p), 0))}
          icon="payments"
          tone="primary"
        />
      </div>

      <div className="mb-md">
        <label htmlFor="product-search" className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
          {t.products.searchProduct}
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
            search
          </span>
          <input
            id="product-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.products.searchProductPlaceholder}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant ps-10 pe-10 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              title={t.products.clearSearch}
              aria-label={t.products.clearSearch}
              className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-sm mb-md">
        <div className="flex-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.filterSection}</label>
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value as Category | "all")}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface"
          >
            <option value="all">{t.products.filterAllSections}</option>
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.filterAgeGroup}</label>
          <select
            value={ageGroupFilter}
            disabled={ageFilterDisabled}
            onChange={(e) => setAgeGroupFilter(e.target.value as AgeGroup | "all")}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">{t.products.filterAllAgeGroups}</option>
            {AGE_GROUPS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.filterStock}</label>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface"
          >
            <option value="all">{t.products.filterAllStock}</option>
            <option value="low">{t.products.filterLowStock}</option>
            <option value="out">{t.products.filterOutOfStock}</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.filterVisibility}</label>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface"
          >
            <option value="all">{t.products.filterAllVisibility}</option>
            <option value="visible">{t.products.filterVisible}</option>
            <option value="hidden">{t.products.filterHidden}</option>
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
              <th className="py-3 px-md">{t.products.tableProduct}</th>
              <th className="py-3 px-md">{t.products.tableSections}</th>
              <th className="py-3 px-md">{t.products.tableAgeGroups}</th>
              <th className="py-3 px-md text-end">{t.products.tablePrice}</th>
              <th className="py-3 px-md text-center">{t.products.tableStock}</th>
              <th className="py-3 px-md text-end">
                <div className="flex items-center justify-end gap-2">
                  <span>{t.common.actions}</span>
                  <button
                    type="button"
                    onClick={handleBulkToggleVisibility}
                    disabled={bulkDisabled}
                    title={bulkMajorityVisible ? t.products.bulkHideAll : t.products.bulkShowAll}
                    className="normal-case text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {bulkMajorityVisible ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className={`border-b border-outline-variant/50 ${!product.isVisible ? "opacity-45" : ""}`}
              >
                <td className="py-3 px-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-low overflow-hidden shrink-0">
                      {product.colors[0]?.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proxiedImageUrl(product.colors[0].images[0].url)} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-body-md text-on-surface">{product.name[locale]}</span>
                      {product.internalCode && (
                        <span className="block font-label-sm text-label-sm text-on-surface-variant">
                          {t.products.tableCode}: {product.internalCode}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-md font-body-md text-on-surface-variant">
                  {product.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}
                </td>
                <td className="py-3 px-md">
                  <div className="flex flex-wrap gap-1">
                    {product.ageGroups.map((age) => (
                      <span key={age} className="bg-primary/10 text-primary rounded-full px-3 py-1 font-label-sm text-label-sm">
                        {AGE_GROUP_LABELS[age]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-md text-end font-body-md text-secondary font-semibold">
                  {product.price !== undefined ? formatPrice(product.price) : "—"}
                </td>
                <td className="py-3 px-md text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full font-label-sm text-label-sm ${
                      getTotalStock(product) <= LOW_STOCK_THRESHOLD
                        ? "bg-error-container/20 text-error"
                        : "bg-surface-container-high text-on-background"
                    }`}
                  >
                    {getTotalStock(product)}
                  </span>
                </td>
                <td className="py-3 px-md">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleToggleVisibility(product)}
                      title={product.isVisible ? t.products.hideProduct : t.products.showProduct}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">{product.isVisible ? "visibility" : "visibility_off"}</span>
                    </button>
                    <button onClick={() => openEdit(product)} className="text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => handleDelete(product)} className="text-on-surface-variant hover:text-error transition-colors">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant font-body-md">
                  {t.products.noProductsYet}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — a wide table with many columns is unusable on a
          phone even with horizontal scroll/pinch-zoom, so this is a
          different layout entirely (not a squeezed table): key info stacked
          in one column, and every action as its own real ≥44px touch
          target in a dedicated row, never floating over text it could
          overlap. */}
      <div className="md:hidden flex flex-col gap-sm">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={`bg-surface-container-lowest rounded-2xl cloud-shadow p-md ${!product.isVisible ? "opacity-45" : ""}`}
          >
            <div className="flex gap-md">
              <div className="w-16 h-16 rounded-lg bg-surface-container-low overflow-hidden shrink-0">
                {product.colors[0]?.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxiedImageUrl(product.colors[0].images[0].url)} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-label-md text-label-md text-on-surface">{product.name[locale]}</h5>
                {product.internalCode && (
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {t.products.tableCode}: {product.internalCode}
                  </p>
                )}
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {product.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}
                  {product.ageGroups.length > 0
                    ? ` • ${product.ageGroups.map((a) => AGE_GROUP_LABELS[a]).join(", ")}`
                    : ""}
                </p>
                <p className="font-body-md text-secondary font-semibold mt-1">
                  {product.price !== undefined ? formatPrice(product.price) : "—"}
                </p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${
                    getTotalStock(product) <= LOW_STOCK_THRESHOLD ? "bg-error-container/20 text-error" : "bg-surface-container-high"
                  }`}
                >
                  {t.products.stockLabel} {getTotalStock(product)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-outline-variant/50">
              <button
                onClick={() => handleToggleVisibility(product)}
                title={product.isVisible ? t.products.hideProduct : t.products.showProduct}
                className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-primary active:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">{product.isVisible ? "visibility" : "visibility_off"}</span>
              </button>
              <button
                onClick={() => openEdit(product)}
                title={t.common.edit}
                className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-primary active:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">edit</span>
              </button>
              <button
                onClick={() => handleDelete(product)}
                title={t.common.delete}
                className="flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-error active:bg-error-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">delete</span>
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <p className="py-8 text-center text-on-surface-variant font-body-md">{t.products.noProductsYet}</p>
        )}
      </div>

      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
