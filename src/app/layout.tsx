import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/toaster";
import { QueryProvider } from "@/providers/query-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BukinPoint - Booking Platform",
  description: "Modern booking platform for service providers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={poppins.variable}>
        <body className="antialiased">
          <QueryProvider>
            <ErrorBoundary>
              {children}
              <Toaster />
            </ErrorBoundary>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
