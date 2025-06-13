import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { GameProvider } from "@/contexts/GameContext"
import { NotificationProvider } from "@/contexts/NotificationContext"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin", "cyrillic"] })

export const metadata: Metadata = {
  title: {
    default: "MaxQuiz - Интерактивные викторины",
    template: "%s | MaxQuiz",
  },
  description:
    "Создавайте и проводите интерактивные викторины в реальном времени. Поддержка мультиплеера, аналитика, достижения и многое другое.",
  keywords: ["викторина", "квиз", "игра", "образование", "интерактив", "мультиплеер"],
  authors: [{ name: "MaxQuiz Team" }],
  creator: "MaxQuiz",
  publisher: "MaxQuiz",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    title: "MaxQuiz - Интерактивные викторины",
    description: "Создавайте и проводите интерактивные викторины в реальном времени",
    siteName: "MaxQuiz",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MaxQuiz - Интерактивные викторины",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MaxQuiz - Интерактивные викторины",
    description: "Создавайте и проводите интерактивные викторины в реальном времени",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MaxQuiz",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "MaxQuiz",
    "application-name": "MaxQuiz",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#3b82f6",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MaxQuiz" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <GameProvider>
              <NotificationProvider>
                <div className="min-h-screen bg-background text-foreground">{children}</div>
                <Toaster />
              </NotificationProvider>
            </GameProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
