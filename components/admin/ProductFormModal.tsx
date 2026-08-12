"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { AgeGroup, Category, NewbornGender, Product, ProductInput } from "@/lib/types";
import { auth, db, storage } from "@/lib/firebase/config";
import { clearProductPrice, createProduct, newProductRef, updateProduct } from "@/lib/firebase/products";
import { uploadProductImage } from "@/lib/firebase/storage";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import Spinner from "@/components/ui/Spinner";

const TRANSLATE_DEBOUNCE_MS = 800;
type TranslateTarget = "en" | "he";

async function translateTexts(texts: string[], target: TranslateTarget): Promise<string[]> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, target }),
  });
  if (!res.ok) throw new Error("Translation request failed");
  const data: { translations?: string[] } = await res.json();
  if (!data.translations) throw new Error("Translation request failed");
  return data.translations;
}

type Props = {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductFormModal({ product, onClose, onSaved }: Props) {
  const { t, dir } = useAdminLanguage();
  const isEdit = Boolean(product);

  const CATEGORIES: { value: Category; label: string }[] = [
    { value: "boys", label: t.products.sectionBoys },
    { value: "girls", label: t.products.sectionGirls },
    { value: "newborn", label: t.products.sectionNewborn },
    { value: "new-in", label: t.products.sectionNewIn },
    { value: "bath", label: t.products.sectionBath },
    { value: "blankets", label: t.products.sectionBlankets },
    { value: "accessories", label: t.products.sectionAccessories },
    { value: "gift-wrapping", label: t.products.sectionGiftWrapping },
    { value: "wholesale", label: t.products.sectionWholesale },
  ];
  const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
    { value: "0-3m", label: t.products.age0to3m },
    { value: "3-24m", label: t.products.age3to24m },
    { value: "2-10y", label: t.products.age2to10y },
  ];
  const NEWBORN_GENDERS: { value: NewbornGender; label: string }[] = [
    { value: "boys", label: t.products.newbornGenderBoys },
    { value: "girls", label: t.products.newbornGenderGirls },
    { value: "unisex", label: t.products.newbornGenderUnisex },
  ];

  const [nameEn, setNameEn] = useState(product?.name.en ?? "");
  const [nameAr, setNameAr] = useState(product?.name.ar ?? "");
  const [nameHe, setNameHe] = useState(product?.name.he ?? "");
  const [descEn, setDescEn] = useState(product?.description.en ?? "");
  const [descAr, setDescAr] = useState(product?.description.ar ?? "");
  const [descHe, setDescHe] = useState(product?.description.he ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [categories, setCategories] = useState<Category[]>(product?.categories ?? []);
  const [newbornGender, setNewbornGender] = useState<NewbornGender | null>(product?.newbornGender ?? null);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(product?.ageGroups ?? []);
  const [sizes, setSizes] = useState<{ label: string; stock: string }[]>(
    product?.sizes.map((s) => ({ label: s.label, stock: s.stock.toString() })) ?? [{ label: "", stock: "" }]
  );
  const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [translating, setTranslating] = useState<{ en: boolean; he: boolean }>({ en: false, he: false });
  const [translateFailed, setTranslateFailed] = useState<{ en: boolean; he: boolean }>({ en: false, he: false });
  const skipNextTranslate = useRef(true);

  // Debounced auto-translate: the admin only has to type Arabic — English and
  // Hebrew fields auto-fill shortly after they stop typing, but stay
  // editable so they can correct the machine translation before saving.
  // Skipped on mount so opening the edit form doesn't overwrite existing
  // English/Hebrew text that was already saved (or manually corrected).
  useEffect(() => {
    if (skipNextTranslate.current) {
      skipNextTranslate.current = false;
      return;
    }
    if (!nameAr.trim() && !descAr.trim()) return;

    const timer = setTimeout(() => {
      (["en", "he"] as const).forEach(async (target) => {
        const fields: { key: "name" | "description"; text: string }[] = [];
        if (nameAr.trim()) fields.push({ key: "name", text: nameAr });
        if (descAr.trim()) fields.push({ key: "description", text: descAr });
        if (fields.length === 0) return;

        setTranslating((prev) => ({ ...prev, [target]: true }));
        setTranslateFailed((prev) => ({ ...prev, [target]: false }));
        try {
          const translations = await translateTexts(
            fields.map((f) => f.text),
            target
          );
          fields.forEach((f, i) => {
            const translated = translations[i];
            if (translated === undefined) return;
            if (target === "en") {
              if (f.key === "name") setNameEn(translated);
              else setDescEn(translated);
            } else {
              if (f.key === "name") setNameHe(translated);
              else setDescHe(translated);
            }
          });
        } catch {
          setTranslateFailed((prev) => ({ ...prev, [target]: true }));
        } finally {
          setTranslating((prev) => ({ ...prev, [target]: false }));
        }
      });
    }, TRANSLATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [nameAr, descAr]);

  // Age groups are only meaningful for Boys/Girls listings.
  const showAgeGroups = categories.includes("boys") || categories.includes("girls");
  // Newborn gender is a standalone sub-field, unrelated to the main
  // Boys/Girls categories above — only shown for the "newborn" category.
  const showNewbornGender = categories.includes("newborn");
  // Wholesale items are often priced outside the app (negotiated per order),
  // so price is the one required field that becomes optional for them.
  const priceRequired = !categories.includes("wholesale");

  const toggleCategory = (value: Category) => {
    if (value === "newborn" && categories.includes(value)) {
      setNewbornGender(null);
    }
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
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
    if (
      !nameAr ||
      (priceRequired && !price) ||
      categories.length === 0 ||
      validSizes.length === 0 ||
      (showNewbornGender && !newbornGender)
    ) {
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
        images,
        categories,
        ageGroups: showAgeGroups ? ageGroups : [],
        sizes: validSizes.map((s) => ({ label: s.label.trim(), stock: Math.max(0, Number(s.stock) || 0) })),
        // Visibility is managed exclusively via the eye-icon toggle on the
        // products table, not this form — pass through the existing value
        // unchanged when editing. New products default to hidden so a whole
        // collection can be built out before revealing it to customers.
        isVisible: product?.isVisible ?? false,
      };
      if (showNewbornGender && newbornGender) {
        data.newbornGender = newbornGender;
      }
      if (price.trim()) {
        data.price = Number(price);
      }

      if (isEdit && product) {
        await updateProduct(product.id, data);
        // Omitting `price` from `data` above only skips writing it — it
        // doesn't clear an existing value, so blanking out a previously
        // priced product needs an explicit delete.
        if (!price.trim() && product.price !== undefined) {
          await clearProductPrice(product.id);
        }
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
            <Field
              label={t.products.nameEn}
              value={nameEn}
              onChange={setNameEn}
              loading={translating.en}
              errorText={translateFailed.en ? t.products.translateFailed : undefined}
            />
            <Field label={t.products.nameAr} value={nameAr} onChange={setNameAr} dir="rtl" />
            <Field
              label={t.products.nameHe}
              value={nameHe}
              onChange={setNameHe}
              dir="rtl"
              loading={translating.he}
              errorText={translateFailed.he ? t.products.translateFailed : undefined}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <TextAreaField
              label={t.products.descriptionEn}
              value={descEn}
              onChange={setDescEn}
              loading={translating.en}
            />
            <TextAreaField label={t.products.descriptionAr} value={descAr} onChange={setDescAr} dir="rtl" />
            <TextAreaField
              label={t.products.descriptionHe}
              value={descHe}
              onChange={setDescHe}
              dir="rtl"
              loading={translating.he}
            />
          </div>

          <Field
            label={priceRequired ? t.products.price : t.products.priceOptional}
            value={price}
            onChange={setPrice}
            type="number"
          />

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

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.sections}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2.5">
              {CATEGORIES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categories.includes(value)}
                    onChange={() => toggleCategory(value)}
                    className="w-4 h-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            {showNewbornGender && (
              <div className="mt-2 flex items-center gap-md bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t.products.newbornGenderLabel}</span>
                {NEWBORN_GENDERS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 font-body-md text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="newbornGender"
                      checked={newbornGender === value}
                      onChange={() => setNewbornGender(value)}
                      className="w-4 h-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.ageGroups}</label>
            <div
              className={`flex flex-col gap-1.5 rounded-xl border border-outline-variant px-3 py-2.5 ${
                showAgeGroups ? "bg-surface-container-low" : "bg-surface-container-low/50 opacity-50"
              }`}
            >
              {AGE_GROUPS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 font-body-md text-on-surface ${
                    showAgeGroups ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!showAgeGroups}
                    checked={ageGroups.includes(value)}
                    onChange={() => toggleAgeGroup(value)}
                    className="w-4 h-4 accent-primary disabled:opacity-50"
                  />
                  {label}
                </label>
              ))}
              {!showAgeGroups && (
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{t.products.ageGroupsHiddenNote}</p>
              )}
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
  loading,
  errorText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: "rtl" | "ltr";
  placeholder?: string;
  loading?: boolean;
  errorText?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant mb-1">
        {label}
        {loading && <Spinner size={12} />}
      </label>
      <input
        type={type}
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
      />
      {errorText && <p className="font-label-sm text-label-sm text-error mt-1">{errorText}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  dir,
  loading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
  loading?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant mb-1">
        {label}
        {loading && <Spinner size={12} />}
      </label>
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
