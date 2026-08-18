"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { getProductById, getSimilarProducts, getTotalStock } from "@/lib/firebase/products";
import type { Product } from "@/lib/types";
import ImageGallery from "@/components/product/ImageGallery";
import SimilarProducts from "@/components/product/SimilarProducts";
import PriceTag from "@/components/product/PriceTag";
import ProductStatusBadge from "@/components/product/ProductStatusBadge";
import PageLoader from "@/components/ui/PageLoader";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProductById(params.id).then(async (p) => {
      if (!active) return;
      setProduct(p);
      // A single-color product is auto-selected (and its selector hidden) —
      // multi-color products start with nothing picked.
      setSelectedColorIndex(p && p.colors.length === 1 ? 0 : null);
      setSelectedSize(null);
      setLoading(false);
      if (p) {
        const sim = await getSimilarProducts(p);
        if (active) setSimilar(sim);
      }
    });
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return <PageLoader />;
  }

  if (!product) {
    return (
      <div className="max-w-container-max mx-auto px-gutter py-xl text-center">
        <p className="font-body-lg text-on-surface-variant mb-md">Product not found.</p>
        <button onClick={() => router.push("/")} className="underline" style={{ color: "#5A5F44" }}>
          Go home
        </button>
      </div>
    );
  }

  const totalStock = getTotalStock(product);
  const outOfStock = totalStock <= 0;
  const selectedColor = selectedColorIndex !== null ? product.colors[selectedColorIndex] : null;
  const selectedSizeEntry = selectedColor?.sizes.find((s) => s.label === selectedSize) ?? null;
  const selectedSizeStock = selectedSizeEntry?.stock ?? 0;
  const canAddToCart = !outOfStock && selectedColor !== null && selectedSizeEntry !== null && selectedSizeStock > 0;
  const lowStock = canAddToCart && selectedSizeStock <= 3;
  const lowStockText =
    selectedSizeStock === 1
      ? t.product.lowStockOne
      : selectedSizeStock === 2
        ? t.product.lowStockTwo
        : t.product.lowStockMany.replace("{count}", String(selectedSizeStock));

  const handleSelectColor = (index: number) => {
    setSelectedColorIndex(index);
    setSelectedSize(null);
    setQty(1);
  };

  const handleSelectSize = (label: string) => {
    setSelectedSize(label);
    setQty(1);
  };

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) return;
    addItem(product, qty, selectedColor.label, selectedSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
        <div className="md:col-span-7">
          <ImageGallery
            images={selectedColor?.images ?? []}
            alt={product.name[locale]}
            badge={<ProductStatusBadge product={product} />}
          />
        </div>
        <div className="md:col-span-5">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">{product.name[locale]}</h1>
          <p className="font-body-md text-on-surface-variant mb-md">{product.description[locale]}</p>
          {product.price !== undefined && (
            <p className="font-headline-sm text-headline-sm mb-md">
              <PriceTag price={product.price} salePrice={product.salePrice} priceClassName="text-secondary" />
            </p>
          )}

          {outOfStock ? (
            <span className="inline-block px-4 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md mb-md">
              {t.product.outOfStock}
            </span>
          ) : lowStock ? (
            <p className="font-label-sm text-label-sm text-error mb-md">{lowStockText}</p>
          ) : null}

          {!outOfStock && product.colors.length > 1 && (
            <div className="mb-lg">
              <p className="font-label-md text-label-md text-on-surface-variant mb-2">{t.product.selectColor}</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color, i) => {
                  const active = selectedColorIndex === i;
                  return (
                    <button
                      key={color.label + i}
                      type="button"
                      onClick={() => handleSelectColor(i)}
                      className={`px-4 py-2 rounded-full border font-label-md text-label-md transition-all active:scale-95 ${
                        active ? "text-white" : "bg-surface border-outline-variant text-on-surface hover:border-[#5A5F44]/50"
                      }`}
                      style={active ? { backgroundColor: "#5A5F44", borderColor: "#5A5F44" } : undefined}
                    >
                      {color.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!outOfStock && selectedColor && (
            <div className="mb-lg">
              <p className="font-label-md text-label-md text-on-surface-variant mb-2">{t.product.selectSize}</p>
              <div className="flex flex-wrap gap-2">
                {selectedColor.sizes.map((size) => {
                  const sizeOut = size.stock <= 0;
                  const active = selectedSize === size.label;
                  return (
                    <button
                      key={size.label}
                      type="button"
                      onClick={() => !sizeOut && handleSelectSize(size.label)}
                      disabled={sizeOut}
                      className={`px-4 py-2 rounded-full border font-label-md text-label-md transition-all active:scale-95 ${
                        sizeOut
                          ? "opacity-40 cursor-not-allowed line-through bg-surface-container-low border-outline-variant text-on-surface-variant"
                          : active
                            ? "text-white"
                            : "bg-surface border-outline-variant text-on-surface hover:border-[#5A5F44]/50"
                      }`}
                      style={active && !sizeOut ? { backgroundColor: "#5A5F44", borderColor: "#5A5F44" } : undefined}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {canAddToCart && (
            <div className="flex items-center gap-3 bg-surface-container rounded-full px-2 py-1 w-fit mb-lg">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="font-label-md text-label-md w-8 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(selectedSizeStock, q + 1))}
                disabled={qty >= selectedSizeStock}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={outOfStock || !selectedColor || !selectedSize}
            className="w-full flex items-center justify-center gap-2 px-lg py-4 text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mb-lg"
            style={{ backgroundColor: "#5A5F44" }}
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            {added
              ? t.product.addedToCart
              : outOfStock
                ? t.product.outOfStock
                : !selectedColor
                  ? t.product.selectColor
                  : !selectedSize
                    ? t.product.selectSizeFirst
                    : t.product.addToCart}
          </button>
        </div>
      </div>

      <SimilarProducts products={similar} />
    </div>
  );
}
