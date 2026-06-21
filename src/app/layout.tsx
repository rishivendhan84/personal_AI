import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Aurora } from "@/components/ui/aurora";
import { CommandPalette } from "@/components/command-palette";

// Editorial serif — used only for the Operator greeting headline.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rishi's Personal Assistant",
  description: "Capture everything, file it automatically, and direct your day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="grain relative min-h-screen antialiased">
        <ThemeProvider>
          {/* Single, very subtle app-wide background effect (behind everything). */}
          <Aurora />
          <div className="relative z-10">
            <Nav />
            <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
              {children}
            </main>
          </div>
          {/* ⌘K command palette — also the Brain search entry point. */}
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
