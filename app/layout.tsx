import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Telugu Lyrics Vault",
  description: "Personal Telugu Lyrics Vault",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lyrics Vault",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te">
      <head>
        {/* Prevent FOUC: apply theme class before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='light'||(t==='system'&&!d))document.documentElement.classList.add('light');}catch(e){}})();` }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-slate-900 text-slate-100 min-h-screen`}>
        <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="text-xl font-bold text-violet-400 hover:text-violet-300 transition-colors shrink-0">
              🎵 Telugu Lyrics Vault
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/add"
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Song
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
        <Toaster position="bottom-center" richColors closeButton />
      </body>
    </html>
  );
}
