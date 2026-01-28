import { getSession } from '@/lib/auth-helpers-clerk'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
