"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type {
  AgeGroup,
  Category,
  ImageFocalPoint,
  NewbornFabricType,
  NewbornGender,
  Product,
  ProductColor,
  ProductImage,
  ProductInput,
} from "@/lib/types";
import { DEFAULT_FOCAL_POINT } from "@/lib/types";
import { db } from "@/lib/firebase/config";
import { auth } from "@/lib/firebase/auth";
import { storage, uploadProductImage } from "@/lib/firebase/storage";
import {
  clearProductCostPrice,
  clearProductInternalCode,
  clearProductPrice,
  clearProductSalePrice,
  createProduct,
  newProductRef,
  updateProduct,
} from "@/lib/firebase/products";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import Spinner from "@/components/ui/Spinner";
import FocalPointPickerModal from "@/components/admin/FocalPointPickerModal";
import { proxiedImageUrl } from "@/lib/imageProxy";

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

type NewImageFile = { file: File; focalPoint: ImageFocalPoint };

type ColorFormState = {
  labelAr: string;
  labelEn: string;
  labelHe: string;
  existingImages: ProductImage[];
  newFiles: NewImageFile[];
  sizes: { label: string; stock: string }[];
};

function isColorComplete(color: ColorFormState): boolean {
  return (
    color.labelAr.trim() !== "" &&
    color.existingImages.length + color.newFiles.length > 0 &&
    color.sizes.some((s) => s.label.trim())
  );
}

const DRAFT_SAVE_DEBOUNCE_MS = 2500;

// Everything in ColorFormState except `newFiles` (raw File objects can't be
// JSON-serialized into localStorage — the admin has to re-select any images
// that hadn't been uploaded yet when the draft was saved).
type ColorDraft = Omit<ColorFormState, "newFiles">;

type ProductDraft = {
  internalCode: string;
  nameEn: string;
  nameAr: string;
  nameHe: string;
  descEn: string;
  descAr: string;
  descHe: string;
  price: string;
  salePrice: string;
  costPrice: string;
  categories: Category[];
  newbornGender: NewbornGender | null;
  newbornFabricType: NewbornFabricType | null;
  ageGroups: AgeGroup[];
  colors: ColorDraft[];
};

// A distinct key per product being edited (or one shared key for the "Add
// Product" form) so an in-progress draft for one product never collides
// with, or gets offered while editing, a different one.
function getDraftKey(product: Product | null): string {
  return product ? `admin-product-draft-${product.id}` : "admin-product-draft";
}

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
    { value: "shoes", label: t.products.sectionShoes },
    { value: "dresses", label: t.products.sectionDresses },
    { value: "winter", label: t.products.sectionWinter },
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
  const NEWBORN_FABRIC_TYPES: { value: NewbornFabricType; label: string }[] = [
    { value: "cotton", label: t.products.newbornFabricCotton },
    { value: "wool", label: t.products.newbornFabricWool },
  ];

  const [internalCode, setInternalCode] = useState(product?.internalCode ?? "");
  const [nameEn, setNameEn] = useState(product?.name.en ?? "");
  const [nameAr, setNameAr] = useState(product?.name.ar ?? "");
  const [nameHe, setNameHe] = useState(product?.name.he ?? "");
  const [descEn, setDescEn] = useState(product?.description.en ?? "");
  const [descAr, setDescAr] = useState(product?.description.ar ?? "");
  const [descHe, setDescHe] = useState(product?.description.he ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() ?? "");
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() ?? "");
  const [categories, setCategories] = useState<Category[]>(product?.categories ?? []);
  const [newbornGender, setNewbornGender] = useState<NewbornGender | null>(product?.newbornGender ?? null);
  const [newbornFabricType, setNewbornFabricType] = useState<NewbornFabricType | null>(
    product?.newbornFabricType ?? null
  );
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(product?.ageGroups ?? []);
  const [colors, setColors] = useState<ColorFormState[]>(
    product?.colors.map((c) => ({
      labelAr: c.label.ar,
      labelEn: c.label.en,
      labelHe: c.label.he,
      existingImages: c.images,
      newFiles: [],
      sizes: c.sizes.map((s) => ({ label: s.label, stock: s.stock.toString() })),
    })) ?? [
      { labelAr: "", labelEn: "", labelHe: "", existingImages: [], newFiles: [], sizes: [{ label: "", stock: "" }] },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Caches one object URL per File so re-rendering while the focal-point
  // modal is open (which happens on every drag-move, to show the live
  // preview) doesn't call URL.createObjectURL again for the same file —
  // the File reference itself stays stable across a focal-point-only edit,
  // only its `focalPoint` field changes.
  const blobUrlCache = useRef(new Map<File, string>());
  const getBlobUrl = (file: File): string => {
    let url = blobUrlCache.current.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      blobUrlCache.current.set(file, url);
    }
    return url;
  };

  // Which image's focal-point picker modal is currently open, if any (the
  // OPTIONAL re-edit flow — an image already committed to existingImages or
  // newFiles) — identifies the image by color index + either its existing
  // url or its newFiles index, since those are the two places an image can
  // live in form state before save.
  const [focalPointTarget, setFocalPointTarget] = useState<
    { colorIndex: number; kind: "existing"; url: string } | { colorIndex: number; kind: "new"; fileIndex: number } | null
  >(null);

  // Newly selected files awaiting their MANDATORY crop/zoom confirmation
  // before they're committed into a color's newFiles — a FIFO queue so
  // selecting several files at once (the file input is `multiple`) walks
  // the admin through each one in turn, one modal at a time. Only the
  // front of the queue (index 0) is ever shown; confirming it commits that
  // file into `colors` and advances to the next.
  const [pendingNewImages, setPendingNewImages] = useState<
    { colorIndex: number; file: File; focalPoint: ImageFocalPoint }[]
  >([]);

  const draftKey = getDraftKey(product);
  // A found-but-not-yet-decided draft, offered via the restore banner below.
  const [pendingDraft, setPendingDraft] = useState<ProductDraft | null>(null);
  // Gates the auto-save effect: stays false while a found draft is awaiting
  // the admin's restore/discard choice, so autosave can't overwrite it with
  // the form's plain initial state before they've decided.
  const [draftResolved, setDraftResolved] = useState(false);

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

  // Same auto-translate behavior as name/description above, but keyed per
  // color index since colors are a dynamic list. Depending on the
  // concatenated Arabic labels (not `colors` itself) means editing images or
  // sizes doesn't re-trigger a translation pass.
  const [colorTranslating, setColorTranslating] = useState<Record<number, { en: boolean; he: boolean }>>({});
  const [colorTranslateFailed, setColorTranslateFailed] = useState<Record<number, { en: boolean; he: boolean }>>({});
  const skipNextColorTranslate = useRef(true);
  const colorLabelsAr = colors.map((c) => c.labelAr).join(" ");

  useEffect(() => {
    if (skipNextColorTranslate.current) {
      skipNextColorTranslate.current = false;
      return;
    }
    const pending = colors.map((c, i) => ({ i, text: c.labelAr.trim() })).filter((p) => p.text !== "");
    if (pending.length === 0) return;

    const timer = setTimeout(() => {
      (["en", "he"] as const).forEach(async (target) => {
        pending.forEach(({ i }) => {
          setColorTranslating((prev) => ({ ...prev, [i]: { ...prev[i], [target]: true } }));
          setColorTranslateFailed((prev) => ({ ...prev, [i]: { ...prev[i], [target]: false } }));
        });
        try {
          const translations = await translateTexts(
            pending.map((p) => p.text),
            target
          );
          pending.forEach((p, idx) => {
            const translated = translations[idx];
            if (translated === undefined) return;
            setColors((prev) =>
              prev.map((c, ci) =>
                ci === p.i ? { ...c, [target === "en" ? "labelEn" : "labelHe"]: translated } : c
              )
            );
          });
        } catch {
          pending.forEach(({ i }) => {
            setColorTranslateFailed((prev) => ({ ...prev, [i]: { ...prev[i], [target]: true } }));
          });
        } finally {
          pending.forEach(({ i }) => {
            setColorTranslating((prev) => ({ ...prev, [i]: { ...prev[i], [target]: false } }));
          });
        }
      });
    }, TRANSLATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorLabelsAr]);

  // Runs once on mount: offer to restore a draft left behind by a crash,
  // accidental navigation, or connection issue while filling out this exact
  // form (same product, or the blank "Add Product" form). Intentionally not
  // in the [draftKey] deps array — draftKey can't change during this
  // component's lifetime (the `product` prop is fixed per mount, since the
  // parent always remounts a fresh instance when switching which product is
  // being edited).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        setPendingDraft(JSON.parse(raw) as ProductDraft);
        return; // stay unresolved until the admin picks restore or discard
      }
    } catch {
      // Corrupted/inaccessible localStorage — nothing to offer, proceed as
      // if there were no draft.
    }
    setDraftResolved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silent debounced autosave of everything except uploaded image files
  // (File objects can't survive JSON serialization) — gated on
  // draftResolved so this can't overwrite an unclaimed draft with the
  // form's plain initial state before the admin has chosen restore/discard.
  useEffect(() => {
    if (!draftResolved) return;
    const timer = setTimeout(() => {
      const draft: ProductDraft = {
        internalCode,
        nameEn,
        nameAr,
        nameHe,
        descEn,
        descAr,
        descHe,
        price,
        salePrice,
        costPrice,
        categories,
        newbornGender,
        newbornFabricType,
        ageGroups,
        colors: colors.map(({ labelAr, labelEn, labelHe, existingImages, sizes }) => ({
          labelAr,
          labelEn,
          labelHe,
          existingImages,
          sizes,
        })),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // Quota exceeded / private browsing — autosave is a nice-to-have,
        // fail silently rather than interrupt typing with an error.
      }
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    draftResolved,
    draftKey,
    internalCode,
    nameEn,
    nameAr,
    nameHe,
    descEn,
    descAr,
    descHe,
    price,
    salePrice,
    costPrice,
    categories,
    newbornGender,
    newbornFabricType,
    ageGroups,
    colors,
  ]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Already gone or inaccessible — nothing more to do.
    }
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    // Re-arm the "skip next" translate guards so programmatically restoring
    // nameAr/descAr/color labels doesn't immediately fire a fresh
    // auto-translate pass that overwrites the draft's own saved
    // (possibly manually-corrected) English/Hebrew text.
    skipNextTranslate.current = true;
    skipNextColorTranslate.current = true;
    // ?? "" guards a draft saved by an older version of this form before
    // this field existed — JSON.parse leaves it simply absent, which would
    // otherwise set this controlled input's value to undefined.
    setInternalCode(pendingDraft.internalCode ?? "");
    setNameEn(pendingDraft.nameEn);
    setNameAr(pendingDraft.nameAr);
    setNameHe(pendingDraft.nameHe);
    setDescEn(pendingDraft.descEn);
    setDescAr(pendingDraft.descAr);
    setDescHe(pendingDraft.descHe);
    setPrice(pendingDraft.price);
    setSalePrice(pendingDraft.salePrice);
    setCostPrice(pendingDraft.costPrice);
    setCategories(pendingDraft.categories);
    setNewbornGender(pendingDraft.newbornGender);
    setNewbornFabricType(pendingDraft.newbornFabricType);
    setAgeGroups(pendingDraft.ageGroups);
    setColors(pendingDraft.colors.map((c) => ({ ...c, newFiles: [] })));
    setPendingDraft(null);
    setDraftResolved(true);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setPendingDraft(null);
    setDraftResolved(true);
  };

  // Cancel is a deliberate choice to abandon the form (unlike a crash or
  // accidental navigation, which is exactly what the draft exists to
  // protect against), so the draft is cleared silently rather than kept
  // around to prompt a restore next time — matches this form's existing
  // lightweight cancel behavior (no confirmation dialog).
  const handleCancel = () => {
    clearDraft();
    onClose();
  };

  // Age groups are only meaningful for Boys/Girls listings.
  const showAgeGroups = categories.includes("boys") || categories.includes("girls");
  // Newborn gender is a standalone sub-field, unrelated to the main
  // Boys/Girls categories above — only shown for the "newborn" category.
  const showNewbornGender = categories.includes("newborn");
  // Wholesale items are often priced outside the app (negotiated per order),
  // so price is the one required field that becomes optional for them.
  const priceRequired = !categories.includes("wholesale");
  // Sale price is always optional, but when filled in it must land below a
  // known regular price — otherwise the site would have nothing to strike
  // through.
  const salePriceInvalid =
    salePrice.trim() !== "" && (!price.trim() || Number(salePrice) >= Number(price));

  const toggleCategory = (value: Category) => {
    if (value === "newborn" && categories.includes(value)) {
      setNewbornGender(null);
      setNewbornFabricType(null);
    }
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  };

  const toggleAgeGroup = (value: AgeGroup) => {
    setAgeGroups((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  };

  const addColor = () =>
    setColors((prev) => [
      ...prev,
      { labelAr: "", labelEn: "", labelHe: "", existingImages: [], newFiles: [], sizes: [{ label: "", stock: "" }] },
    ]);
  const removeColor = (index: number) => setColors((prev) => prev.filter((_, i) => i !== index));
  const updateColorLabel = (index: number, lang: "ar" | "en" | "he", value: string) =>
    setColors((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if (lang === "ar") return { ...c, labelAr: value };
        if (lang === "en") return { ...c, labelEn: value };
        return { ...c, labelHe: value };
      })
    );
  // Selecting files no longer adds them to the color directly — each one
  // must go through the mandatory crop/zoom confirmation first (see
  // pendingNewImages above). This only queues them.
  const queueNewColorFiles = (index: number, files: File[]) => {
    if (files.length === 0) return;
    setPendingNewImages((prev) => [
      ...prev,
      ...files.map((file) => ({ colorIndex: index, file, focalPoint: DEFAULT_FOCAL_POINT })),
    ]);
  };
  const updatePendingImageFocalPoint = (focalPoint: ImageFocalPoint) =>
    setPendingNewImages((prev) => prev.map((p, i) => (i === 0 ? { ...p, focalPoint } : p)));
  const confirmPendingImage = () => {
    const pending = pendingNewImages[0];
    if (!pending) return;
    setColors((prev) =>
      prev.map((c, i) =>
        i === pending.colorIndex
          ? { ...c, newFiles: [...c.newFiles, { file: pending.file, focalPoint: pending.focalPoint }] }
          : c
      )
    );
    setPendingNewImages((prev) => prev.slice(1));
  };
  const removeColorExistingImage = (index: number, url: string) =>
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, existingImages: c.existingImages.filter((img) => img.url !== url) } : c))
    );
  const removeColorNewFile = (index: number, fileIndex: number) =>
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, newFiles: c.newFiles.filter((_, fi) => fi !== fileIndex) } : c))
    );
  const updateColorExistingImageFocalPoint = (index: number, url: string, focalPoint: ImageFocalPoint) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, existingImages: c.existingImages.map((img) => (img.url === url ? { ...img, focalPoint } : img)) }
          : c
      )
    );
  const updateColorNewFileFocalPoint = (index: number, fileIndex: number, focalPoint: ImageFocalPoint) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, newFiles: c.newFiles.map((nf, fi) => (fi === fileIndex ? { ...nf, focalPoint } : nf)) }
          : c
      )
    );
  const addColorSizeRow = (index: number) =>
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, sizes: [...c.sizes, { label: "", stock: "" }] } : c)));
  const removeColorSizeRow = (index: number, sizeIndex: number) =>
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, sizes: c.sizes.filter((_, si) => si !== sizeIndex) } : c))
    );
  const updateColorSizeRow = (index: number, sizeIndex: number, patch: Partial<{ label: string; stock: string }>) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, sizes: c.sizes.map((s, si) => (si === sizeIndex ? { ...s, ...patch } : s)) } : c
      )
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const colorsValid = colors.length > 0 && colors.every(isColorComplete);
    if (
      !nameAr ||
      (priceRequired && !price) ||
      categories.length === 0 ||
      !colorsValid ||
      (showNewbornGender && !newbornGender) ||
      (showNewbornGender && !newbornFabricType)
    ) {
      setError(t.products.errorRequiredFields);
      return;
    }
    if (salePriceInvalid) {
      setError(t.products.errorSalePriceInvalid);
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

      const colorsPayload: ProductColor[] = await Promise.all(
        colors.map(async (c) => {
          const uploadedImages: ProductImage[] = await Promise.all(
            c.newFiles.map(async (nf) => ({ url: await uploadProductImage(id, nf.file), focalPoint: nf.focalPoint }))
          );
          return {
            label: {
              ar: c.labelAr.trim(),
              // Fall back to the Arabic text if the admin left en/he blank
              // (e.g. translation failed and they didn't fill it in
              // manually) — matches the read-time fallback in
              // lib/firebase/products.ts, so the storefront never shows an
              // empty color name.
              en: c.labelEn.trim() || c.labelAr.trim(),
              he: c.labelHe.trim() || c.labelAr.trim(),
            },
            images: [...c.existingImages, ...uploadedImages],
            sizes: c.sizes
              .filter((s) => s.label.trim())
              .map((s) => ({ label: s.label.trim(), stock: Math.max(0, Number(s.stock) || 0) })),
          };
        })
      );

      const data: ProductInput = {
        name: { en: nameEn, ar: nameAr, he: nameHe },
        description: { en: descEn, ar: descAr, he: descHe },
        colors: colorsPayload,
        categories,
        ageGroups: showAgeGroups ? ageGroups : [],
        // Visibility is managed exclusively via the eye-icon toggle on the
        // products table, not this form — pass through the existing value
        // unchanged when editing. New products default to hidden so a whole
        // collection can be built out before revealing it to customers.
        isVisible: product?.isVisible ?? false,
      };
      if (showNewbornGender && newbornGender) {
        data.newbornGender = newbornGender;
      }
      if (showNewbornGender && newbornFabricType) {
        data.newbornFabricType = newbornFabricType;
      }
      if (price.trim()) {
        data.price = Number(price);
      }
      if (salePrice.trim()) {
        data.salePrice = Number(salePrice);
      }
      if (costPrice.trim()) {
        data.costPrice = Number(costPrice);
      }
      if (internalCode.trim()) {
        data.internalCode = internalCode.trim();
      }

      if (isEdit && product) {
        await updateProduct(product.id, data);
        // Omitting `price`/`salePrice`/`costPrice`/`internalCode` from
        // `data` above only skips writing them — it doesn't clear an
        // existing value, so blanking out a previously set field needs an
        // explicit delete.
        if (!price.trim() && product.price !== undefined) {
          await clearProductPrice(product.id);
        }
        if (!salePrice.trim() && product.salePrice !== undefined) {
          await clearProductSalePrice(product.id);
        }
        if (!costPrice.trim() && product.costPrice !== undefined) {
          await clearProductCostPrice(product.id);
        }
        if (!internalCode.trim() && product.internalCode !== undefined) {
          await clearProductInternalCode(product.id);
        }
      } else {
        await createProduct(id, data);
      }
      clearDraft();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.products.errorGeneric);
      setSaving(false);
    }
  };

  // Resolves the currently-open focal-point target (if any) to the actual
  // image src + focal point it needs to display/edit — looked up fresh from
  // `colors` state on every render rather than stored in focalPointTarget
  // itself, so it always reflects the latest value even if something else
  // changed it in the meantime.
  const focalPointEditing = (() => {
    if (!focalPointTarget) return null;
    const color = colors[focalPointTarget.colorIndex];
    if (!color) return null;
    if (focalPointTarget.kind === "existing") {
      const img = color.existingImages.find((i) => i.url === focalPointTarget.url);
      if (!img) return null;
      return { src: img.url, focalPoint: img.focalPoint };
    }
    const nf = color.newFiles[focalPointTarget.fileIndex];
    if (!nf) return null;
    return { src: getBlobUrl(nf.file), focalPoint: nf.focalPoint };
  })();

  // The front of the mandatory queue, if any — shown instead of (takes
  // priority over) the optional focalPointEditing modal above, though in
  // practice the two can never be open at once since this one covers the
  // whole screen with no way to reach the buttons that open the other.
  const pendingImageEditing = pendingNewImages[0]
    ? { src: getBlobUrl(pendingNewImages[0].file), focalPoint: pendingNewImages[0].focalPoint }
    : null;

  return (
    <>
    <div
      dir={dir}
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-gutter overflow-y-auto"
    >
      <div className="bg-surface rounded-[2rem] cloud-shadow w-full max-w-2xl my-lg max-h-[90vh] overflow-y-auto p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {isEdit ? t.products.modalTitleEdit : t.products.modalTitleNew}
          </h2>
          <button onClick={handleCancel} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {pendingDraft && (
          <div className="bg-secondary-container/30 text-on-secondary-container rounded-xl px-4 py-3 mb-md flex flex-col gap-2">
            <p className="font-label-md text-label-md">{t.products.draftFoundMessage}</p>
            <p className="font-label-sm text-label-sm opacity-80">{t.products.draftImagesNote}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-4 py-2 bg-primary text-on-primary rounded-full font-label-sm text-label-sm shadow hover:shadow-md transition-all active:scale-95"
              >
                {t.products.draftRestore}
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-4 py-2 rounded-full font-label-sm text-label-sm text-on-secondary-container hover:bg-secondary-container/40 transition-colors"
              >
                {t.products.draftDiscard}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          {/* First field in the form, ahead of name/description — this is
              the first thing the admin cross-references against physical
              stock, per t.products.internalCodeNote below it never reaches
              the storefront (same admin-only convention as costPrice). */}
          <div>
            <Field label={t.products.internalCode} value={internalCode} onChange={setInternalCode} />
            <p className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant mt-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              {t.products.internalCodeNote}
            </p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <Field
              label={priceRequired ? t.products.price : t.products.priceOptional}
              value={price}
              onChange={setPrice}
              type="number"
            />
            <Field
              label={t.products.salePriceOptional}
              value={salePrice}
              onChange={setSalePrice}
              type="number"
              errorText={salePriceInvalid ? t.products.errorSalePriceInvalid : undefined}
            />
          </div>

          <div>
            <Field label={t.products.costPriceOptional} value={costPrice} onChange={setCostPrice} type="number" />
            <p className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant mt-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              {t.products.costPriceNote}
            </p>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.colorsLabel}</label>
            <div className="flex flex-col gap-md">
              {colors.map((color, ci) => (
                <div key={ci} className="bg-surface-container-low rounded-xl border border-outline-variant p-3 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm flex-1">
                      <Field
                        label={t.products.colorLabelEn}
                        value={color.labelEn}
                        onChange={(v) => updateColorLabel(ci, "en", v)}
                        loading={colorTranslating[ci]?.en}
                        errorText={colorTranslateFailed[ci]?.en ? t.products.translateFailed : undefined}
                      />
                      <Field
                        label={t.products.colorLabelAr}
                        value={color.labelAr}
                        onChange={(v) => updateColorLabel(ci, "ar", v)}
                        dir="rtl"
                      />
                      <Field
                        label={t.products.colorLabelHe}
                        value={color.labelHe}
                        onChange={(v) => updateColorLabel(ci, "he", v)}
                        dir="rtl"
                        loading={colorTranslating[ci]?.he}
                        errorText={colorTranslateFailed[ci]?.he ? t.products.translateFailed : undefined}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColor(ci)}
                      disabled={colors.length <= 1}
                      aria-label={t.products.removeColor}
                      className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mt-6"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">{t.products.images}</label>
                    <div className="flex flex-wrap gap-sm mb-sm">
                      {color.existingImages.map((img) => (
                        <div key={img.url} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proxiedImageUrl(img.url)}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ objectPosition: `${img.focalPoint.x}% ${img.focalPoint.y}%` }}
                          />
                          <button
                            type="button"
                            onClick={() => setFocalPointTarget({ colorIndex: ci, kind: "existing", url: img.url })}
                            aria-label={t.products.setFocalPoint}
                            title={t.products.setFocalPoint}
                            className="absolute bottom-0.5 start-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                          >
                            <span className="material-symbols-outlined text-[14px]">center_focus_weak</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeColorExistingImage(ci, img.url)}
                            aria-label={t.products.removeImage}
                            className="absolute top-0.5 end-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ))}
                      {color.newFiles.map((nf, fi) => (
                        <div key={fi} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getBlobUrl(nf.file)}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ objectPosition: `${nf.focalPoint.x}% ${nf.focalPoint.y}%` }}
                          />
                          <button
                            type="button"
                            onClick={() => setFocalPointTarget({ colorIndex: ci, kind: "new", fileIndex: fi })}
                            aria-label={t.products.setFocalPoint}
                            title={t.products.setFocalPoint}
                            className="absolute bottom-0.5 start-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
                          >
                            <span className="material-symbols-outlined text-[14px]">center_focus_weak</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeColorNewFile(ci, fi)}
                            aria-label={t.products.removeImage}
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
                      onChange={(e) => {
                        queueNewColorFiles(ci, Array.from(e.target.files ?? []));
                        // Clears the input's own file list so re-selecting
                        // the exact same file again later still fires a
                        // fresh change event (browsers otherwise treat an
                        // unchanged file list as a no-op change).
                        e.target.value = "";
                      }}
                      className="text-on-surface-variant font-body-md text-[14px]"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">{t.products.sizesLabel}</label>
                    <div className="flex flex-col gap-2">
                      {color.sizes.map((row, si) => (
                        <div key={si} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.label}
                            onChange={(e) => updateColorSizeRow(ci, si, { label: e.target.value })}
                            placeholder={t.products.sizeLabelPlaceholder}
                            className="flex-1 bg-surface rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                          />
                          <input
                            type="number"
                            min={0}
                            value={row.stock}
                            onChange={(e) => updateColorSizeRow(ci, si, { stock: e.target.value })}
                            placeholder={t.products.sizeStockPlaceholder}
                            className="w-28 bg-surface rounded-xl border border-outline-variant px-3 py-2 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => removeColorSizeRow(ci, si)}
                            disabled={color.sizes.length <= 1}
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
                      onClick={() => addColorSizeRow(ci)}
                      className="mt-2 flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      {t.products.addSize}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addColor}
              className="mt-3 flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {t.products.addColor}
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
            {showNewbornGender && (
              <div className="mt-2 flex items-center gap-md bg-surface-container-low rounded-xl border border-outline-variant px-3 py-2.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t.products.newbornFabricTypeLabel}</span>
                {NEWBORN_FABRIC_TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 font-body-md text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="newbornFabricType"
                      checked={newbornFabricType === value}
                      onChange={() => setNewbornFabricType(value)}
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

          <div className="flex justify-end gap-sm mt-md">
            <button
              type="button"
              onClick={handleCancel}
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
    {focalPointTarget && focalPointEditing && (
      <FocalPointPickerModal
        src={focalPointEditing.src}
        focalPoint={focalPointEditing.focalPoint}
        onChange={(fp) =>
          focalPointTarget.kind === "existing"
            ? updateColorExistingImageFocalPoint(focalPointTarget.colorIndex, focalPointTarget.url, fp)
            : updateColorNewFileFocalPoint(focalPointTarget.colorIndex, focalPointTarget.fileIndex, fp)
        }
        onClose={() => setFocalPointTarget(null)}
      />
    )}
    {pendingImageEditing && (
      <FocalPointPickerModal
        src={pendingImageEditing.src}
        focalPoint={pendingImageEditing.focalPoint}
        onChange={updatePendingImageFocalPoint}
        onConfirm={confirmPendingImage}
      />
    )}
    </>
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
