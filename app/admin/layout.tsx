import { AdminLanguageProvider } from "@/context/AdminLanguageContext";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminLanguageProvider>{children}</AdminLanguageProvider>;
}
