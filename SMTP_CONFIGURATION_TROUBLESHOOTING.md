# SMTP Configuration Troubleshooting Guide

## Gmail App Password Setup (Recommended)

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/
2. Select "Security" from the left menu
3. Scroll down to "2-Step Verification" and enable it

### Step 2: Generate App Password
1. Go back to Security settings
2. Scroll to "App passwords" (only appears if 2-Step is enabled)
3. Select "Mail" and "Windows Computer" (or your platform)
4. Google will generate a 16-character password
5. **Copy this password exactly as shown (remove any spaces)**

### Step 3: Configure SMTP in .env

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=ystsegzwvnwahadq  # (your generated app password)
SMTP_FROM_EMAIL=your.email@gmail.com
SMTP_FROM_NAME=DQAi
```

## Important Configuration Details

### Port Selection
- **Port 587 (TLS/STARTTLS)**: Most common for Gmail
  - Set: `SMTP_PORT=587`
  - Server sets: `secure: false` (uses STARTTLS)
  - Certificate validation: Disabled for self-signed certs

- **Port 465 (SSL)**: Alternative for Gmail
  - Set: `SMTP_PORT=465`
  - Server sets: `secure: true`
  - Establishes SSL connection first

### Why Port 587 is Recommended
- Standard SMTP port with security upgrade
- More compatible with corporate networks
- Supports both encrypted and unencrypted connections

## Troubleshooting Email Failures

### Error: "Username and Password not accepted" (535 error)

**Cause**: Invalid credentials
- You're using your regular Gmail password instead of app password
- The app password has extra spaces
- The email address doesn't match your Gmail account

**Solution**:
1. Verify you're using the correct app-specific password (from Step 2 above)
2. Remove any spaces from the password
3. Confirm the email matches your Gmail account

### Error: "self-signed certificate in certificate chain"

**Cause**: TLS certificate validation is enabled
- The server certificate can't be verified
- This is normal for self-signed certificates

**Solution**: Already handled in code with:
```javascript
tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
}
```
No action needed - this is configured automatically.

### Error: "Connection refused" or timeout

**Cause**: Can't connect to Gmail servers
- Network connectivity issue
- Wrong host or port
- Firewall blocking port 587/465

**Solution**:
1. Verify internet connection
2. Check port 587 or 465 is not blocked by firewall
3. Test with command:
   ```bash
   telnet smtp.gmail.com 587
   ```

## Testing Your Configuration

### Option 1: Use the Built-in Test Endpoint

Send a POST request to test your SMTP configuration:

```bash
curl -X POST http://localhost:3000/api/test-smtp \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "your.email@gmail.com",
    "pass": "ystsegzwvnwahadq",
    "from": "your.email@gmail.com"
  }'
```

**Success Response**:
```json
{
  "ok": true,
  "message": "SMTP test successful! Email configuration is working correctly.",
  "config": { "host": "smtp.gmail.com", "port": 587, "user": "your.email@gmail.com", "from": "your.email@gmail.com" }
}
```

**Error Response** (shows detailed error info):
```json
{
  "ok": false,
  "error": "Invalid login: 535-5.7.8 Username and Password not accepted",
  "code": "EAUTH",
  "details": {
    "response": "535-5.7.8 Username and Password not accepted...",
    "command": "AUTH PLAIN"
  }
}
```

### Option 2: Check Server Logs

When the application tries to send an email, check the server console for:

```
[prepareSMTPConfig] Gmail using port 587 with TLS (secure: false)
[prepareSMTPConfig] Gmail SMTP configured for user: your.email@gmail.com
Password reset email sent to recipient@example.com
```

Or if there's an error:

```
Failed to send reset email Error: Invalid login: 535-5.7.8...
SMTP response: 535-5.7.8 Username and Password not accepted
SMTP command that failed: AUTH PLAIN
```

## How the Application Handles SMTP

### Configuration Priority
1. **Database Settings** (set via admin UI): `SELECT value FROM dqatb_settings WHERE key = 'smtp'`
2. **Environment Variables** (fallback): `.env` file settings
3. **Failure Handling**: If no config, still returns success for security

### Automatic Configuration for Gmail
When host is `smtp.gmail.com`:
- Port 587 → secure: false (STARTTLS)
- Port 465 → secure: true (SSL)
- TLS settings automatically optimized
- Credentials validated and logged

### Email Features
- Password reset emails (1-hour token expiration)
- User verification emails
- Admin notifications
- Beautiful HTML templates with fallback plain text

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 535 Username/Password error | Wrong credentials | Use app password, not Gmail password |
| Connection timeout | Network/Firewall | Check internet, verify port not blocked |
| Email not received | SMTP configured but disabled | Check settings in admin UI |
| "Failed to send reset email" in logs | SMTP failure | Use test endpoint to diagnose |
| Certificate errors | SSL/TLS mismatch | Port 587 uses TLS, port 465 uses SSL |

## Additional Email Providers

### Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your.email@company.com
SMTP_PASSWORD=your_password
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key
```

### AWS SES
```env
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_username
SMTP_PASSWORD=your_ses_password
```

## Still Having Issues?

1. **Check Server Logs**: Look for detailed error messages including error code
2. **Test SMTP Endpoint**: Use `/api/test-smtp` to isolate configuration issues
3. **Verify Credentials**: Confirm app password is correct (no spaces, proper format)
4. **Check Port**: Ensure port 587 or 465 is accessible
5. **Review .env**: Verify all SMTP variables are properly set
6. **Database Settings**: If using database configuration, verify via admin panel

## References
- Google App Password Help: https://support.google.com/accounts/answer/185833
- Nodemailer SMTP Configuration: https://nodemailer.com/smtp/
- Gmail SMTP Documentation: https://support.google.com/mail/answer/7126229
