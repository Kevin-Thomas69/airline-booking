import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dairy Flat Airline — Online Booking",
  description: "Search flights, make a booking, and manage your trips.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
        <header className="border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/40">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              Dairy Flat Airline
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-700 dark:text-zinc-200">
              <Link href="/search" className="hover:text-zinc-950 dark:hover:text-white">
                Search flights
              </Link>
              <Link href="/trips" className="hover:text-zinc-950 dark:hover:text-white">
                My trips
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/5 bg-white dark:border-white/10 dark:bg-black">
          <div className="mx-auto w-full max-w-5xl px-5 py-6 text-xs text-zinc-600 dark:text-zinc-400">
            All times shown in local time at the departure/arrival airport.
          </div>
        </footer>
      </body>
    </html>
  );
}
