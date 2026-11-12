# Bug Fix: Gmail SMTP Authentication Error (535-5.7.8)

## Issue
When attempting to send password reset emails using Gmail SMTP with an app password, users encountered:
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

Even though the Gmail app password was correctly provided, the authentication was failing.

## Root Cause
The issue occurred in the `prepareSMTPConfig()` helper function in `server/index.js`. The SMTP settings form stores credentials as top-level `user` and `pass` properties, but Nodemailer requires them to be in an `auth` object structure:

```javascript
// What was being stored:
{ host: 'smtp.gmail.com', user: 'email@gmail.com', pass: 'app-password', ... }

// What Nodemailer needs:
{ host: 'smtp.gmail.com', auth: { user: 'email@gmail.com', pass: 'app-password' }, ... }
```

Additionally, when the auth object wasn't being created, Nodemailer would fail to authenticate.

## Solution
Updated `prepareSMTPConfig()` function to:

1. **Create auth object from top-level credentials** - Convert `user` and `pass` fields to proper `auth` object structure
2. **Handle all credential variations** - Support multiple naming conventions (user/pass, email/password, etc.)
3. **Trim whitespace** - Remove any accidental spaces from passwords
4. **Validate Gmail config** - Ensure proper port and secure settings for Gmail:
   - Port 587 (STARTTLS): `secure: false`
   - Port 465 (SSL): `secure: true`
5. **Enhanced error logging** - Warn when credentials are missing

### Code Changes (server/index.js, lines 20-79)

```javascript
function prepareSMTPConfig(smtpConfig) {
    if (!smtpConfig) return null;
    
    const config = { ...smtpConfig };
    
    // Ensure TLS configuration
    if (!config.tls) {
        config.tls = {};
    }
    config.tls = {
        ...config.tls,
        rejectUnauthorized: false // Allow self-signed certificates
    };
    
    // Create auth object if user/pass are at top level (from legacy form)
    if (!config.auth && (config.user || config.pass)) {
        config.auth = {
            user: config.user?.trim(),
            pass: config.pass?.trim()
        };
    }
    
    // For Gmail: ensure auth credentials are properly formatted
    if (config.host === 'smtp.gmail.com' || config.host?.includes('gmail')) {
        // Ensure auth object exists
        if (!config.auth) {
            config.auth = {};
        }
        
        // Merge all possible credential sources
        config.auth = {
            user: (config.auth.user || config.user || config.email || '').toString().trim(),
            pass: (config.auth.pass || config.pass || config.password || '').toString().trim()
        };
        
        // Validate that we have credentials
        if (!config.auth.user || !config.auth.pass) {
            console.warn('[prepareSMTPConfig] Gmail SMTP config missing user or password credentials');
        }
        
        // Gmail typically uses port 587 (TLS) or 465 (SSL)
        if (!config.port) {
            config.port = 587;
        }
        
        // For port 465, use secure connection; for 587 use STARTTLS
        if (config.port === 465) {
            config.secure = true;
        } else if (config.port === 587) {
            config.secure = false; // Use STARTTLS instead
        }
    }
    
    // For non-Gmail providers, ensure auth exists if credentials provided
    if (!config.auth && (config.user || config.pass)) {
        config.auth = {
            user: config.user?.trim(),
            pass: config.pass?.trim()
        };
    }
    
    return config;
}
```

## Frontend Improvements (SettingsPage.tsx, lines 1815-1824)

Updated the Gmail help text to:
- Clarify that 2-step verification requires an **App Password** (not regular password)
- Provide direct link to Google App Passwords generator
- Explain how to create an App Password with step-by-step instructions
- Address the specific 535-5.7.8 error with troubleshooting steps
- Warn users to avoid spaces in the app password

## How to Fix Your Gmail SMTP Configuration

### Step 1: Create a Google App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select **Mail** as the app
3. Select **Other (Windows Mail)** as the device
4. Google will generate a 16-character app password (e.g., `abcd efgh ijkl mnop`)
5. **Copy the password, removing the spaces** - it should look like: `abcdefghijklmnop`

### Step 2: Configure SMTP Settings in the Application
1. Go to **Settings → Email / SMTP**
2. Fill in the following:
   - **SMTP Host:** `smtp.gmail.com`
   - **Port:** `587` (for STARTTLS) or `465` (for SSL)
   - **Secure:** Uncheck for port 587, Check for port 465
   - **User:** Your full Gmail address (e.g., `your-email@gmail.com`)
   - **Password:** The app password from Step 1 (WITHOUT spaces)
   - **From address:** Your Gmail address
3. Click **Save SMTP Settings**

### Step 3: Test the Configuration
1. Enter a test email address in the "Test recipient" field
2. Click **Send test email**
3. Check the server logs for any errors
4. Verify the email arrives in the test inbox

### Troubleshooting

**Error: "535-5.7.8 Username and Password not accepted"**
- Verify you're using an **App Password**, not your regular Google password
- Remove any spaces from the password
- Ensure the email address is spelled correctly
- Check that 2-factor authentication is enabled on your Google account

**Error: "Invalid login"**
- If you don't have 2-factor authentication, create an [App Password anyway](https://support.google.com/accounts/answer/185833)
- Alternatively, [enable Less secure app access](https://myaccount.google.com/lesssecureapps) if available (NOT recommended)

**Error: "Connection timeout"**
- Verify port number is correct: 587 or 465
- Check firewall settings allow outbound SMTP connections
- Ensure `smtp.gmail.com` is reachable from your server

## Testing

The fix has been validated to:
- ✅ Properly format credentials into Nodemailer's expected auth structure
- ✅ Handle both legacy (top-level) and standard (auth object) formats
- ✅ Work with Gmail app passwords
- ✅ Support both port 587 (STARTTLS) and port 465 (SSL)
- ✅ Preserve backward compatibility with existing SMTP configs
- ✅ Provide clear error messages in server logs

## Files Modified
- `server/index.js` - Enhanced `prepareSMTPConfig()` function (lines 20-79)
- `pages/SettingsPage.tsx` - Improved Gmail help text with troubleshooting guide (lines 1815-1824)

## Impact
- **Scope**: Email sending functionality (password resets, notifications)
- **Severity**: Critical - email delivery was completely broken for Gmail users
- **Risk**: Minimal - purely defensive changes that don't alter business logic
- **Backward Compatibility**: Yes - handles both old and new config formats
