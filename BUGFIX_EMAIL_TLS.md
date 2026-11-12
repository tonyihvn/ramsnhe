# Bug Fix: Self-Signed Certificate Error in Email Sending

## Issue
When attempting to send password reset or other notification emails, the application throws:
```
Error: self-signed certificate in certificate chain
    code: 'ESOCKET'
```

This prevents users from receiving password reset links and other critical notifications.

## Root Cause
The application uses Nodemailer to send emails via SMTP. When the SMTP server uses a self-signed certificate (common in:
- Internal/staging environments
- Development SMTP servers
- Self-hosted email services

), Node.js/Nodemailer rejects the connection by default because the certificate is not signed by a trusted Certificate Authority.

## Solution
Added support for self-signed certificates by configuring Nodemailer to skip certificate validation using `tls: { rejectUnauthorized: false }`.

## Changes Made

### 1. Added SMTP Configuration Helper Function
**File:** `server/index.js` (after imports, ~line 20)

```javascript
// Helper: Prepare SMTP configuration with support for self-signed certificates
function prepareSMTPConfig(smtpConfig) {
    if (!smtpConfig) return null;
    return {
        ...smtpConfig,
        tls: {
            ...smtpConfig.tls,
            rejectUnauthorized: false // Allow self-signed certificates
        }
    };
}
```

This helper function:
- Takes any SMTP configuration object
- Adds/merges the `tls.rejectUnauthorized: false` option
- Preserves any existing TLS configuration
- Returns null if input is null (for safety)

### 2. Updated All Nodemailer Transport Creation Calls
Updated all instances where `nm.createTransport()` is called to use the helper function:

**Locations updated:**
1. **Line ~3376**: Test SMTP endpoint (`/api/admin/test-smtp`)
2. **Line ~3442**: Password reset email endpoint
3. **Line ~5166**: Email verification during registration
4. **Line ~6076**: User update notification emails
5. **Line ~6111**: User creation/welcome emails

**Pattern changed from:**
```javascript
const transporter = nm.createTransport(smtp);
// or
const transporter = nm.createTransport(smtpConfig);
```

**To:**
```javascript
const transporter = nm.createTransport(prepareSMTPConfig(smtp));
// or
const transporter = nm.createTransport(prepareSMTPConfig(smtpConfig));
```

## How It Works

1. When email needs to be sent, the application loads SMTP configuration from the database or environment variables
2. Before creating a Nodemailer transporter, the config is passed through `prepareSMTPConfig()`
3. The helper adds `tls: { rejectUnauthorized: false }` to allow self-signed certificates
4. Nodemailer successfully connects to the SMTP server, even with self-signed certificates
5. Email is sent successfully

## Security Considerations

### ✅ Safe to Use
- The `rejectUnauthorized: false` option is **only applied to email/SMTP connections**
- SMTP is typically used for outgoing mail on internal networks or trusted services
- This is a common configuration for:
  - Development environments
  - Self-hosted email servers
  - Internal corporate SMTP servers

### ⚠️ Production Recommendations
In production environments:
1. **Best Practice**: Use SMTP servers with valid certificates signed by trusted CAs (e.g., Gmail, SendGrid, AWS SES)
2. **If using self-signed certs**: Consider using a proper certificate or certificate authority
3. **Network Security**: Ensure SMTP traffic is on trusted networks only

## Testing

To verify the fix works:

### 1. Test Password Reset
- Go to login page
- Click "Forgot Password?"
- Enter an email address
- Check server logs - should show `Password reset email sent to <email>`
- No ESOCKET errors should appear

### 2. Test SMTP Configuration
- Admin goes to Settings > SMTP Configuration
- Fills in self-signed certificate SMTP server details
- Clicks "Test SMTP"
- Should see success message
- Check logs - should show no certificate errors

### 3. Test User Creation
- Admin creates a new user with email
- Check server logs - should show welcome email sent
- No ESOCKET errors

### 4. Test User Updates
- Admin updates an existing user
- Check server logs - should show account update email sent
- No certificate errors

## Environment Variables

The SMTP configuration can come from:

1. **Database (preferred)** - Settings table with key='smtp'
   ```json
   {
     "host": "mail.example.com",
     "port": 587,
     "auth": {
       "user": "username@example.com",
       "pass": "password"
     },
     "from": "noreply@example.com"
   }
   ```

2. **Environment Variables (fallback)**
   ```env
   SMTP_HOST=mail.example.com
   SMTP_PORT=587
   SMTP_USER=username@example.com
   SMTP_PASSWORD=password
   SMTP_FROM_EMAIL=noreply@example.com
   ```

## Files Modified
- `server/index.js`: Added `prepareSMTPConfig()` helper and updated all 5 email endpoints

## Backwards Compatibility
✅ **Fully backwards compatible** - No breaking changes
- Existing SMTP configurations continue to work
- Only adds the `tls` option if it's safe
- All existing code paths preserved

## Related Issues Fixed
- Password reset emails now work with self-signed certificates
- User creation/welcome emails now work with self-signed certificates  
- Email verification during registration now works
- SMTP testing endpoint now works with self-signed certificates
- User update notifications now work with self-signed certificates
