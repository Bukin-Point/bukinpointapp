import { NextRequest, NextResponse } from 'next/server'
import { generatePresignedUploadUrl } from '@/lib/upload'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { providerId, fileName, fileType, fileSize, serviceId } = body

    // Validate required fields
    if (!providerId || !fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, fileName, fileType, fileSize' },
        { status: 400 }
      )
    }

    // Verify user has access to this provider
    const accessContext = await getProviderAccess(session.user.id, providerId)
    if (!accessContext) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate presigned URL
    const result = await generatePresignedUploadUrl(
      providerId,
      fileName,
      fileType,
      fileSize,
      serviceId
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      presignedUrl: result.presignedUrl,
      publicUrl: result.publicUrl,
    })
  } catch (error) {
    console.error('Error in presigned URL route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
