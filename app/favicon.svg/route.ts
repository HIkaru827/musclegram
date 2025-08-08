import { NextResponse } from 'next/server'

export async function GET() {
  // Create a simple SVG favicon
  const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <rect width="32" height="32" fill="#dc2626" rx="4"/>
      <circle cx="16" cy="12" r="4" fill="white" opacity="0.9"/>
      <rect x="12" y="17" width="8" height="2" rx="1" fill="white" opacity="0.9"/>
      <rect x="13" y="20" width="6" height="1" rx="0.5" fill="white" opacity="0.7"/>
      <text x="16" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="white">M</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}