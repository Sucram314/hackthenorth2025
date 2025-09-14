import { Geist, Geist_Mono, Roboto_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/theme/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-press-start",
});

export const metadata = {
  title: "ToothRush",
  description: "A game about brushing your teeth",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${robotoMono.variable} ${pressStart.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
