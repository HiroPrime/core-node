import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Charlie · Jacob · BasicHiro",
  description: "Non-binary solo developer. Vibe coding with Cursor. Local Comfy.",
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
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
