import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Bika — платформа заказов",
    template: "%s · Bika",
  },
  description:
    "B2B платформа заказов: магазины и HoReCa заказывают напрямую у дистрибьюторов",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#147a52",
};

// Runs before paint so the stored theme applies without a flash of the
// wrong palette. Kept inline (not a module) so it executes synchronously.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("bika_theme");
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${jakarta.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-bg-2 text-text">{children}</body>
    </html>
  );
}
