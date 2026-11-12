# Welcome Email Template - Visual Guide

## Email Subject
```
Welcome! Your Account Has Been Created
```

---

## Email Layout (HTML Version)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  IHVN Data Collection Platform                                 │
│  (From Settings → Theme Logo Text field)                       │
│                                                                 │
│  Welcome, John!                                                │
│                                                                 │
│  Your account has been successfully created on our             │
│  platform.                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                   YOUR LOGIN CREDENTIALS                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Email: anwokoma@ihvnigeria.org                          │ │
│  │ Password: IHVN2K1                                        │ │
│  │                                                          │ │
│  │ ⚠️ Please change your password on first login for       │ │
│  │    security.                                            │ │
│  └──────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   VISIT OUR PLATFORM                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │               [ Log In Now ]                            │ │
│  │                                                          │ │
│  │ http://41.223.44.116:9090/                             │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       NEXT STEPS                                │
│                                                                 │
│  • Log in with your credentials                               │
│  • Complete your profile if needed                            │
│  • Contact support if you need assistance                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  If you did not expect this account creation or have any      │
│  questions, please contact support: ihvnsi@gmail.com          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────│
│                                                                 │
│  This is an automated message. Please do not reply to this     │
│  email.                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Plain Text Email Version

```
IHVN Data Collection Platform
==================================================

Hello John,

Your account has been successfully created on our platform.

Your Login Credentials:
Email: anwokoma@ihvnigeria.org
Password: IHVN2K1

⚠️ Please change your password on first login for security.

Visit: http://41.223.44.116:9090/login to login and start using 
the Data Collection Platform

Next Steps:
- Log in with your credentials
- Complete your profile if needed
- Contact support if you need assistance

If you did not expect this account creation or have any questions, 
please contact support: ihvnsi@gmail.com

---
This is an automated message. Please do not reply to this email.
```

---

## Alternative: Email Without Password

If user is created without a password, the email will show:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  IHVN Data Collection Platform                                 │
│                                                                 │
│  Welcome, John!                                                │
│                                                                 │
│  Your account has been successfully created on our             │
│  platform.                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    SET YOUR PASSWORD                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ No password was provided during account creation. You   │ │
│  │ can set a password using the password reset flow:       │ │
│  │                                                          │ │
│  │ 1. Click the "Forgot Password?" link on the login page  │ │
│  │ 2. Enter your email address                             │ │
│  │ 3. Check your email for a password reset link           │ │
│  │ 4. Follow the link to create your new password          │ │
│  └──────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   VISIT OUR PLATFORM                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │          [ Access Platform ]                            │ │
│  │                                                          │ │
│  │ http://41.223.44.116:9090/                             │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Rest of email same as above...]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme Used

| Element | Background Color | Border Color | Text Color |
|---------|-----------------|--------------|-----------|
| Logo/Title | N/A | N/A | #2c3e50 (Dark Blue) |
| Credentials Section | #f0f7ff (Light Blue) | #3498db (Blue) | #2c3e50 |
| Set Password Section | #fff3cd (Light Yellow) | #ffc107 (Yellow) | #856404 (Dark Yellow) |
| Platform Link Section | #e8f5e9 (Light Green) | #4caf50 (Green) | White on button |
| Next Steps Section | #f8f9fa (Light Gray) | N/A | #2c3e50 |

---

## Dynamic Elements

### 1. Logo Text
- **Source:** `Settings` table, `key='theme'`, JSON field `logoText`
- **Default:** "Data Collection Platform"
- **Example:** "IHVN Data Collection Platform"

### 2. App URL
- **Source:** `FRONTEND_HOST` environment variable
- **Default:** "http://41.223.44.116:9090/"
- **Used for:** Login link and platform URL display

### 3. User Information
- **First Name:** From user creation
- **Last Name:** From user creation (used in plain text header)
- **Email:** From user creation
- **Password:** Provided during user creation (if any)
- **Role:** From user creation

---

## Configuration Requirements

### Environment Variable
Add to `.env` file:
```env
FRONTEND_HOST=http://41.223.44.116:9090/
```

### Theme Settings in Database
The logo text should be set in Settings:
```json
{
  "key": "theme",
  "value": {
    "logoText": "IHVN Data Collection Platform",
    "primaryColor": "#2c3e50",
    ...other theme settings...
  },
  "business_id": null
}
```

---

## Features Highlight

✅ **Branded with Logo Text** - Shows your organization's name from theme settings
✅ **Direct Platform Link** - Clickable button and URL for easy access
✅ **Security Warning** - Clear message about changing password
✅ **Professional Design** - HTML email with styled sections
✅ **Fallback Support** - Works without theme settings (uses defaults)
✅ **Plain Text Version** - Full email accessible in text-only clients
✅ **Support Contact** - Email included for user questions
✅ **Responsive** - Email displays well on all devices

---

## Admin Notification

If admins are configured in SMTP settings, they also receive a copy of the welcome email to:
- Track new user registrations
- Monitor user creation activities
- Maintain records for audit purposes
