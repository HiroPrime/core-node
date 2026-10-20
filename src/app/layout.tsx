import type { Metadata, Viewport } from "next";
import { Outfit, Nunito, Press_Start_2P } from "next/font/google";
import { Chrome } from "@/components/Chrome";
import "./globals.css";
import "./arcade.css";

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800"],
});

const body = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700"],
});

/** The console voice. Menus, labels, status text — anything the machine says. */
const pixel = Press_Start_2P({
  subsets: ["latin"],
  variable: "--font-pixel",
  weight: ["400"],
  display: "swap",
});

const SITE_DESCRIPTION =
  "BasicHiro — a non-binary solo developer and AI vibe coder. Product designer first, developer second.";

export const metadata: Metadata = {
  metadataBase: new URL("https://corenode.nexus"),
  title: {
    default: "BasicHiro — Core Node",
    template: "%s — BasicHiro",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Core Node",
  authors: [{ name: "BasicHiro", url: "https://corenode.nexus" }],
  creator: "BasicHiro",
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "Core Node",
    url: "./",
    locale: "en_US",
    title: "BasicHiro — Core Node",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    site: "@basic_hiro",
    creator: "@basic_hiro",
    title: "BasicHiro — Core Node",
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07060f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${pixel.variable}`}>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
