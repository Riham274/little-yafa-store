"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { AgeGroup, Product, ProductInput, Section } from "@/lib/types";
import { auth, db, storage } from "@/lib/firebase/config";
import { createProduct, newProductRef, updateProduct } from "@/lib/firebase/products";
import { uploadProductImage } from "@/lib/firebase/storage";
import { useAdminLanguage } from "@/context/AdminLanguageContext";

type Props = {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductFormModal({ product, onClose, onSaved }: Props) {
  const { t, dir } = useAdminLanguage();
  const isEdit = Boolean(product);

  const SECTIONS: { value: Section; label: string }[] = [
    { value: "boys", label: t.products.sectionBoys },
    { value: "girls", label: t.products.sectionGirls },
    { value: "hospital", label: t.products.sectionHospital },
  ];
  const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
    { value: "0-3m", label: t.products.age0to3m },
    { value: "3-24m", label: t.products.age3to24m },
    { value: "2-10y", label: t.products.age2to10y },
  ];

  const [nameEn, setNameEn] = useState(product?.name.en ?? "");
  const [nameAr, setNameAr] = useState(product?.name.ar ?? "");
  const [nameHe, setNameHe] = useState(product?.name.he ?? "");
  const [descEn, setDescEn] = useState(product?.description.en ?? "");
  const [descAr, setDescAr] = useState(product?.description.ar ?? "");
  const [descHe, setDescHe] = useState(product?.description.he ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [sections, setSections] = useState<Section[]>(product?.sections ?? []);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(product?.ageGroups ?? []);
  const [sizes, setSizes] = useState<{ label: string; stock: string }[]>(
    product?.sizes.map((s) => ({ label: s.label, stock: s.stock.toString() })) ?? [{ label: "", stock: "" }]
  );
  const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hospitalOnly = sections.length === 1 && sections[0] === "hospital";

  const toggleSection = (value: Section) => {
    setSections((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]));
  };

  const toggleAgeGroup = (value: AgeGroup) => {
    setAgeGroups((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  };

  const addSizeRow = () => setSizes((prev) => [...prev, { label: "", stock: "" }]);
  const removeSizeRow = (index: number) => setSizes((prev) => prev.filter((_, i) => i !== index));
  const updateSizeRow = (index: number, patch: Partial<{ label: string; stock: string }>) =>
    setSizes((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validSizes = sizes.filter((s) => s.label.trim());
    if (!nameEn || !price || sections.length === 0 || validSizes.length === 0) {
      setError(t.products.errorRequiredFields);
      return;
    }

    setSaving(true);
    try {
      const id = product?.id ?? newProductRef().id;

      // Temporary diagnostics for storage/unauthorized — remove once resolved.
      const currentUser = auth.currentUser;
      console.log("[debug] auth.currentUser.uid:", currentUser?.uid ?? null);
      if (currentUser) {
        const adminSnap = await getDoc(doc(db, "admins", currentUser.uid));
        console.log("[debug] admins/{uid} exists:", adminSnap.exists(), "data:", adminSnap.data());
      }
      console.log("[debug] storage.app === auth.app:", storage.app === auth.app);
      console.log("[debug] storage bucket:", storage.app.options.storageBucket);
      console.log("[debug] auth app name:", auth.app.name, "storage app name:", storage.app.name);
      if (currentUser) {
        const idTokenResult = await currentUser.getIdTokenResult(true);
        console.log("[debug] fresh ID token obtained, length:", idTokenResult.token.length, "expires:", idTokenResult.expirationTime);
      }

      const uploadedUrls = await Promise.all(newFiles.map((file) => uploadProductImage(id, file)));
      const images = [...existingImages, ...uploadedUrls];

      const data: ProductInput = {
        name: { en: nameEn, ar: nameAr, he: nameHe },
        description: { en: descEn, ar: descAr, he: descHe },
        price: Number(price),
        images,
        sections,
        ageGroups: hospitalOnly ? [] : ageGroups,
        sizes: validSizes.map((s) => ({ label: s.label.trim(), stock: Math.max(0, Number(s.stock) || 0) })),
        // Visibility is managed exclusively via the eye-icon toggle on the
        // products table, not this form — pass through the existing value
        // unchanged when editing, default new products to visible.
        isVisible: product?.isVisible ?? true,
      };

      if (isEdit && product) {
        await updateProduct(product.id, data);
      } else {
        await createProduct(id, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.products.errorGeneric);
      setSaving(false);
    }
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-gutter overflow-y-auto"
    >
      <div className="bg-surface rounded-[2rem] cloud-shadow w-full max-w-2xl my-lg max-h-[90vh] overflow-y-auto p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {isEdit ? t.products.modalTitleEdit : t.products.modalTitleNew}
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
            <Field label={t.products.nameEn} value={nameEn} onChange={setNameEn} />
            <Field label={t.products.nameAr} value={nameAr} onChange={setNameAr} dir="rtl" />
            <Field label={t.products.nameHe} value={nameHe} onChange={setNameHe} dir="rtl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <TextAreaField label={t.products.descriptionEn} value={descEn} onChange={setDescEn} />
            <TextAreaField label={t.products.descriptionAr} value={descAr} onChange={setDescAr} dir="rtl" />
            <TextAreaField label={t.products.descriptionHe} value={descHe} onChange={setDescHe} dir="rtl" />
          </div>

          <Field label={t.products.price} value={price} onChange={setPrice} type="number" />

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.sizesLabel}</label>
            <div className="flex flex-col gap-2">
              {sizes.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => updateSizeRow(i, { label: e.target.value })}
                    placeholder={t.products.sizeLabelPlaceholder}
                    className="flex-1 bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.stock}
                    onChange={(e) => updateSizeRow(i, { stock: e.target.value })}
                    placeholder={t.products.sizeStockPlaceholder}
                    className="w-28 bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeSizeRow(i)}
                    disabled={sizes.length <= 1}
                    aria-label={t.products.removeSize}
                    className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSizeRow}
              className="mt-2 flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t.products.addSize}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.sections}</label>
              <div className="flex flex-col gap-1.5 bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2.5">
                {SECTIONS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sections.includes(value)}
                      onChange={() => toggleSection(value)}
                      className="w-4 h-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.ageGroups}</label>
              <div
                className={`flex flex-col gap-1.5 rounded-xl border border-outline-variant px-3 py-2.5 ${
                  hospitalOnly ? "bg-surface-container-low/50 opacity-50" : "bg-surface-container-low"
                }`}
              >
                {AGE_GROUPS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 font-body-md text-on-surface ${
                      hospitalOnly ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={hospitalOnly}
                      checked={ageGroups.includes(value)}
                      onChange={() => toggleAgeGroup(value)}
                      className="w-4 h-4 accent-primary disabled:opacity-50"
                    />
                    {label}
                  </label>
                ))}
                {hospitalOnly && (
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{t.products.ageGroupsHiddenNote}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">{t.products.images}</label>
            <div className="flex flex-wrap gap-sm mb-sm">
              {existingImages.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container-low">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-0.5 end-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
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
                    className="absolute top-0.5 end-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
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
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70"
            >
              {saving ? t.common.saving : t.products.saveProduct}
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
