import type React from "react"
import type { Metadata } from "next"
import { Cinzel, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { ParticleBackground } from "@/components/particle-background"
import { LanguageProvider } from "@/components/language-provider"

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Cambrilio | 3,333 degen PFPs",
  description: "Enter the world of Cambrilio - 3,333 unique NFT characters on Base. A Community project.",
  keywords: ["Cambrilio", "NFT", "Base", "Cambria", "RPG", "Collection"],
  openGraph: {
    title: "Cambrilio | A Community Project",
    description: "Enter the world of Cambrilio - 3,333 unique NFT characters on Base.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
    generator: ''
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <ParticleBackground />
          <Navigation />
          <main className="relative z-10">{children}</main>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
