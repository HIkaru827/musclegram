import { NextResponse } from 'next/server'

export async function GET() {
  // Create a simple 192x192 icon using SVG
  const svg = `
    <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
      <rect width="192" height="192" fill="#dc2626" rx="24"/>
      <circle cx="96" cy="80" r="25" fill="white" opacity="0.9"/>
      <rect x="71" y="105" width="50" height="8" rx="4" fill="white" opacity="0.9"/>
      <rect x="76" y="118" width="40" height="6" rx="3" fill="white" opacity="0.7"/>
      <rect x="81" y="129" width="30" height="6" rx="3" fill="white" opacity="0.7"/>
      <text x="96" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">MG</text>
    </svg>
  `

  // Convert SVG to a simple PNG-like response
  // For now, we'll return SVG with PNG content type for compatibility
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}