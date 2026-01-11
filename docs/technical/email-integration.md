# Email Integration

## Overview

BukinPoint uses Resend for sending transactional emails, primarily for staff invitations.

## Service

**Provider**: Resend
**Configuration**: `src/lib/email.ts`

## Environment Variables

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=BukinPoint <noreply@yourdomain.com>  # Optional
```

## Email Types

### Staff Invitation Email

**Trigger**: Provider sends staff invitation
**Template**: HTML email with invitation link
**Content**:
- Business name
- Staff role (OWNER/STAFF)
- Invitation link with token
- Expiration notice (7 days)

**Function**: `sendStaffInvitationEmail(data)`

**Input**:
```typescript
{
  email: string
  businessName: string
  role: 'OWNER' | 'STAFF'
  invitationUrl: string
}
```

## Email Template

### Staff Invitation

```html
<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #006D77;">You've been invited!</h2>
  <p>{businessName} has invited you to join their team as {role}.</p>
  <p>Click the link below to accept the invitation and create your account:</p>
  <a href="{invitationUrl}">Accept Invitation</a>
  <p>This invitation expires in 7 days.</p>
</div>
```

## Error Handling

### API Key Missing
- **Behavior**: Logs warning, continues without sending
- **Development**: Useful for local development
- **Production**: Should always have API key

### Sending Failure
- **Behavior**: Error logged, invitation still created
- **Recovery**: Provider can resend invitation
- **Logging**: Errors logged to console

## Configuration

### Development
- Can run without API key (logs invitation URL)
- Useful for testing invitation flow

### Production
- Must have valid API key
- Should use verified domain for `RESEND_FROM_EMAIL`
- Monitor email delivery rates

## Future Email Types

- Booking confirmations
- Booking reminders
- Payment receipts
- Password reset (if implemented)

## Related Documentation

- [Staff Management](../features/staff-management.md) - Invitation flow
- [Staff Invitation Flow](../flows/staff-invitation-flow.md) - Email sending

## Changelog

- **2025-01-10** - Initial email integration documentation
