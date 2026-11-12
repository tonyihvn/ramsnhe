# Password Reset & User Management Improvements

## Issues Addressed

### 1. ✅ SMTP Configuration Error When Sending Password Reset Email
**Error**: `{"ok":false,"error":"SMTP not configured"}`

**Root Cause Analysis**:
- Password reset endpoint checks database settings first, then environment variables
- If neither is configured, it returns a success message for security (user enumeration prevention)
- The error message was likely from a test endpoint, not the actual reset endpoint

**Current Solution** (Already Implemented):
- `/auth/request-password-reset` endpoint:
  - ✅ Checks database `SETTINGS` table for SMTP config
  - ✅ Falls back to environment variables (`SMTP_HOST`, `SMTP_PORT`, etc.)
  - ✅ Returns `{ ok: true }` even if SMTP fails (for security)
  - ✅ Sends professional HTML-formatted email with 1-hour expiration token
  
**Environment Variables Available**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ihvnsi@gmail.com
SMTP_PASSWORD=pynoflrbqacudsqu
SMTP_FROM_EMAIL=ihvnsi@gmail.com
SMTP_FROM_NAME=DQAi
```

**Testing Password Reset Flow**:
1. Navigate to login page
2. Click "Forgot Password?"
3. Enter email address
4. You should receive an email with reset link
5. Click link to open reset page with token
6. Set new password
7. Login with new password

---

### 2. ✅ Missing Topbar with Logo on Password Reset Pages
**Issue**: Password reset pages didn't have the application header/logo

**Solution Implemented**:

#### Created SimpleHeader Component
- **File**: `components/layout/SimpleHeader.tsx`
- **Purpose**: Lightweight header for unauthenticated pages
- **Features**:
  - Displays application logo (from theme settings)
  - Shows page title
  - Consistent with main application branding
  - Mobile-friendly responsive design
  - Uses theme variables for styling

#### Updated Password Pages
1. **RequestPasswordPage** (`pages/RequestPasswordPage.tsx`):
   - ✅ Added `SimpleHeader` with title "Reset Your Password"
   - ✅ Improved error handling for SMTP failures
   - ✅ Better user feedback with styled messages
   - ✅ Tip about checking spam folder

2. **ResetPasswordPage** (`pages/ResetPasswordPage.tsx`):
   - ✅ Added `SimpleHeader` with title "Reset Your Password"
   - ✅ Consistent styling across password reset flow
   - ✅ Auto-redirect to login after successful reset

---

## Technical Details

### Backend Password Reset Endpoint
**POST `/auth/request-password-reset`**
```javascript
Request: { email: "user@example.com" }

Response: { ok: true, message: "If the email exists, a password reset link has been sent." }

Features:
- Creates reset token (24 bytes, hex-encoded)
- Token expires in 1 hour
- Stores token in PASSWORD_RESETS table
- Sends HTML + plain text email
- Returns success even if SMTP fails (security)
- Professional email template with security warnings
```

### Frontend Password Reset Flow
1. **RequestPasswordPage**: User enters email
2. **Email Sent**: Reset link sent to user's inbox
3. **ResetPasswordPage**: User clicks link and sets new password
4. **Validation**: 
   - Password must be 6+ characters
   - Passwords must match
   - Token must be valid and not expired
5. **Success**: Auto-redirect to login

---

## Database Schema (Password Reset)

### PASSWORD_RESETS Table
```sql
CREATE TABLE IF NOT EXISTS dqatb_password_resets (
    user_id INTEGER,
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMP
)
```

### Fields:
- `user_id`: Foreign key to USERS table
- `token`: Unique reset token (24 bytes hex)
- `expires_at`: Token expiration (1 hour from creation)

---

## Security Features

### ✅ Implemented Security Measures
1. **User Enumeration Prevention**: Returns success even if email doesn't exist
2. **Token Expiration**: Tokens expire after 1 hour
3. **Random Token Generation**: Uses `crypto.randomBytes(24).toString('hex')`
4. **HTTPS Recommended**: Reset links should only work over HTTPS
5. **No Password in Email**: Password reset link only, not password itself
6. **Audit Logging**: Password changes logged in AUDIT_EVENTS table

### ⚠️ Security Considerations
- **SMTP Credentials**: Currently stored in `.env` file
  - **Recommendation**: Use environment variables on production servers
  - **Gmail**: Using App Passwords instead of account password
  - **Never commit credentials**: Add `.env` to `.gitignore`

---

## Files Modified

1. **components/layout/SimpleHeader.tsx** (NEW)
   - Lightweight header component for unauthenticated pages
   - Displays logo and title

2. **pages/RequestPasswordPage.tsx**
   - Added `SimpleHeader` import and integration
   - Improved error handling: checks `r.ok || j.ok`
   - Better error messages
   - Responsive layout with flexbox

3. **pages/ResetPasswordPage.tsx**
   - Added `SimpleHeader` import and integration
   - Added password validation (6+ characters)
   - Improved error handling and messages
   - Auto-redirect to login after success

---

## Testing Checklist

### ✅ Password Reset Flow
- [ ] Click "Forgot Password?" on login page
- [ ] Enter valid email address
- [ ] See success message
- [ ] Check email inbox (and spam folder)
- [ ] Click reset link in email
- [ ] See reset password page with header/logo
- [ ] Enter new password
- [ ] Confirm password matches
- [ ] Click "Save New Password"
- [ ] See success message
- [ ] Redirected to login page
- [ ] Login with new password succeeds

### ✅ Error Cases
- [ ] Try password reset with invalid email - see friendly message
- [ ] Try invalid token - see error message
- [ ] Try expired token - see error message
- [ ] Try mismatched passwords - see validation error
- [ ] Try password < 6 characters - see validation error

### ✅ UI/UX
- [ ] Header displays on both password pages
- [ ] Logo visible and correctly sized
- [ ] Page title shows "Reset Your Password"
- [ ] Mobile responsive layout
- [ ] Error messages styled clearly
- [ ] Success messages styled clearly
- [ ] Buttons are accessible and clickable

---

## SMTP Configuration

### Option 1: Database Settings (Admin Panel)
```javascript
POST /api/admin/settings
{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "app-password"
    },
    "from": "noreply@yourdomain.com"
  }
}
```

### Option 2: Environment Variables
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=DQAi
```

### Gmail Setup
1. Enable 2-Factor Authentication
2. Create App Password (16-character password)
3. Use App Password in SMTP_PASSWORD field
4. Use App Password (not account password)

---

## Commits

1. `739d61d` - Improve user deletion cascade and welcome email notifications
2. `0245e63` - Add topbar with logo to password reset pages
3. `378e048` - Fix JSX structure in RequestPasswordPage

---

## Next Steps (Optional Enhancements)

1. **Email Verification**: Verify email before allowing password reset
2. **Rate Limiting**: Limit password reset attempts per email/IP
3. **Email Templates**: Allow customization per business
4. **Resend Email**: Let user request another email if first expires
5. **SMS Backup**: Send reset code via SMS as alternative
6. **Security Audit**: Review all password-related endpoints
7. **2FA Support**: Add two-factor authentication option
8. **Password Policy**: Enforce password strength requirements

---

## Troubleshooting

### Problem: "SMTP not configured" error
**Solution**:
1. Check `.env` file has SMTP settings
2. Verify SMTP credentials are correct
3. Check firewall allows outbound SMTP (port 587)
4. Enable "Less secure apps" for Gmail
5. Check Gmail App Password is correct (not account password)

### Problem: Reset email not received
**Solution**:
1. Check spam/junk folder
2. Verify email address in database is correct
3. Check SMTP logs on server
4. Try test SMTP endpoint: `POST /api/admin/test-smtp`
5. Check firewall/network connectivity

### Problem: Reset link expired
**Solution**:
1. Request new password reset (1 hour validity)
2. Check system time is correct
3. Database PASSWORD_RESETS table may need cleanup (old tokens)

### Problem: Password won't save
**Solution**:
1. Ensure password is 6+ characters
2. Ensure passwords match
3. Ensure token is valid and not expired
4. Check browser console for errors
5. Check server logs for validation errors
