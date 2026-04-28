import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SamaajSetu — Community Needs, Smart Volunteer Matching",
  description:
    "Aggregate scattered community-need data and intelligently match volunteers to where they are needed most.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
