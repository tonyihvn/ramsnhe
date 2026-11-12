# Email Configuration Guide

## Overview
The application supports email sending for:
- Password reset notifications
- User account creation notifications
- User account update notifications
- Custom notifications

## SMTP Configuration Priority

The application follows this priority order for SMTP configuration:

### 1. **Database Settings (Highest Priority)**
   - Managed through the Settings → Email/SMTP page
   - Stored in `dqatb_settings` table
   - Per-business configuration support
   - User-friendly UI for configuration

### 2. **Environment Variables (.env file)**
   - Fallback when database settings don't exist
   - Useful for initial setup or development
   - Set these variables in your `.env` file:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASSWORD=your-app-password
     SMTP_FROM_EMAIL=your-email@gmail.com
     ```

### 3. **Hardcoded Defaults (Lowest Priority)**
   - If neither database nor env vars are configured, no emails will be sent
   - A warning message will appear in logs

## Configuration Methods

### Method 1: Using the Settings UI (Recommended)

1. Go to **Settings → Email / SMTP**
2. Click the **"Use Gmail defaults"** button to auto-fill Gmail settings
3. Enter your credentials:
   - **Host:** `smtp.gmail.com`
   - **Port:** `587` (for STARTTLS) or `465` (for SSL)
   - **Secure:** Unchecked for 587, Checked for 465
   - **User:** Your Gmail address
   - **Password:** Your Google App Password (NOT your regular password)
   - **From address:** Your Gmail address
4. Click **Save SMTP Settings**
5. Enter an email address in the test field
6. Click **Send test email** to verify

### Method 2: Using Environment Variables

Add these to your `.env` file:

```bash
# Gmail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

# Alternative providers
# For Outlook/Office 365:
# SMTP_HOST=smtp.office365.com
# SMTP_PORT=587
# SMTP_USER=your-email@outlook.com
# SMTP_PASSWORD=your-password

# For SendGrid:
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=SG.xxxxxxxxxx
```

Then restart the application to load the new settings.

## Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar
3. Enable **2-Step Verification**

### Step 2: Create an App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select **Mail** as the app
3. Select **Other (Windows Mail)** as the device
4. Google will generate a 16-character password
5. Copy it exactly as shown (e.g., `abcd efgh ijkl mnop`)
6. **Remove the spaces** to get: `abcdefghijklmnop`

### Step 3: Configure the Application
1. **Via UI:** Settings → Email/SMTP → Use Gmail defaults → fill in email and app password
2. **Via .env:** Set `SMTP_USER` and `SMTP_PASSWORD` variables

### Step 4: Test
1. Click **Send test email** in the Settings page
2. Check the server logs for any errors
3. Verify the test email arrives in your inbox

## Troubleshooting

### Error: "535-5.7.8 Username and Password not accepted"
**Solution:**
- You must use an **App Password**, not your regular Gmail password
- Remove any spaces from the app password
- Verify the email address is correct
- Check that 2-factor authentication is enabled
- Try recreating the app password

### Error: "Invalid login" or "530 Authentication Required"
**Solution:**
- If you don't have 2-factor authentication enabled, enable it first
- Create an app password even if 2FA seems optional
- Alternatively, [enable Less secure app access](https://myaccount.google.com/lesssecureapps) (NOT recommended for security)

### Error: "Connection timeout"
**Solution:**
- Verify the port number is correct (587 or 465)
- Check that firewall allows outbound SMTP connections
- Verify `smtp.gmail.com` is reachable from your server location
- Check internet connectivity

### Error: "SMTP not configured"
**Solution:**
- Database settings are empty AND environment variables are not set
- Configure either through the UI or `.env` file
- Restart the application after changing `.env`

### Email Test Succeeds but Password Reset Doesn't Work
**Solution:**
- Check server logs for specific error messages
- Verify the `from` email address is correctly configured
- Ensure SMTP credentials have been saved
- Try sending another test email to confirm settings persisted

## Email Features

### Password Reset Emails
- Automatically sent when user requests password reset
- Contains a link to set new password
- Link expires in 1 hour
- HTML formatted with security warnings

### User Welcome Emails
- Sent when new user is created by an admin
- Contains login credentials if password was provided
- Contains instructions to set password if no password was provided
- Sent to both the new user and configured admin emails

### User Update Notifications
- Sent when admin updates a user's email or account
- Notifies the user of account changes
- Sent to user and admin emails

## Security Considerations

### Best Practices
1. ✅ Always use **App Passwords** for Gmail, not your main password
2. ✅ Enable **2-Factor Authentication** on your email account
3. ✅ Use **port 587 with STARTTLS** for better compatibility
4. ✅ Store credentials only in `.env` file (not in version control)
5. ✅ Never hardcode credentials in application code
6. ✅ Use a dedicated email account for application notifications
7. ✅ Regularly rotate app passwords

### What NOT to Do
1. ❌ Don't use your main Gmail password
2. ❌ Don't commit `.env` file to version control
3. ❌ Don't use "Less Secure App Access" (deprecated by Google)
4. ❌ Don't store passwords in database unencrypted
5. ❌ Don't share SMTP credentials in logs

## Technical Details

### How the Code Works
1. **Password Reset Flow:**
   - User enters email on login page
   - Server generates secure reset token (24-byte random)
   - Token is stored in `dqatb_password_resets` table with 1-hour expiry
   - Email is sent with reset link containing the token
   - User clicks link and enters new password
   - Token is validated and password is updated

2. **SMTP Config Processing:**
   - Settings are loaded from database first
   - Falls back to environment variables if database is empty
   - Credentials are passed through `prepareSMTPConfig()` function which:
     - Creates `auth` object from legacy `user`/`pass` fields
     - Trims whitespace from passwords
     - Validates Gmail-specific settings
     - Ensures TLS configuration is correct
   - Nodemailer creates transporter with validated config
   - Email is sent with proper authentication

3. **Error Handling:**
   - Errors are logged to server console
   - Failed emails don't block password reset process (for security)
   - Test endpoint provides detailed error messages for troubleshooting

## Advanced Configuration

### Using Different Email Providers

#### Outlook/Office 365
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-password
```

#### SendGrid
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxx
```

#### AWS SES
```
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASSWORD=your-ses-password
```

### Business-Specific Configuration
- When a business admin sets SMTP settings in the UI, they apply only to that business
- Super-admins can configure global settings by leaving business_id as NULL
- Each business can have its own email sending configuration

## Support

For issues or questions:
1. Check server logs: `tail -f logs/server.log`
2. Test SMTP connection using the test button in Settings
3. Verify environment variables are set: `echo $SMTP_HOST`
4. Review this guide's troubleshooting section
5. Check application logs for specific error messages
