'use client'

import imageCompression from 'browser-image-compression'

/**
 * Optimize image on client-side before upload
 * Reduces file size while maintaining quality
 */
export async function optimizeImage(
  file: File,
  maxSizeMB: number = 2
): Promise<File> {
  const options = {
    maxSizeMB,
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true,
    fileType: file.type,
    initialQuality: 0.8, // 80% quality
    alwaysKeepResolution: false,
  }

  try {
    const compressedFile = await imageCompression(file, options)
    // browser-image-compression returns a File/Blob, but might change the filename
    // Ensure we preserve the original filename and extension
    const originalName = file.name
    const originalType = file.type
    
    // If compressedFile is already a File with the same name, return it
    if (compressedFile instanceof File && compressedFile.name === originalName) {
      return compressedFile
    }
    
    // Otherwise, create a new File with the original name
    const blob = compressedFile instanceof Blob 
      ? compressedFile 
      : new Blob([compressedFile], { type: originalType })
    
    return new File([blob], originalName, { type: originalType })
  } catch (error) {
    console.error('Image compression failed:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Validate file before upload (client-side)
 */
export function validateImageFileClient(file: File): {
  valid: boolean
  error?: string
} {
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.',
    }
  }

  // Check file size (before compression)
  if (file.size > MAX_FILE_SIZE * 2) {
    // Allow files up to 4MB before compression (will be compressed to 2MB)
    return {
      valid: false,
      error: 'File is too large. Please upload an image smaller than 4MB.',
    }
  }

  return { valid: true }
}
