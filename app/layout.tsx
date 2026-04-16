import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import PwaInstallBanner from '@/app/components/PwaInstallBanner';

// 🔥 METADATA ESTÁTICA (SEO + PWA)
export const metadata: Metadata = {
  title: "La Magia ✨",
  description: "Audiolibros de manifestación, gratitud y abundancia",
  manifest: "/manifest.json", // 👈 Link al manifest PWA
  themeColor: "#F59E0B", // 👈 Color de la barra de estado
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Magia ✨",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

// 🔥 VIEWPORT (para móviles y PWA)
export const viewport: Viewport = {
  themeColor: "#F59E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Evita zoom accidental en móviles
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es" // 👈 Cambiado a "es" para tu audiencia
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaInstallBanner />
        <Analytics />
      </body>
    </html>
  );
}