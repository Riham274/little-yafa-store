"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { isAdminUser } from "@/lib/firebase/auth";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authorized">("checking");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const ok = await isAdminUser(user);
      if (!ok) {
        router.replace("/admin/login");
        return;
      }
      setStatus("authorized");
    });
    return unsubscribe;
  }, [router]);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
