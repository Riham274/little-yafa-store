"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { loginAdmin } from "@/lib/firebase/auth";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import AdminLanguageSwitcher from "@/components/admin/AdminLanguageSwitcher";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, dir, locale } = useAdminLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t.login.errorCredentials);
      return;
    }

    setSubmitting(true);
    try {
      await loginAdmin(email, password);
      router.push("/admin/dashboard");
    } catch (err) {
      console.error(err);
      const code = err instanceof FirebaseError ? err.code : "unknown-error";
      setError(`${t.login.errorCredentials} (${code})`);
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={dir}
      data-admin-locale={locale}
      className="min-h-screen bg-surface flex flex-col items-center justify-center px-gutter py-xl"
    >
      <div className="w-full max-w-[420px] flex items-center justify-between mb-lg">
        <Link href="/" className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px] rtl:rotate-180">arrow_back</span>
          {t.common.backToStore}
        </Link>
        <AdminLanguageSwitcher />
      </div>

      <div className="w-full max-w-[420px] bg-surface-container-lowest rounded-[2rem] cloud-shadow p-lg">
        <div className="text-center mb-lg">
          <div
            className="font-headline-md text-headline-md text-primary mb-2"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {t.common.brand}
          </div>
          <p className="font-body-md text-on-surface-variant">{t.login.panelTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          {error && (
            <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 font-label-md text-label-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              {t.login.email}
            </label>
            <input
              id="username"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPlaceholder}
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              {t.login.password}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 pe-12 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 -translate-y-1/2 end-4 text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-sm flex items-center justify-center gap-2 px-lg py-4 bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-70"
          >
            {submitting ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">login</span>
            )}
            {submitting ? t.login.validating : t.login.login}
          </button>
        </form>
      </div>

      <p className="font-body-md text-on-surface-variant opacity-60 mt-lg text-[13px]">
        © {new Date().getFullYear()} {t.common.brand}
      </p>
    </div>
  );
}
