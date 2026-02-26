import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// Inter — limpio, moderno, perfecto para UI profesional
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

// Playfair Display — elegante para títulos, no estirada
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MultiTravel Cherry Matute",
  description: "Sistema interno de gestión de agencia de viajes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable}`}
        style={{ fontFamily: "var(--font-inter), sans-serif", margin: 0, padding: 0 }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "inherit",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
            },
            classNames: {
              success: "toast-success",
              error: "toast-error",
              warning: "toast-warning",
              info: "toast-info",
            },
          }}
        />
      </body>
    </html>
  );
}
