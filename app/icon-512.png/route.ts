import { NextResponse } from 'next/server'

export async function GET() {
  // Create a simple 512x512 icon using SVG
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#dc2626" rx="64"/>
      <circle cx="256" cy="200" r="60" fill="white" opacity="0.9"/>
      <rect x="196" y="280" width="120" height="20" rx="10" fill="white" opacity="0.9"/>
      <rect x="206" y="310" width="100" height="16" rx="8" fill="white" opacity="0.7"/>
      <rect x="216" y="335" width="80" height="16" rx="8" fill="white" opacity="0.7"/>
      <text x="256" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">MG</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}