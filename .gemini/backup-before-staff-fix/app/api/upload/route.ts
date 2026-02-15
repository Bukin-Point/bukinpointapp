import { NextRequest, NextResponse } from 'next/server'
import { validateImageFile } from '@/lib/upload'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client for Cloudflare R2
const getR2Client = () => {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Cloudflare R2 configuration')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const providerId = formData.get('providerId') as string
    const serviceId = formData.get('serviceId') as string | null

    if (!file || !providerId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, providerId' },
        { status: 400 }
      )
    }

    // Verify user has access to this provider
    const accessContext = await getProviderAccess(session.user.id, providerId)
    if (!accessContext) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate file type and size
    const validation = await validateImageFile(file.name, file.type, file.size)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate object key (same logic as generatePresignedUploadUrl)
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

    if (!bucketName || !publicUrl) {
      return NextResponse.json(
        { error: 'R2 configuration missing' },
        { status: 500 }
      )
    }

    // Generate object key with proper extension handling
    const fileNameLower = file.name.toLowerCase()
    const lastDotIndex = fileNameLower.lastIndexOf('.')
    const extension = lastDotIndex > 0 ? fileNameLower.substring(lastDotIndex) : '.jpg'
    const timestamp = Date.now()
    const sanitizedFileName = fileNameLower
      .replace(/[^a-z0-9.-]/g, '-')
      .substring(0, 50)
      .replace(extension, '') || 'image'

    let objectKey: string
    if (serviceId) {
      objectKey = `providers/${providerId}/services/${serviceId}-${timestamp}${extension}`
    } else {
      objectKey = `providers/${providerId}/uploads/${timestamp}-${sanitizedFileName}${extension}`
    }

    const client = getR2Client()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    const finalPublicUrl = `${publicUrl}/${objectKey}`

    return NextResponse.json({
      success: true,
      publicUrl: finalPublicUrl,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
