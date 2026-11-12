# Password Reset Email Failing - Diagnostic Guide

## Your Issue

You're seeing this error when trying to reset password:

```
Failed to send reset email Error: Invalid login: 535-5.7.8 Username and Password not accepted
SMTP response: 535-5.7.8 Username and Password not accepted
SMTP command that failed: AUTH PLAIN
```

**BUT** the SMTP test endpoint works perfectly! ✓

## Why This Happens

The test endpoint and password reset endpoint load SMTP config **differently**:

1. **Test endpoint** (`/api/test-smtp`): Uses credentials from your request body
   - ✅ Works perfectly with your credentials

2. **Password reset endpoint** (`/auth/request-password-reset`): Loads from:
   - 🔴 **Database first** (if SMTP config was saved in admin settings)
   - 🟡 **Environment variables second** (fallback)

## Most Likely Problem

**There's an incorrect SMTP configuration stored in your DATABASE** that's being used instead of your correct environment variables.

---

## How to Fix It

### Step 1: Restart Your Server

Stop all node processes and restart:

```bash
# Kill existing processes
taskkill /PID 27416 /F

# Start fresh server
cd C:\Users\ginte\OneDrive\Desktop\PROJECTS\REACTJS\ramsnhe
node server/index.js
```

### Step 2: Check Which Config Is Being Used

After restarting, call the diagnostic endpoint:

```bash
curl http://localhost:3000/api/check-smtp-config
```

**You'll see something like:**

```json
{
  "ok": true,
  "message": "SMTP config found in database",
  "database": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "ihvnsi@gmail.com",
    "hasPassword": true,
    "passwordLength": 16
  },
  "environment": {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "ihvnsi@gmail.com",
    "hasPassword": true,
    "passwordLength": 16
  }
}
```

### Step 3: Check If Database Config Is Bad

If you see a database config, check if it matches your environment. If it's different or corrupted:

```bash
curl -X DELETE http://localhost:3000/api/smtp-config
```

This will:
- Delete the bad database SMTP config
- Force the system to use environment variables
- Restart the server

### Step 4: Test Password Reset Again

Go to: `http://localhost:9092/#/request-reset`

1. Enter your email
2. Click "Send Reset Link"
3. Check the server logs for:
   - `[Password Reset] Using SMTP config from environment variables`
   - `[prepareSMTPConfig] Gmail SMTP configured for user: ihvnsi@gmail.com`
   - `Password reset email sent to user@example.com`

---

## Why The Test Email Worked But Password Reset Didn't

| Feature | Test Endpoint | Password Reset |
|---------|---------------|-----------------|
| Config Source | Request body | Database OR Environment |
| Priority | Direct input | Database first |
| Database Override | No | Yes! |
| **Why it failed** | N/A | **Bad database config** |

---

## What The Logs Show

When password reset tries to send an email, you'll now see:

```
[Password Reset] Using SMTP config from environment variables (host: smtp.gmail.com)
[Password Reset] SMTP User: ihvnsi@gmail.com
[Password Reset] SMTP Password length: 16 chars
[Password Reset] SMTP Port: 587
[prepareSMTPConfig] Gmail SMTP configured for user: ihvnsi@gmail.com
[prepareSMTPConfig] Gmail using port 587 with TLS (secure: false)
```

If you see "from database" instead of "from environment variables", the database config is being used.

---

## New Diagnostic Endpoints

I've added two new endpoints to help debug this:

### 1. Check SMTP Configuration
```bash
GET http://localhost:3000/api/check-smtp-config
```

**Returns:**
- Current database SMTP config (if exists)
- Current environment variables
- Whether each has a password set
- Which one will be used

### 2. Clear Bad Database Config
```bash
DELETE http://localhost:3000/api/smtp-config
```

**Does:**
- Deletes any SMTP config stored in database
- Forces use of environment variables
- Returns confirmation with environment config

---

## Step-by-Step Fix

1. **Restart the server** (to ensure fresh code)
2. **Check config**: `curl http://localhost:3000/api/check-smtp-config`
3. **If database config exists**: `curl -X DELETE http://localhost:3000/api/smtp-config`
4. **Restart server** again
5. **Test password reset**: Try resetting password at `/request-reset`
6. **Check logs** for success or failure details

---

## If It Still Fails

1. **Check the error message carefully** - it will show which credentials failed
2. **Verify your .env file** has correct values:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=ihvnsi@gmail.com
   SMTP_PASSWORD=ystsegzwvnwahadq
   ```
3. **No spaces in password** - check if there are extra spaces
4. **App password is correct** - not your regular Gmail password
5. **2-Step Verification is enabled** - required for Gmail app passwords

---

## Summary

**The Problem**: Database has bad SMTP config that overrides your correct environment variables

**The Solution**:
1. Delete database SMTP config with `DELETE /api/smtp-config`
2. Restart server
3. Test password reset again

**Why it works**: Password reset will then use your correct environment variables instead of bad database config

---

Let me know when you've run the diagnostic endpoint and what it shows!
