import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AmzWatch — Tracker de concurrents Amazon",
  description: "Suivez vos concurrents Amazon : prix, stock et avis en temps réel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
