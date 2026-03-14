import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, string> = {}

  // 1. Check environment variables
  checks['DATABASE_URL'] = process.env.DATABASE_URL ? '✅ Set' : '❌ MISSING'
  checks['CLERK_SECRET_KEY'] = process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ MISSING'
  checks['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ MISSING'
  checks['NODE_ENV'] = process.env.NODE_ENV || 'not set'

  // 2. Test database connection
  try {
    const { prisma } = await import('@/lib/db')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    checks['DB_CONNECTION'] = '✅ Connected'
  } catch (error: any) {
    checks['DB_CONNECTION'] = `❌ Failed: ${error.message?.slice(0, 200)}`
  }

  // 3. Test Clerk auth
  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    checks['CLERK_AUTH'] = userId ? `✅ User: ${userId}` : '⚠️ No user (not logged in)'
  } catch (error: any) {
    checks['CLERK_AUTH'] = `❌ Failed: ${error.message?.slice(0, 200)}`
  }

  // 4. Test getSession
  try {
    const { getSession } = await import('@/lib/auth-helpers-clerk')
    const session = await getSession()
    checks['GET_SESSION'] = session ? `✅ User: ${session.user.id}` : '⚠️ No session'
  } catch (error: any) {
    checks['GET_SESSION'] = `❌ Failed: ${error.message?.slice(0, 200)}`
  }

  return NextResponse.json({
    status: 'health check',
    timestamp: new Date().toISOString(),
    checks,
  })
}
