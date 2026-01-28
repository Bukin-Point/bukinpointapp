'use server'

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client for Cloudflare R2
const getR2Client = () => {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing Cloudflare R2 configuration. Please check your environment variables.')
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

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB in bytes

/**
 * Validate file type and size
 */
export async function validateImageFile(fileName: string, fileType: string, fileSize: number): Promise<{
  valid: boolean
  error?: string
}> {
  // Check file type
  if (!ALLOWED_TYPES.includes(fileType.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  // Check file extension (handle cases where extension might be missing or uppercase)
  const fileNameLower = fileName.toLowerCase()
  const lastDotIndex = fileNameLower.lastIndexOf('.')
  const extension = lastDotIndex > 0 ? fileNameLower.substring(lastDotIndex) : ''
  
  // If no extension found, try to infer from MIME type
  if (!extension) {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    }
    const inferredExt = mimeToExt[fileType.toLowerCase()]
    if (inferredExt && ALLOWED_EXTENSIONS.includes(inferredExt)) {
      // Extension inferred from MIME type is valid, allow it
    } else {
      return {
        valid: false,
        error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      }
    }
  } else if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}

/**
 * Generate presigned URL for uploading image to R2
 */
export async function generatePresignedUploadUrl(
  providerId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  serviceId?: string
): Promise<{
  success: boolean
  presignedUrl?: string
  publicUrl?: string
  error?: string
}> {
  try {
    // Validate file
    const validation = await validateImageFile(fileName, fileType, fileSize)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

    if (!bucketName || !publicUrl) {
      return {
        success: false,
        error: 'R2 configuration missing. Please check environment variables.',
      }
    }

    // Generate structured path
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    const timestamp = Date.now()
    const sanitizedFileName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .substring(0, 50) // Limit filename length
      .replace(extension, '') || 'image'

    let objectKey: string
    if (serviceId) {
      // Service image: providers/{providerId}/services/{serviceId}-{timestamp}.{ext}
      objectKey = `providers/${providerId}/services/${serviceId}-${timestamp}${extension}`
    } else {
      // Generic upload: providers/{providerId}/uploads/{timestamp}-{filename}.{ext}
      objectKey = `providers/${providerId}/uploads/${timestamp}-${sanitizedFileName}${extension}`
    }

    const client = getR2Client()

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: fileType,
      // Cache control for public images
      CacheControl: 'public, max-age=31536000, immutable',
    })

    // Generate presigned URL (valid for 5 minutes)
    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 })

    // Construct public URL
    const finalPublicUrl = `${publicUrl}/${objectKey}`

    return {
      success: true,
      presignedUrl,
      publicUrl: finalPublicUrl,
    }
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate upload URL',
    }
  }
}

/**
 * Delete image from R2
 */
export async function deleteImage(imageUrl: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL

    if (!bucketName || !publicUrl) {
      return {
        success: false,
        error: 'R2 configuration missing. Please check environment variables.',
      }
    }

    // Extract object key from URL
    // URL format: https://pub-xxxxx.r2.dev/providers/{providerId}/services/{filename}
    if (!imageUrl.startsWith(publicUrl)) {
      // Not an R2 URL, skip deletion (might be external URL)
      return { success: true }
    }

    const objectKey = imageUrl.replace(`${publicUrl}/`, '')

    const client = getR2Client()

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })

    await client.send(command)

    return { success: true }
  } catch (error) {
    console.error('Error deleting image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    }
  }
}

/**
 * Extract object key from R2 URL
 */
export async function extractObjectKeyFromUrl(imageUrl: string): Promise<string | null> {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
  if (!publicUrl || !imageUrl.startsWith(publicUrl)) {
    return null
  }
  return imageUrl.replace(`${publicUrl}/`, '')
}
