import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const subdomain = searchParams.get('subdomain')

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 })
  }

  try {
    const provider = await prisma.provider.findUnique({
      where: { subdomain },
      select: { id: true, status: true },
    })

    if (!provider || provider.status !== 'ACTIVE') {
      return NextResponse.json({ provider: null })
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Error looking up subdomain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
