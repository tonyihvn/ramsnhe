# Company Registration Workflow - Quick Reference & Testing Guide

## Quick Feature Summary

✅ **Company Registration Form** - Enhanced form with company details
✅ **Email Verification** - Automated verification email with token link
✅ **Admin Notification** - Super Admin notified when email verified
✅ **Account Approval** - Super Admin can approve/reject requests
✅ **User Creation** - User account auto-created on approval with Admin role
✅ **Business Scoping** - Each company gets their own business record
✅ **Approval Emails** - Automated emails for approval/rejection with credentials

## Testing Checklist

### Step 1: Test Company Registration
- [ ] Navigate to `/login`
- [ ] Click "Register" button
- [ ] Fill all fields including company details
- [ ] Submit registration form
- [ ] Verify success message appears
- [ ] Check email inbox for verification email

### Step 2: Test Email Verification
- [ ] Find verification email from DQAi
- [ ] Copy verification link
- [ ] Click link or paste into browser
- [ ] Verify success page displays
- [ ] Confirm redirect to login page

### Step 3: Test Admin Notification
- [ ] Check Super Admin email inbox
- [ ] Look for "New Account Request" notification
- [ ] Verify email contains company details

### Step 4: Test Account Approval
- [ ] Login as Super Admin (default: admin@demo.com / DemoAdmin123!)
- [ ] Navigate to `/super-admin/account-approvals`
- [ ] Locate the pending account request
- [ ] Click Approve button
- [ ] Verify success notification

### Step 5: Test Approval Email
- [ ] Check company email for approval message
- [ ] Verify email contains login credentials
- [ ] Confirm company name and Admin role mentioned

### Step 6: Test Company Login
- [ ] Copy email and password from approval email
- [ ] Go to `/login`
- [ ] Login with provided credentials
- [ ] Verify dashboard loads with company data
- [ ] Check business is scoped correctly

### Step 7: Test Rejection
- [ ] Go to `/super-admin/account-approvals`
- [ ] Find another pending request
- [ ] Click Reject
- [ ] Enter rejection reason
- [ ] Submit rejection
- [ ] Check company receives rejection email with reason

## API Testing with cURL

### 1. Test Registration
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@testco.com",
    "password": "TestPassword123!",
    "organizationName": "Test Company",
    "phoneNumber": "+1-555-0123",
    "industry": "Technology",
    "address": "123 Tech Street",
    "website": "https://testco.com"
  }'
```

### 2. Get Pending Requests (requires auth)
```bash
curl -X GET http://localhost:5000/api/super-admin/account-requests \
  -H "Cookie: sessionid=YOUR_SESSION_ID"
```

### 3. Approve Request (requires auth)
```bash
curl -X PUT http://localhost:5000/api/super-admin/account-requests/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionid=YOUR_SESSION_ID" \
  -d '{
    "status": "approved"
  }'
```

### 4. Reject Request (requires auth)
```bash
curl -X PUT http://localhost:5000/api/super-admin/account-requests/2 \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionid=YOUR_SESSION_ID" \
  -d '{
    "status": "rejected",
    "rejection_reason": "Company information incomplete"
  }'
```

## Database Verification

### Check Account Requests Table
```sql
SELECT * FROM dqai_account_requests ORDER BY created_at DESC;
```

### Check New Business Created
```sql
SELECT * FROM dqai_businesses WHERE name = 'Test Company';
```

### Check New User Created
```sql
SELECT * FROM dqai_users WHERE email = 'jane@testco.com';
```

### Verify Status Flow
```sql
SELECT id, business_name, email, status, email_verified, created_at 
FROM dqai_account_requests 
ORDER BY created_at DESC LIMIT 5;
```

## Email Verification Details

### Verification Email Template Elements
- **To**: Company email address
- **Subject**: "Verify Your Email - DQAi Registration"
- **Link Format**: `{FRONTEND_HOST}/verify-email?token={TOKEN}`
- **Token Validity**: 24 hours
- **Link Text**: "Verify Email Address"

### Admin Notification Email Template Elements
- **To**: SUPER_ADMIN_EMAIL (from env)
- **Subject**: "New Account Request - {COMPANY_NAME}"
- **Link**: `{FRONTEND_HOST}/account-approvals`
- **Contains**: Full company and contact details

### Approval Email Template Elements
- **To**: Company email address
- **Subject**: "Your Account Has Been Approved - Welcome to DQAi!"
- **Contains**:
  - Login email
  - Temporary password (user should change)
  - Company name
  - Link to login page
- **Role**: Admin (for the company business)

### Rejection Email Template Elements
- **To**: Company email address
- **Subject**: "Account Registration Status - DQAi"
- **Contains**: Rejection reason (if provided)

## Debugging

### Enable Detailed Logging
Add to server code before handlers:
```javascript
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
```

### Check Email Sending
Look for these logs:
```
Verification email sent to jane@testco.com
Admin notification sent for account request 1
Email sent to jane@testco.com: Your Account Has Been Approved
```

### Verify Token Generation
```javascript
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');
console.log('Generated token:', token);
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Verification email not received | Check SMTP settings, verify email address is correct |
| "Email already registered" error | Clear account_requests table or use different email |
| Account approval creates no user | Check database foreign key constraints, verify business creation |
| Token expired error | Tokens valid for 24 hours, provide resend option |
| Wrong role assigned | Verify 'Admin' string in approval endpoint |
| Company data not scoped | Check business_id is set correctly on user creation |

## Performance Considerations

1. **Email Sending**: May be slow if SMTP server is distant
2. **Token Generation**: Uses crypto.randomBytes (fast)
3. **Database Queries**: Indexed on email field for quick lookup
4. **Business Creation**: Minimal impact, typically < 100ms

## Security Checklist

- [ ] Email token is cryptographically random (32 bytes)
- [ ] Token is unique (checked against database)
- [ ] Token expires after 24 hours
- [ ] Password is hashed before storing
- [ ] Super Admin check on all approval endpoints
- [ ] Account request isolation (no cross-company access)
- [ ] Email verification before approval allowed
- [ ] Passwords not exposed in responses/logs

## Deployment Notes

1. **Database Migration**: Run any pending migrations first
2. **Email Configuration**: Configure SMTP in .env before going live
3. **Super Admin Account**: Ensure super admin email is accessible
4. **Frontend URLs**: Update FRONTEND_HOST in .env
5. **SSL/TLS**: Ensure SMTP uses secure connection (port 465 or 587)
6. **Rate Limiting**: Consider adding rate limits to registration endpoint
7. **Monitoring**: Set up alerts for failed email sends

## Support Resources

- Check `COMPANY_REGISTRATION_WORKFLOW.md` for detailed documentation
- Review database schema in server initialization code
- Check email templates in API routes
- Monitor SMTP logs for delivery issues
