"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdmin } from "@/lib/firebase/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Incorrect username or password");
      return;
    }

    setSubmitting(true);
    try {
      await loginAdmin(email, password);
      router.push("/admin/dashboard");
    } catch {
      setError("Incorrect username or password");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-gutter py-xl">
      <Link href="/" className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md mb-lg flex items-center gap-1">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Store
      </Link>

      <div className="w-full max-w-[420px] bg-surface-container-lowest rounded-[2rem] cloud-shadow p-lg">
        <div className="text-center mb-lg">
          <div
            className="font-headline-md text-headline-md text-primary mb-2"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Little Yafa
          </div>
          <p className="font-body-md text-on-surface-variant">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          {error && (
            <div className="bg-error-container text-on-error-container rounded-xl px-4 py-3 font-label-md text-label-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              Email
            </label>
            <input
              id="username"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@littleyafa.com"
              className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-label-md text-label-md text-on-surface-variant mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface rounded-xl border border-outline-variant px-4 py-3 pr-12 font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 -translate-y-1/2 right-4 text-on-surface-variant hover:text-primary"
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
            {submitting ? "Validating..." : "Login"}
          </button>
        </form>
      </div>

      <p className="font-body-md text-on-surface-variant opacity-60 mt-lg text-[13px]">
        © {new Date().getFullYear()} Little Yafa
      </p>
    </div>
  );
}
