import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manabi Prep — Personal Japanese Exam Dashboard",
  description: "Personal Japanese exam prep dashboard for JFT-Basic, JLPT N3, N2, and N1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Manabi Prep",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning only applies to <html> (ignores browser-injected attributes like iOS Chrome's __gcrremoteframetoken)
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
