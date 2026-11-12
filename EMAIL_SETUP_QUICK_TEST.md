# Quick Email Setup Test

## Your Current Configuration

From your `.env` file:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ihvnsi@gmail.com
SMTP_PASSWORD=ystsegzwvnwahadq
SMTP_FROM_EMAIL=ihvnsi@gmail.com
```

**ℹ️ Port 587 with `secure: false` = STARTTLS (correct for Gmail)**

---

## Verify Your App Password is Correct

### The app password you provided: `ystsegzwvnwahadq`

**Check these points:**

1. ✓ It's 16 characters (Gmail app passwords are always 16 chars)
2. ✓ No spaces (Gmail generates without spaces)
3. ✓ Matches your Gmail account: `ihvnsi@gmail.com`

### To regenerate if issues persist:

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Google generates a new 16-char password
4. **Copy exactly**, including removing any spaces that might appear
5. Update in `.env`: `SMTP_PASSWORD=<new_password>`

---

## Test Your Configuration

### Method 1: Use the Test Endpoint

Start the server:
```bash
npm run dev
```

In another terminal, test SMTP:
```bash
curl -X POST http://localhost:3000/api/test-smtp \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "ihvnsi@gmail.com",
    "pass": "ystsegzwvnwahadq",
    "from": "ihvnsi@gmail.com"
  }'
```

**If successful**, you'll get:
```json
{
  "ok": true,
  "message": "SMTP test successful! Email configuration is working correctly."
}
```

**If it fails**, you'll see the exact error:
```json
{
  "ok": false,
  "error": "Invalid login: 535-5.7.8 Username and Password not accepted"
}
```

### Method 2: Test via Password Reset Page

1. Go to http://localhost:9092/#/request-reset
2. Enter your email: `ihvnsi@gmail.com`
3. Click "Send Reset Link"
4. Check server console for logs:
   - **Success**: `Password reset email sent to ihvnsi@gmail.com`
   - **Error**: `Failed to send reset email Error: ...`

---

## Common Issues for Your Setup

### Issue: "Invalid login: 535-5.7.8"

**This means Gmail rejected your password.**

Solutions:
1. Verify you're using an **app password**, NOT your Gmail password
2. Check 2-Step Verification is enabled (required for app passwords)
3. Regenerate a new app password and update `.env`
4. No spaces in the password!

### Issue: "self-signed certificate" error

**This is handled automatically** in the code:
```javascript
tls: {
    rejectUnauthorized: false,  // Allows self-signed certs
    minVersion: 'TLSv1.2'       // Ensures secure TLS version
}
```
✓ No action needed.

### Issue: Connection timeout or refused

**Network/Firewall issue**

Test connectivity:
```bash
# On Windows PowerShell
Test-NetConnection -ComputerName smtp.gmail.com -Port 587
```

Should show: `TcpTestSucceeded : True`

---

## What Happens When Email Fails

Currently, if email sending fails:
- ✓ Password reset token is still created in database
- ✓ User sees success message (for security)
- ✓ Server logs the error for debugging
- ✓ User can manually check email or try again

**This is intentional** - we don't expose email failures to users for security reasons.

---

## Server Logs to Watch

When starting the server, you should see:
```
[prepareSMTPConfig] Gmail using port 587 with TLS (secure: false)
[prepareSMTPConfig] Gmail SMTP configured for user: ihvnsi@gmail.com
```

When sending password reset email:
```
[Password Reset] Using SMTP config from environment variables (host: smtp.gmail.com)
Password reset email sent to user@example.com
```

If there's an error:
```
Failed to send reset email Error: Invalid login: 535-5.7.8...
SMTP response: 535-5.7.8 Username and Password not accepted
SMTP command that failed: AUTH PLAIN
```

---

## Next Steps

1. **Test SMTP Configuration**
   - Use the curl test command above
   - Or check the password reset page logs

2. **If Test Passes**
   - Email is working! ✓
   - Try requesting password reset to verify

3. **If Test Fails**
   - Check error message carefully
   - Follow the common issues section
   - Regenerate app password if needed

4. **Still Not Working?**
   - Verify port 587 is accessible
   - Check 2-Step Verification is enabled
   - Review error logs in console
   - Refer to full guide: `SMTP_CONFIGURATION_TROUBLESHOOTING.md`

---

## Additional Resources

- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- Gmail SMTP Settings: https://support.google.com/mail/answer/7126229
- Nodemailer Docs: https://nodemailer.com/
