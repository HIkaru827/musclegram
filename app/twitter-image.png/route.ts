import { NextResponse } from 'next/server'

export async function GET() {
  // Create a simple 1200x600 Twitter card image using SVG
  const svg = `
    <svg width="1200" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" fill="url(#bg)"/>
      
      <!-- Icon -->
      <circle cx="300" cy="300" r="70" fill="white" opacity="0.9"/>
      <rect x="255" y="355" width="90" height="18" rx="9" fill="white" opacity="0.9"/>
      <rect x="265" y="380" width="70" height="14" rx="7" fill="white" opacity="0.7"/>
      
      <!-- Title -->
      <text x="500" y="260" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white">MuscleGram</text>
      <text x="500" y="320" font-family="Arial, sans-serif" font-size="32" fill="white" opacity="0.9">筋トレ記録SNS</text>
      
      <!-- Description -->
      <text x="500" y="380" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.8">トレーニング管理・分析アプリ</text>
      <text x="500" y="420" font-family="Arial, sans-serif" font-size="18" fill="white" opacity="0.7">記録・分析・SNSで筋トレライフをサポート</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}