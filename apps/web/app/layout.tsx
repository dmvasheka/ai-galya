import "./globals.css";
import React from "react";

export const metadata = { title: "Numerology Forecast" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
