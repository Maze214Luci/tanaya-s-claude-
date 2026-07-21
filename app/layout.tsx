import type { Metadata } from "next";
import { Fraunces, Lora, Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ToastHost } from "@/components/ToastHost";
import { WatercolorDefs } from "@/components/Watercolor";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Kitchen Kanvas",
  description: "A quiet, well-kept kitchen — shared meal planning, pantry, and prep for the whole household.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${lora.variable} ${inter.variable}`}>
      <body className="min-h-full">
        <WatercolorDefs />
        <StoreProvider>
          {children}
          <ToastHost />
        </StoreProvider>
      </body>
    </html>
  );
}
