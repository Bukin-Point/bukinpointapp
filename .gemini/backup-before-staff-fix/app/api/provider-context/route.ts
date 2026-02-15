import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getUserProviders } from '@/actions/provider-context'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Validate userId matches session
    if (!userId || userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 403 }
      )
    }

    const result = await getUserProviders(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      providers: result.providers,
    })
  } catch (error) {
    console.error('Error in provider-context API route:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
