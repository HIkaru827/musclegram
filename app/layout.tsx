import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MuscleGram - 筋トレ記録SNS | トレーニング管理・分析アプリ",
  description: "筋トレ記録、分析、SNS機能が充実したフィットネスアプリ。重量向上を可視化し、トレーニング仲間と記録を共有。目標設定から進捗管理まで、あなたの筋トレライフをサポートします。",
  keywords: [
    "筋トレ", "トレーニング", "記録", "SNS", "フィットネス", "重量管理", "分析", 
    "目標設定", "進捗管理", "ワークアウト", "ベンチプレス", "スクワット", "デッドリフト",
    "ジム", "筋肉", "ボディビル", "筋力向上", "トレーニング日記", "fitness", "workout"
  ],
  authors: [{ name: "MuscleGram Team" }],
  creator: "MuscleGram",
  publisher: "MuscleGram",
  category: "健康・フィットネス",
  classification: "フィットネスアプリ",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://musclegram.app',
    siteName: 'MuscleGram',
    title: 'MuscleGram - 筋トレ記録SNS | トレーニング管理・分析アプリ',
    description: '筋トレ記録、分析、SNS機能が充実したフィットネスアプリ。重量向上を可視化し、トレーニング仲間と記録を共有。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MuscleGram - 筋トレ記録SNS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@musclegram_app',
    creator: '@musclegram_app',
    title: 'MuscleGram - 筋トレ記録SNS',
    description: '筋トレ記録、分析、SNS機能が充実したフィットネスアプリ',
    images: ['/twitter-image.png'],
  },
  alternates: {
    canonical: 'https://musclegram.app',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'theme-color': '#dc2626',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* プリロード重要リソース */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "MuscleGram",
              "description": "筋トレ記録、分析、SNS機能が充実したフィットネスアプリ",
              "url": "https://musclegram.app",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "JPY"
              },
              "author": {
                "@type": "Organization",
                "name": "MuscleGram Team"
              },
              "featureList": [
                "筋トレ記録管理",
                "重量向上分析",
                "トレーニングボリューム計算",
                "目標設定・進捗管理",
                "SNS機能",
                "五角形レーダーチャート",
                "カレンダー表示"
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
