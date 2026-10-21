import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodBridge | Surplus Food Redistribution",
  description: "Turning Surplus into Sustenance. The intelligent platform connecting surplus food providers with verified NGOs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e2e8f0',
              color: '#1e293b',
            },
            classNames: {
              toast: 'rounded-xl shadow-lg font-sans',
              success: 'bg-green-50 border-green-200 text-green-800',
              error: 'bg-red-50 border-red-200 text-red-800',
              warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
              info: 'bg-blue-50 border-blue-200 text-blue-800',
            }
          }}
        />
      </body>
    </html>
  );
}
