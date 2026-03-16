# Email Configuration for New User Creation

## Overview
When an admin creates a new user, a professional welcome email is automatically sent with the user's credentials.

## Implementation Details

### Backend Changes
**File:** `server/superAdminRoutes.js`

The user creation endpoint (`POST /api/super-admin/users`) now **always** sends a welcome email to the newly created user with:

1. **Formatted HTML Email** that includes:
   - Professional greeting addressing the user by name
   - Platform name and information
   - User credentials (email and temporary password)
   - Step-by-step getting started instructions
   - Call-to-action button to log in
   - Security notice about password confidentiality
   - Footer with "DQAi Platform" branding

2. **Plain Text Fallback** for email clients that don't support HTML

### Frontend Changes
**File:** `pages/SuperAdminUserManagement.tsx`

- Removed the "Send invitation email" checkbox from the form (email is now always sent)
- Added a blue informational banner stating: "A welcome email with login credentials will automatically be sent to the user."
- Simplified form to focus on user details (first name, last name, email, role)

## Email Configuration Requirements

To enable email sending, configure these environment variables in your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # Your SMTP server
SMTP_PORT=587                     # Usually 587 (TLS) or 465 (SSL)
SMTP_USER=your-email@gmail.com    # SMTP username/email
SMTP_PASSWORD=your-app-password   # SMTP password (use app-specific password for Gmail)
SMTP_FROM_NAME=DQAi Platform      # Display name in "From" field
SMTP_FROM_EMAIL=noreply@dqai.org  # Email address in "From" field
FRONTEND_HOST=https://app.dqai.org # Platform URL for login link
```

### Gmail Configuration Example
If using Gmail:
1. Enable "Less secure app access" or use Google App Passwords
2. Generate an app-specific password in Google Account settings
3. Use the app password in `SMTP_PASSWORD`

## Email Template Content

The welcome email includes:

```
From: DQAi Platform <noreply@dqai.org>
Subject: Welcome to DQAi Platform - Your Account Credentials

Content:
- Greeting with user's name
- Platform introduction
- Credentials box with:
  - Platform name
  - Email address
  - Temporary password (in code format)
- Getting Started guide (5 steps)
- Login button linking to FRONTEND_HOST/login
- Security reminder about password confidentiality
- Footer with platform branding
```

## Testing

To test email functionality:

1. Create a new user through the Super Admin User Management page
2. Check the user's email inbox for the welcome message
3. Click the login link in the email
4. Use the provided credentials to log in
5. Set a new password when prompted

## Fallback Behavior

If SMTP is not configured:
- The system logs a warning: "SMTP not configured, skipping email"
- User creation still succeeds
- No email is sent (admin can manually notify user or share temporary password)

## Logging

Email sending events are logged in the server console:
- Success: `Email sent to user@example.com: Welcome to DQAi Platform - Your Account Credentials`
- Error: `Error sending email: [error details]`

## Security Notes

- Temporary passwords are generated using cryptographically secure random strings
- Email addresses are validated before sending
- Credentials are transmitted through SMTP with TLS encryption (recommended)
- No password is stored in plain text in the database
- Users must change their temporary password on first login
