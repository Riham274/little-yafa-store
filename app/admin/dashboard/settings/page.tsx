"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { getHeroBannerUrl, setHeroBannerUrl } from "@/lib/firebase/siteSettings";
import { deleteStorageFile, uploadHeroBannerImage } from "@/lib/firebase/storage";
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

  useEffect(() => {
    getHeroBannerUrl()
      .then((url) => {
        setHeroBannerUrlState(url);
      })
      .catch(() => {
        // Fall back to the static default preview below.
      })
      .finally(() => setLoaded(true));
  }, []);

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
    </div>
  );
}
