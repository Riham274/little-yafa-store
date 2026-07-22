"use client";

import { useEffect, useState } from "react";
import { subscribeToProducts, deleteProduct } from "@/lib/firebase/products";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import StatCard from "@/components/admin/StatCard";
import ProductFormModal from "@/components/admin/ProductFormModal";

const LOW_STOCK_THRESHOLD = 10;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => subscribeToProducts(setProducts), []);

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;

  const openCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name.en}"? This cannot be undone.`)) return;
    await deleteProduct(product.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg gap-md flex-wrap">
        <h1 className="font-headline-md text-headline-md text-on-surface">Products</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          New Product
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
        <StatCard label="Total Products" value={products.length} icon="inventory_2" tone="primary" />
        <StatCard label="Low Stock" value={lowStock} icon="warning" tone="secondary" />
        <StatCard label="Out of Stock" value={outOfStock} icon="error" tone="error" />
        <StatCard
          label="Total Stock Value"
          value={formatPrice(products.reduce((sum, p) => sum + p.price * p.stock, 0))}
          icon="payments"
          tone="primary"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
              <th className="py-3 px-md">Product</th>
              <th className="py-3 px-md">Section</th>
              <th className="py-3 px-md">Age Group</th>
              <th className="py-3 px-md text-right">Price</th>
              <th className="py-3 px-md text-center">Stock</th>
              <th className="py-3 px-md text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-outline-variant/50">
                <td className="py-3 px-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-low overflow-hidden shrink-0">
                      {product.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="font-body-md text-on-surface">{product.name.en}</span>
                  </div>
                </td>
                <td className="py-3 px-md font-body-md text-on-surface-variant capitalize">{product.section}</td>
                <td className="py-3 px-md">
                  {product.ageGroup && (
                    <span className="bg-primary/10 text-primary rounded-full px-3 py-1 font-label-sm text-label-sm">
                      {product.ageGroup}
                    </span>
                  )}
                </td>
                <td className="py-3 px-md text-right font-body-md text-secondary font-semibold">{formatPrice(product.price)}</td>
                <td className="py-3 px-md text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full font-label-sm text-label-sm ${
                      product.stock <= LOW_STOCK_THRESHOLD
                        ? "bg-error-container/20 text-error"
                        : "bg-surface-container-high text-on-background"
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="py-3 px-md">
                  <div className="flex justify-end gap-2">
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
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant font-body-md">
                  No products yet — click &ldquo;New Product&rdquo; to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-sm">
        {products.map((product) => (
          <div key={product.id} className="relative bg-surface-container-lowest rounded-2xl cloud-shadow p-md flex gap-md">
            <div className="w-16 h-16 rounded-lg bg-surface-container-low overflow-hidden shrink-0">
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-label-md text-label-md text-on-surface truncate">{product.name.en}</h5>
              <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                {product.section} {product.ageGroup ? `• ${product.ageGroup}` : ""}
              </p>
              <p className="font-body-md text-secondary font-semibold mt-1">{formatPrice(product.price)}</p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${
                  product.stock <= LOW_STOCK_THRESHOLD ? "bg-error-container/20 text-error" : "bg-surface-container-high"
                }`}
              >
                Stock: {product.stock}
              </span>
            </div>
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => openEdit(product)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button onClick={() => handleDelete(product)} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>
        ))}
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
