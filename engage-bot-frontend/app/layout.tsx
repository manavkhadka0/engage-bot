import { DM_Sans, Geist_Mono, Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/providers";
import "./globals.css";

// Display: DM Sans Light — the source design system's own documented
// fallback for PP Radio Grotesk Light (a paid Pangram Pangram font we
// don't have a license for). Weight 300 to keep the "handwritten on
// paper" light-grotesque feel at large headline sizes.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  // 500 covers the source system's "heading-sm" step (24px/500) — its
  // scale isn't uniformly 400, only 600+ is the documented DON'T.
  weight: ["300", "400", "500"],
});

// Body + nav — this one's the real thing, not a substitute.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Engage Bot",
    template: "%s · Engage Bot",
  },
  description:
    "Shelf robots that sense shoppers, play the right line, and prove what happened — by Baliyo Ventures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
