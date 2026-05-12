import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Combo Prototype",
  description: "V-OTA Stay + Play Prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">{children}</body>
    </html>
  );
}
