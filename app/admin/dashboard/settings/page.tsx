"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  DEFAULT_SEASONAL_CATEGORY,
  getHeroBannerUrl,
  getSeasonalCategory,
  setHeroBannerUrl,
  setSeasonalCategory,
} from "@/lib/firebase/siteSettings";
import { deleteStorageFile, uploadHeroBannerImage, uploadSeasonalCategoryIcon } from "@/lib/firebase/storage";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import Spinner from "@/components/ui/Spinner";

// Mirrors the fallback in app/(site)/page.tsx — shown until an admin
// uploads a replacement through this page.
const DEFAULT_BANNER = "/new-hero-banner.png";

export default function AdminSettingsPage() {
  const { t } = useAdminLanguage();
  // null = no Storage upload yet (still on the static default file), so
  // there's nothing to delete the first time an admin uploads one.
  const [heroBannerUrl, setHeroBannerUrlState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Seasonal category (name + icon) — saved as a pair via one "Save" click,
  // unlike the hero banner above which saves the instant a new file is
  // picked. A newly picked icon is uploaded to Storage right away (so it has
  // a URL to preview/save), but only written to Firestore — and only then
  // is the old icon file deleted — once Save is actually clicked.
  const [seasonalNameAr, setSeasonalNameAr] = useState(DEFAULT_SEASONAL_CATEGORY.name.ar);
  const [seasonalNameEn, setSeasonalNameEn] = useState(DEFAULT_SEASONAL_CATEGORY.name.en);
  const [seasonalNameHe, setSeasonalNameHe] = useState(DEFAULT_SEASONAL_CATEGORY.name.he);
  const [seasonalIconUrl, setSeasonalIconUrlState] = useState(DEFAULT_SEASONAL_CATEGORY.iconUrl);
  const [stagedSeasonalIconUrl, setStagedSeasonalIconUrl] = useState<string | null>(null);
  const [seasonalLoaded, setSeasonalLoaded] = useState(false);
  const [seasonalIconUploading, setSeasonalIconUploading] = useState(false);
  const [seasonalSaving, setSeasonalSaving] = useState(false);
  const [seasonalError, setSeasonalError] = useState<string | null>(null);
  const [seasonalSuccess, setSeasonalSuccess] = useState(false);

  useEffect(() => {
    getHeroBannerUrl()
      .then((url) => {
        setHeroBannerUrlState(url);
      })
      .catch(() => {
        // Fall back to the static default preview below.
      })
      .finally(() => setLoaded(true));

    getSeasonalCategory()
      .then((settings) => {
        setSeasonalNameAr(settings.name.ar);
        setSeasonalNameEn(settings.name.en);
        setSeasonalNameHe(settings.name.he);
        setSeasonalIconUrlState(settings.iconUrl);
      })
      .catch(() => {
        // Fall back to the DEFAULT_SEASONAL_CATEGORY values already in state.
      })
      .finally(() => setSeasonalLoaded(true));
  }, []);

  const handleSeasonalIconFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSeasonalIconUploading(true);
    setSeasonalError(null);
    setSeasonalSuccess(false);
    try {
      const newUrl = await uploadSeasonalCategoryIcon(file);
      setStagedSeasonalIconUrl(newUrl);
    } catch {
      setSeasonalError(t.settings.seasonalCategorySaveError);
    } finally {
      setSeasonalIconUploading(false);
    }
  };

  const handleSeasonalSave = async () => {
    setSeasonalSaving(true);
    setSeasonalError(null);
    setSeasonalSuccess(false);
    const finalIconUrl = stagedSeasonalIconUrl ?? seasonalIconUrl;
    try {
      await setSeasonalCategory({
        name: { ar: seasonalNameAr, en: seasonalNameEn, he: seasonalNameHe },
        iconUrl: finalIconUrl,
      });
      // Only after the new value is confirmed saved — never delete the old
      // icon file before Firestore actually points at its replacement.
      if (stagedSeasonalIconUrl && stagedSeasonalIconUrl !== seasonalIconUrl) {
        await deleteStorageFile(seasonalIconUrl);
      }
      setSeasonalIconUrlState(finalIconUrl);
      setStagedSeasonalIconUrl(null);
      setSeasonalSuccess(true);
    } catch {
      setSeasonalError(t.settings.seasonalCategorySaveError);
    } finally {
      setSeasonalSaving(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      const newUrl = await uploadHeroBannerImage(file);
      await setHeroBannerUrl(newUrl);
      const oldUrl = heroBannerUrl;
      setHeroBannerUrlState(newUrl);
      setSuccess(true);
      // Only after the new image is live — never delete the old file before
      // the new one is confirmed saved.
      if (oldUrl) {
        await deleteStorageFile(oldUrl);
      }
    } catch {
      setError(t.settings.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const previewSrc = heroBannerUrl ?? DEFAULT_BANNER;

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.settings.title}</h1>

      <div className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 p-md max-w-2xl">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">{t.settings.heroBannerTitle}</h2>
        <p className="font-body-md text-on-surface-variant mb-md">{t.settings.heroBannerDescription}</p>

        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
          {t.settings.currentImage}
        </label>
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-surface-container mb-md">
          {!loaded ? (
            <div className="w-full h-full flex items-center justify-center">
              <Spinner size={32} />
            </div>
          ) : (
            <Image src={previewSrc} alt="" fill sizes="(max-width: 768px) 100vw, 700px" className="object-contain" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Spinner size={32} />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {error}
          </div>
        )}
        {success && !uploading && (
          <div className="bg-primary/10 text-primary rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {t.settings.uploadSuccess}
          </div>
        )}

        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
          {t.settings.uploadNewImage}
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={handleFileChange}
          className="text-on-surface-variant font-body-md text-[14px] disabled:opacity-50"
        />
        {uploading && (
          <p className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant mt-2">
            <Spinner size={14} />
            {t.settings.uploading}
          </p>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 p-md max-w-2xl mt-lg">
        <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">{t.settings.seasonalCategoryTitle}</h2>
        <p className="font-body-md text-on-surface-variant mb-md">{t.settings.seasonalCategoryDescription}</p>

        <div className="flex flex-col gap-3 mb-md">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
              {t.settings.seasonalCategoryNameAr}
            </label>
            <input
              type="text"
              dir="rtl"
              value={seasonalNameAr}
              onChange={(e) => setSeasonalNameAr(e.target.value)}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
              {t.settings.seasonalCategoryNameEn}
            </label>
            <input
              type="text"
              dir="ltr"
              value={seasonalNameEn}
              onChange={(e) => setSeasonalNameEn(e.target.value)}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
              {t.settings.seasonalCategoryNameHe}
            </label>
            <input
              type="text"
              dir="rtl"
              value={seasonalNameHe}
              onChange={(e) => setSeasonalNameHe(e.target.value)}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
        </div>

        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
          {t.settings.seasonalCategoryIcon} — {t.settings.currentImage}
        </label>
        <div className="relative w-28 aspect-square rounded-xl overflow-hidden bg-surface-container mb-md">
          {!seasonalLoaded ? (
            <div className="w-full h-full flex items-center justify-center">
              <Spinner size={24} />
            </div>
          ) : (
            <Image
              src={stagedSeasonalIconUrl ?? seasonalIconUrl}
              alt=""
              fill
              sizes="112px"
              className="object-contain"
            />
          )}
          {seasonalIconUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Spinner size={24} />
            </div>
          )}
        </div>

        {seasonalError && (
          <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {seasonalError}
          </div>
        )}
        {seasonalSuccess && !seasonalSaving && (
          <div className="bg-primary/10 text-primary rounded-xl px-4 py-3 mb-md font-label-md text-label-md">
            {t.settings.seasonalCategorySaveSuccess}
          </div>
        )}

        <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
          {t.settings.uploadNewImage}
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={seasonalIconUploading || seasonalSaving}
          onChange={handleSeasonalIconFileChange}
          className="text-on-surface-variant font-body-md text-[14px] disabled:opacity-50"
        />
        {seasonalIconUploading && (
          <p className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant mt-2">
            <Spinner size={14} />
            {t.settings.uploading}
          </p>
        )}

        <div className="mt-md">
          <button
            type="button"
            onClick={handleSeasonalSave}
            disabled={seasonalSaving || seasonalIconUploading || !seasonalLoaded}
            className="inline-flex items-center gap-2 px-lg py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {seasonalSaving && <Spinner size={16} />}
            {seasonalSaving ? t.common.saving : t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
