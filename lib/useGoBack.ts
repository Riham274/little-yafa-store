"use client";

import { useRouter } from "next/navigation";

// Shared by the footer's "Back to Previous Page" button and the header's
// back-arrow icon (components/layout/Footer.tsx, components/layout/Header.tsx)
// so both trigger navigation the same way rather than each calling
// router.back() directly.
export function useGoBack(): () => void {
  const router = useRouter();
  return () => router.back();
}
