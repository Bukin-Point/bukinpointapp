import { Resend } from 'resend'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface StaffInvitationEmailData {
  email: string
  businessName: string
  role: 'OWNER' | 'STAFF'
  invitationUrl: string
}

export interface BookingConfirmationEmailData {
  customerEmail: string
  customerName: string
  bookingRef: string
  serviceName: string
  providerBusinessName: string
  bookingDate: Date
  startTime: string
  endTime: string
  staffName: string | null
  price: number
  providerPhone?: string
}

export interface ProviderBookingNotificationEmailData {
  providerEmail: string
  providerBusinessName: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  bookingRef: string
  serviceName: string
  bookingDate: Date
  startTime: string
  endTime: string
  staffName: string | null
  price: number
  bookingUrl: string
}

export interface BookingStatusUpdateEmailData {
  customerEmail: string
  customerName: string
  bookingRef: string
  serviceName: string
  providerBusinessName: string
  bookingDate: Date
  startTime: string
  endTime: string
  newStatus: string
  previousStatus: string
}

export async function sendStaffInvitationEmail(
  data: StaffInvitationEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    console.log('Invitation URL:', data.invitationUrl)
    return { success: false, error: 'Email service not configured' }
  }

  // Use onboarding email address for staff invitations
  const fromAddress =
    process.env.RESEND_ONBOARDING_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'BukinPoint <onboarding@bukinpoint.com>'

  // Allow bypassing dev email redirect with ALLOW_REAL_EMAILS env var
  const allowRealEmails = process.env.ALLOW_REAL_EMAILS === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'
  const devEmail = process.env.DEV_EMAIL || 'sholajapheth@gmail.com'
  const recipientEmail = isDevelopment && !allowRealEmails ? devEmail : data.email

  try {
    const roleText = data.role === 'OWNER' ? 'an Owner' : 'Staff'

    const result = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject: `You've been invited to join ${data.businessName} on BukinPoint`,
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
              
              <h2 style="color: #333; font-size: 20px; margin-top: 0;">You've been invited!</h2>
              
              <p style="color: #666; font-size: 16px;">
                <strong>${
                  data.businessName
                }</strong> has invited you to join their team as ${roleText}.
              </p>
              ${
                isDevelopment && !allowRealEmails
                  ? `<p style="color: #ff6b6b; font-size: 14px; background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0;">
                <strong>Development Mode:</strong> This email was sent to you for testing. The actual invitation was intended for: <strong>${data.email}</strong>
              </p>`
                  : ''
              }
              <p style="color: #666; font-size: 16px;">
                Click the button below to accept the invitation and create your account:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invitationUrl}" 
                   style="display: inline-block; padding: 14px 28px; background-color: #006D77; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <strong>Important:</strong> This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${data.invitationUrl}" style="color: #006D77; word-break: break-all;">${
        data.invitationUrl
      }</a>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>This email was sent by BukinPoint</p>
            </div>
          </body>
        </html>
      `,
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      return { success: false, error: result.error.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending staff invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendBookingConfirmationEmail(
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  // Use bookings email address for booking-related emails
  const fromAddress =
    process.env.RESEND_BOOKINGS_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'BukinPoint <bookings@bukinpoint.com>'

  // Allow bypassing dev email redirect with ALLOW_REAL_EMAILS env var
  const allowRealEmails = process.env.ALLOW_REAL_EMAILS === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'
  const devEmail = process.env.DEV_EMAIL || 'sholajapheth@gmail.com'
  const recipientEmail = isDevelopment && !allowRealEmails ? devEmail : data.customerEmail

  try {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const result = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject: `Your booking is confirmed - ${data.bookingRef}`,
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
              
              <h2 style="color: #333; font-size: 20px; margin-top: 0;">Booking Confirmed!</h2>
              
              <p style="color: #666; font-size: 16px;">
                Hi ${data.customerName},
              </p>
              
              <p style="color: #666; font-size: 16px;">
                Your booking has been received and is pending confirmation from ${
                  data.providerBusinessName
                }.
              </p>
              
              ${
                isDevelopment && !allowRealEmails
                  ? `<p style="color: #ff6b6b; font-size: 14px; background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0;">
                <strong>Development Mode:</strong> This email was sent to you for testing. The actual email was intended for: <strong>${data.customerEmail}</strong>
              </p>`
                  : ''
              }
              
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; font-size: 18px; margin-top: 0;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Booking Reference:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.bookingRef
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Service:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.serviceName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Provider:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.providerBusinessName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Time:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.startTime
                    } - ${data.endTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Staff:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.staffName || 'Not assigned'
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Price:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">₦${Number(
                      data.price
                    ).toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666; font-size: 16px;">
                <strong>What's next?</strong> The provider will review your booking and confirm it shortly. You'll receive another email once your booking is confirmed.
              </p>
              
              ${
                data.providerPhone
                  ? `<p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you have any questions, you can contact ${data.providerBusinessName} at ${data.providerPhone}.
              </p>`
                  : ''
              }
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                This is an automated confirmation. Please keep this email for your records.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>This email was sent by BukinPoint</p>
            </div>
          </body>
        </html>
      `,
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      return { success: false, error: result.error.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending booking confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendProviderBookingNotificationEmail(
  data: ProviderBookingNotificationEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  // Use bookings email address for booking-related emails
  const fromAddress =
    process.env.RESEND_BOOKINGS_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'BukinPoint <bookings@bukinpoint.com>'

  // Allow bypassing dev email redirect with ALLOW_REAL_EMAILS env var
  const allowRealEmails = process.env.ALLOW_REAL_EMAILS === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'
  const devEmail = process.env.DEV_EMAIL || 'sholajapheth@gmail.com'
  const recipientEmail = isDevelopment && !allowRealEmails ? devEmail : data.providerEmail

  try {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const result = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject: `New Booking Received - ${data.bookingRef}`,
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
              
              <h2 style="color: #333; font-size: 20px; margin-top: 0;">New Booking Received!</h2>
              
              <p style="color: #666; font-size: 16px;">
                Hi ${data.providerBusinessName},
              </p>
              
              <p style="color: #666; font-size: 16px;">
                You have received a new booking request that requires your attention.
              </p>
              
              ${
                isDevelopment && !allowRealEmails
                  ? `<p style="color: #ff6b6b; font-size: 14px; background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0;">
                <strong>Development Mode:</strong> This email was sent to you for testing. The actual email was intended for: <strong>${data.providerEmail}</strong>
              </p>`
                  : ''
              }
              
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; font-size: 18px; margin-top: 0;">Customer Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Name:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.customerName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Phone:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.customerPhone
                    }</td>
                  </tr>
                  ${
                    data.customerEmail
                      ? `<tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${data.customerEmail}</td>
                  </tr>`
                      : ''
                  }
                </table>
              </div>
              
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; font-size: 18px; margin-top: 0;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Booking Reference:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.bookingRef
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Service:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.serviceName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Time:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.startTime
                    } - ${data.endTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Staff:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.staffName || 'Not assigned'
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Price:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">₦${Number(
                      data.price
                    ).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Status:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #f59e0b;">PENDING</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.bookingUrl}" 
                   style="display: inline-block; padding: 14px 28px; background-color: #006D77; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View and Manage Booking
                </a>
              </div>
              
              <p style="color: #666; font-size: 16px;">
                <strong>Action Required:</strong> Please review this booking and confirm or cancel it as soon as possible. The customer is waiting for your confirmation.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                This is an automated notification. Please log in to your dashboard to manage this booking.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>This email was sent by BukinPoint</p>
            </div>
          </body>
        </html>
      `,
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      return { success: false, error: result.error.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending provider booking notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendBookingStatusUpdateEmail(
  data: BookingStatusUpdateEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  // Use bookings email address for booking-related emails
  const fromAddress =
    process.env.RESEND_BOOKINGS_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'BukinPoint <bookings@bukinpoint.com>'

  // Allow bypassing dev email redirect with ALLOW_REAL_EMAILS env var
  const allowRealEmails = process.env.ALLOW_REAL_EMAILS === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'
  const devEmail = process.env.DEV_EMAIL || 'sholajapheth@gmail.com'
  const recipientEmail = isDevelopment && !allowRealEmails ? devEmail : data.customerEmail

  try {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Status-specific messages
    let statusMessage = ''
    let statusColor = '#006D77'
    let statusTitle = 'Booking Update'

    switch (data.newStatus) {
      case 'CONFIRMED':
        statusMessage = 'Great news! Your booking has been confirmed by the provider.'
        statusColor = '#10b981'
        statusTitle = 'Booking Confirmed!'
        break
      case 'CANCELLED':
        statusMessage =
          'Your booking has been cancelled. If you have any questions, please contact the provider.'
        statusColor = '#ef4444'
        statusTitle = 'Booking Cancelled'
        break
      case 'COMPLETED':
        statusMessage = 'Your service has been completed. We hope you had a great experience!'
        statusColor = '#10b981'
        statusTitle = 'Service Completed'
        break
      case 'NO_SHOW':
        statusMessage =
          "We noticed you weren't able to make it to your appointment. Please contact the provider if you'd like to reschedule."
        statusColor = '#f59e0b'
        statusTitle = 'No Show'
        break
      default:
        statusMessage = `Your booking status has been updated to ${data.newStatus}.`
    }

    const result = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject: `${statusTitle} - ${data.bookingRef}`,
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
              
              <h2 style="color: ${statusColor}; font-size: 20px; margin-top: 0;">${statusTitle}</h2>
              
              <p style="color: #666; font-size: 16px;">
                Hi ${data.customerName},
              </p>
              
              <p style="color: #666; font-size: 16px;">
                ${statusMessage}
              </p>
              
              ${
                isDevelopment && !allowRealEmails
                  ? `<p style="color: #ff6b6b; font-size: 14px; background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0;">
                <strong>Development Mode:</strong> This email was sent to you for testing. The actual email was intended for: <strong>${data.customerEmail}</strong>
              </p>`
                  : ''
              }
              
              <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; font-size: 18px; margin-top: 0;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Booking Reference:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.bookingRef
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Service:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.serviceName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Provider:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.providerBusinessName
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Time:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px;">${
                      data.startTime
                    } - ${data.endTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-size: 14px;">Status:</td>
                    <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: ${statusColor};">${
        data.newStatus
      }</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                This is an automated notification. Please keep this email for your records.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>This email was sent by BukinPoint</p>
            </div>
          </body>
        </html>
      `,
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      return { success: false, error: result.error.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending booking status update email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
