import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs' // Use Node.js runtime for Prisma

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const subdomain = searchParams.get('subdomain')

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 })
  }

  try {
    const provider = await prisma.provider.findUnique({
      where: { subdomain },
      select: {
        id: true,
        status: true,
      },
    })

    if (!provider) {
      return NextResponse.json({ provider: null })
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Error looking up subdomain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
