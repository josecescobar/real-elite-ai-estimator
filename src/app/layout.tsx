import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Nav from "./Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Real Elite AI Estimator",
  description: "Professional construction estimating tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 text-gray-900`}>
        <SessionProvider>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
