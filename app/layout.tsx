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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lyrics Vault",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
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
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-slate-900 text-slate-100 min-h-screen flex flex-col overflow-x-hidden`}>
        <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="text-xl font-bold text-sky-400 hover:text-sky-300 transition-colors shrink-0">
              ♪ Telugu Lyrics Vault
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/movies"
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-700 hidden sm:inline-flex"
              >
                ▸ Movies
              </Link>
              <Link
                href="/genres"
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-700 hidden sm:inline-flex"
              >
                ♪ Genres
              </Link>
              <ThemeToggle />
              <Link
                href="/add"
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Song
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6 pb-24 w-full">
          {children}
        </main>
        <footer className="border-t border-slate-800 bg-slate-900 mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Nav links row */}
            <div className="flex flex-wrap justify-center gap-4 text-sm mb-4">
              <Link href="/" className="text-slate-400 hover:text-sky-400 transition-colors">Home</Link>
              <Link href="/movies" className="text-slate-400 hover:text-sky-400 transition-colors">Movies</Link>
              <Link href="/genres" className="text-slate-400 hover:text-sky-400 transition-colors">Genres</Link>
              <Link href="/add" className="text-slate-400 hover:text-sky-400 transition-colors">Add Song</Link>
            </div>
            {/* Branding + copyright */}
            <p className="text-center text-xs text-slate-600">
              ♪ Telugu Lyrics Vault &middot; Made with <span className="text-red-400">♥</span>  for Telugu lyrics &amp; music
            </p>
            <p className="text-center text-xs text-slate-700 mt-1">
              &copy; {new Date().getFullYear()} &middot; Built with Next.js &amp; Supabase
            </p>
          </div>
        </footer>
        <Toaster position="bottom-center" richColors closeButton />
      </body>
    </html>
  );
}
