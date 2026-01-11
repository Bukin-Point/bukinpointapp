import { NextResponse } from 'next/server'
import { sendStaffInvitationEmail } from '@/lib/email'

export async function GET() {
  try {
    // Get test email from query params or use a default
    const testEmail = process.env.TEST_EMAIL || 'test@example.com'
    const businessName = 'Test Business'
    const role = 'STAFF' as const
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup/staff?token=test-token-123`

    const result = await sendStaffInvitationEmail({
      email: testEmail,
      businessName,
      role,
      invitationUrl,
    })

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: `Test email sent successfully to ${testEmail}`,
          details: {
            from: process.env.RESEND_FROM_EMAIL || 'BukinPoint <onboarding@resend.dev>',
            to: testEmail,
            businessName,
            role,
          },
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
          details: {
            configured: !!process.env.RESEND_API_KEY,
            fromEmail: process.env.RESEND_FROM_EMAIL || 'BukinPoint <onboarding@resend.dev>',
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          configured: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'BukinPoint <onboarding@resend.dev>',
        },
      },
      { status: 500 }
    )
  }
}

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

    const businessName = 'Test Business'
    const role = 'STAFF' as const
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup/staff?token=test-token-123`

    const result = await sendStaffInvitationEmail({
      email,
      businessName,
      role,
      invitationUrl,
    })

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: `Test email sent successfully to ${email}`,
          details: {
            from: process.env.RESEND_FROM_EMAIL || 'BukinPoint <onboarding@resend.dev>',
            to: email,
            businessName,
            role,
          },
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
          details: {
            configured: !!process.env.RESEND_API_KEY,
            fromEmail: process.env.RESEND_FROM_EMAIL || 'BukinPoint <onboarding@resend.dev>',
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          configured: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'BukinPoint <onboarding@resend.dev>',
        },
      },
      { status: 500 }
    )
  }
}
