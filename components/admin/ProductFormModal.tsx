"use client";

import { useState } from "react";
import type { AgeGroup, Product, ProductInput, Section } from "@/lib/types";
import { createProduct, newProductRef, updateProduct } from "@/lib/firebase/products";
import { uploadProductImage } from "@/lib/firebase/storage";

const AGE_GROUPS: AgeGroup[] = ["0-12m", "1-3y", "4-6y", "7-12y"];

type Props = {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductFormModal({ product, onClose, onSaved }: Props) {
  const isEdit = Boolean(product);

  const [nameEn, setNameEn] = useState(product?.name.en ?? "");
  const [nameAr, setNameAr] = useState(product?.name.ar ?? "");
  const [nameHe, setNameHe] = useState(product?.name.he ?? "");
  const [descEn, setDescEn] = useState(product?.description.en ?? "");
  const [descAr, setDescAr] = useState(product?.description.ar ?? "");
  const [descHe, setDescHe] = useState(product?.description.he ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [section, setSection] = useState<Section>(product?.section ?? "girls");
  const [ageGroup, setAgeGroup] = useState<AgeGroup | "">(product?.ageGroup ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "");
  const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nameEn || !price || !category || !stock) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const id = product?.id ?? newProductRef().id;
      const uploadedUrls = await Promise.all(newFiles.map((file) => uploadProductImage(id, file)));
      const images = [...existingImages, ...uploadedUrls];

      const data: ProductInput = {
        name: { en: nameEn, ar: nameAr, he: nameHe },
        description: { en: descEn, ar: descAr, he: descHe },
        price: Number(price),
        images,
        section,
        ageGroup: section === "hospital" ? null : (ageGroup || null),
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        stock: Number(stock),
      };

      if (isEdit && product) {
        await updateProduct(product.id, data);
      } else {
        await createProduct(id, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-gutter overflow-y-auto">
      <div className="bg-surface rounded-[2rem] cloud-shadow w-full max-w-2xl my-lg max-h-[90vh] overflow-y-auto p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {isEdit ? "Edit Product" : "New Product"}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <Field label="Name (English) *" value={nameEn} onChange={setNameEn} />
            <Field label="Name (Arabic)" value={nameAr} onChange={setNameAr} dir="rtl" />
            <Field label="Name (Hebrew)" value={nameHe} onChange={setNameHe} dir="rtl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <TextAreaField label="Description (English)" value={descEn} onChange={setDescEn} />
            <TextAreaField label="Description (Arabic)" value={descAr} onChange={setDescAr} dir="rtl" />
            <TextAreaField label="Description (Hebrew)" value={descHe} onChange={setDescHe} dir="rtl" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
            <Field label="Price (₪) *" value={price} onChange={setPrice} type="number" />
            <Field label="Stock *" value={stock} onChange={setStock} type="number" />
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Section *</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as Section)}
                className="w-full bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface"
              >
                <option value="girls">Girls</option>
                <option value="boys">Boys</option>
                <option value="hospital">Hospital Bag</option>
              </select>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Age Group</label>
              <select
                value={ageGroup}
                disabled={section === "hospital"}
                onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                className="w-full bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface disabled:opacity-50"
              >
                <option value="">—</option>
                {AGE_GROUPS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            <Field label="Category *" value={category} onChange={setCategory} placeholder="e.g. blouses, pants" />
            <Field label="Tags (comma-separated)" value={tags} onChange={setTags} placeholder="e.g. organic, bestseller" />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">Images</label>
            <div className="flex flex-wrap gap-sm mb-sm">
              {existingImages.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container-low">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              {newFiles.map((file, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container-low">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              className="text-on-surface-variant font-body-md text-[14px]"
            />
          </div>

          <div className="flex justify-end gap-sm mt-md">
            <button
              type="button"
              onClick={onClose}
              className="px-lg py-3 rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  dir,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: "rtl" | "ltr";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{label}</label>
      <input
        type={type}
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{label}</label>
      <textarea
        value={value}
        dir={dir}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
      />
    </div>
  );
}
