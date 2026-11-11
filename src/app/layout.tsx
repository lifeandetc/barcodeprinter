import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Life & Etc.",
  description: "Barcode, label, and inventory workspace for Life & Etc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" toastOptions={{ style: { background: "#fffcf8", color: "#141414", border: "1px solid #e4ded4" } }} />
      </body>
    </html>
  );
}
