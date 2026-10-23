// Root layout for every localized route: loads the Archivo face, sets the document language and renders the app shell.

import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

import { AppHeader } from "@/components/AppHeader";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

import "../globals.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// Matches the mobile browser chrome to the graphite top bar.
export const viewport: Viewport = { themeColor: "#1c1b19" };

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary();
  return { title: dictionary.meta.title, description: dictionary.meta.description };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dictionary = await getDictionary();

  return (
    <html lang={locale} className={archivo.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
        >
          {dictionary.shell.skipToContent}
        </a>
        <AppHeader locale={locale} labels={dictionary.shell} />
        {children}
      </body>
    </html>
  );
}
