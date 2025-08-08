import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const width = searchParams.get('width') || '80'
  const height = searchParams.get('height') || '80'
  
  // Simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="placeholder-svg">
      <title id="placeholder-svg">Placeholder</title>
      <rect width="100%" height="100%" fill="#dc2626"/>
      <text x="50%" y="50%" font-family="monospace" font-size="14" fill="white" text-anchor="middle" dy=".3em">
        ${width}×${height}
      </text>
    </svg>
  `
  
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}