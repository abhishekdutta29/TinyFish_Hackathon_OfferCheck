import type { Metadata } from "next";
import "./globals.css";
import { ChromaHalo } from "@/components/ui/chroma-halo";

export const metadata: Metadata = {
  title: "OfferCheck — Verify Job & Internship Offers",
  description: "Detect fake job offers, recruitment scams, and upfront fee demands in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans relative overflow-x-hidden">
        {/* React Bits Pro - Chroma Halo: Soft blooming ink effect adapted to background color */}
        <ChromaHalo
          adaptive={true}
          maxRadius={96}
          initialRadius={26}
          decay={0.016}
          maxOpacity={0.65}
        />
        {children}
      </body>
    </html>
  );
}
