import { JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Tokinomo",
    template: "%s · Tokinomo",
  },
  description:
    "Fleet console for Tokinomo shelf-advertising robots — detect, play, report.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="terminal"
      className={`${jetbrains.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-mono antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
