import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Directly send test email bypassing dev redirect
    const resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null

    if (!resend) {
      return NextResponse.json(
        {
          success: false,
          error: 'RESEND_API_KEY not configured',
        },
        { status: 500 }
      )
    }

    const fromAddress =
      process.env.RESEND_BOOKINGS_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      'BukinPoint <bookings@bukinpoint.com>'

    // Test booking confirmation email - send directly to requested email
    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Test Booking Email - BukinPoint',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #006D77; margin: 0; font-size: 24px;">BukinPoint</h1>
              </div>
              
              <h2 style="color: #333; font-size: 20px; margin-top: 0;">Test Booking Email</h2>
              
              <p style="color: #666; font-size: 16px;">
                This is a test email to verify that Resend can send emails to ${email}.
              </p>
              
              <p style="color: #666; font-size: 16px;">
                If you received this email, it means Resend is working correctly and can send to your email address.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; font-size: 18px; margin-top: 0;">Test Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Recipient:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">From:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${fromAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Status:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #10b981;">Success</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                This is a test email sent from the BukinPoint booking system.
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.message || 'Failed to send email',
          details: {
            configured: !!process.env.RESEND_API_KEY,
            fromEmail: fromAddress,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: `Test booking email sent successfully to ${email}`,
        details: {
          from: fromAddress,
          to: email,
          bookingRef: 'TEST-12345',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          configured: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_BOOKINGS_EMAIL || process.env.RESEND_FROM_EMAIL || 'BukinPoint <bookings@bukinpoint.com>',
        },
      },
      { status: 500 }
    )
  }
}
