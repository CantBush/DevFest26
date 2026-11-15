import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { MapsProvider } from "@/components/maps/MapsProvider";
import { AppStateProvider } from "@/components/state/AppState";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movingly",
  description: "A personalized moving checklist.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f5f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppStateProvider>
          <MapsProvider>{children}</MapsProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
