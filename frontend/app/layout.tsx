import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Navigation } from "@/components/ui/Navigation";

export const metadata: Metadata = {
  title: "StockSage — AI Stock Analyzer",
  description: "Agentic AI-powered stock analysis for Indian markets",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Navigation />
        <main className="min-h-screen">{children}</main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(220 18% 10%)",
              color: "hsl(220 15% 92%)",
              border: "1px solid hsl(220 15% 16%)",
            },
          }}
        />
      </body>
    </html>
  );
}
