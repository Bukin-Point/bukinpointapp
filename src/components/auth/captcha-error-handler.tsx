'use client'

import { useEffect } from 'react'

/**
 * Client component to handle CAPTCHA errors gracefully
 * Hides or minimizes CAPTCHA error messages if they appear
 */
export function CaptchaErrorHandler() {
  useEffect(() => {
    // Wait for Clerk to render
    const checkForCaptchaError = () => {
      // Look for CAPTCHA error elements and make them less prominent
      const errorElements = document.querySelectorAll(
        '[data-testid*="captcha"], [class*="captcha"][class*="error"], .cl-captcha-error'
      )
      
      errorElements.forEach((element) => {
        const htmlElement = element as HTMLElement
        // Check if it contains the CAPTCHA error message
        if (htmlElement.textContent?.includes('CAPTCHA failed to load')) {
          // Make it less prominent but still visible
          htmlElement.style.opacity = '0.7'
          htmlElement.style.fontSize = '0.875rem'
        }
      })
    }

    // Check immediately and then periodically
    checkForCaptchaError()
    const interval = setInterval(checkForCaptchaError, 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}
