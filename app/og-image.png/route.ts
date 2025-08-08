import { NextResponse } from 'next/server'

export async function GET() {
  // Create a simple 1200x630 Open Graph image using SVG
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      
      <!-- Icon -->
      <circle cx="300" cy="315" r="80" fill="white" opacity="0.9"/>
      <rect x="250" y="380" width="100" height="20" rx="10" fill="white" opacity="0.9"/>
      <rect x="260" y="410" width="80" height="16" rx="8" fill="white" opacity="0.7"/>
      <rect x="270" y="435" width="60" height="16" rx="8" fill="white" opacity="0.7"/>
      
      <!-- Title -->
      <text x="500" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white">MuscleGram</text>
      <text x="500" y="340" font-family="Arial, sans-serif" font-size="36" fill="white" opacity="0.9">筋トレ記録SNS</text>
      
      <!-- Description -->
      <text x="500" y="410" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.8">トレーニング管理・分析アプリ</text>
      <text x="500" y="450" font-family="Arial, sans-serif" font-size="20" fill="white" opacity="0.7">記録・分析・SNSで筋トレライフをサポート</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}