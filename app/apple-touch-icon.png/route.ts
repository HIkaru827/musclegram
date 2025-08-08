import { NextResponse } from 'next/server'

export async function GET() {
  // Create a simple 180x180 Apple touch icon using SVG
  const svg = `
    <svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="180" height="180" fill="#dc2626" rx="32"/>
      <circle cx="90" cy="70" r="22" fill="white" opacity="0.9"/>
      <rect x="68" y="98" width="44" height="8" rx="4" fill="white" opacity="0.9"/>
      <rect x="73" y="110" width="34" height="6" rx="3" fill="white" opacity="0.7"/>
      <rect x="78" y="120" width="24" height="6" rx="3" fill="white" opacity="0.7"/>
      <text x="90" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">MG</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}