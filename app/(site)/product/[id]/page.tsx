"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { getProductById, getSimilarProducts } from "@/lib/firebase/products";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import ImageGallery from "@/components/product/ImageGallery";
import SimilarProducts from "@/components/product/SimilarProducts";

const SECTIONS = ["description", "care", "shippingReturns"] as const;

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [openSection, setOpenSection] = useState<(typeof SECTIONS)[number] | null>("description");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProductById(params.id).then(async (p) => {
      if (!active) return;
      setProduct(p);
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
    return <div className="max-w-container-max mx-auto px-gutter py-xl text-center text-on-surface-variant">…</div>;
  }

  if (!product) {
    return (
      <div className="max-w-container-max mx-auto px-gutter py-xl text-center">
        <p className="font-body-lg text-on-surface-variant mb-md">Product not found.</p>
        <button onClick={() => router.push("/")} className="text-primary underline">
          Go home
        </button>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-container-max mx-auto px-gutter pb-xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
        <div className="md:col-span-7">
          <ImageGallery images={product.images} alt={product.name[locale]} />
        </div>
        <div className="md:col-span-5">
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-2">{product.category}</p>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">{product.name[locale]}</h1>
          <p className="font-headline-sm text-headline-sm text-secondary mb-md">{formatPrice(product.price)}</p>

          {outOfStock ? (
            <span className="inline-block px-4 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md mb-md">
              {t.product.outOfStock}
            </span>
          ) : (
            <p className="font-label-sm text-label-sm text-primary mb-md">
              {product.stock} {t.product.inStock}
            </p>
          )}

          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">{product.description[locale]}</p>

          {!outOfStock && (
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
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                disabled={qty >= product.stock}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="w-full flex items-center justify-center gap-2 px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mb-lg"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            {added ? t.product.addedToCart : outOfStock ? t.product.outOfStock : t.product.addToCart}
          </button>

          <div className="border-t gold-border">
            {SECTIONS.map((key) => (
              <div key={key} className="border-b border-outline-variant">
                <button
                  onClick={() => setOpenSection(openSection === key ? null : key)}
                  className="w-full flex items-center justify-between py-4 font-label-md text-label-md text-on-surface"
                >
                  {t.product[key]}
                  <span className="material-symbols-outlined">
                    {openSection === key ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {openSection === key && key === "description" && (
                  <p className="pb-4 font-body-md text-on-surface-variant">{product.description[locale]}</p>
                )}
                {openSection === key && key === "care" && (
                  <p className="pb-4 font-body-md text-on-surface-variant">
                    Machine wash cold with like colors. Tumble dry low. Do not bleach.
                  </p>
                )}
                {openSection === key && key === "shippingReturns" && (
                  <p className="pb-4 font-body-md text-on-surface-variant">
                    Free shipping on orders over ₪200. 14-day hassle-free returns & exchanges.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SimilarProducts products={similar} />
    </div>
  );
}
