import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "PAIOS — Personal AI Operating System",
  description: "Capture everything, file it automatically, and direct your day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1120",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
