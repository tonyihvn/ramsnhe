# Company Registration Workflow with Email Verification and Admin Approval

## Overview
This implementation adds a complete company registration workflow that includes:
1. Email verification for registered companies
2. Account approval by Super Admin
3. Automatic user account creation upon approval
4. Email notifications at each stage

## Database Changes

### New Table: `account_requests`
Created a new table to store pending company registration requests before they're approved.

**Columns:**
- `id` - Primary key
- `first_name` - Contact person's first name
- `last_name` - Contact person's last name
- `email` - Company contact email (unique)
- `password` - Hashed password (will be rehashed before creating user)
- `business_name` - Company name
- `phone_number` - Company phone
- `industry` - Industry/sector
- `address` - Company address
- `website` - Company website
- `email_verification_token` - Token for email verification
- `email_verified` - Boolean flag for email verification status
- `email_verified_at` - Timestamp of email verification
- `status` - 'pending', 'approved', or 'rejected'
- `rejection_reason` - Reason if rejected
- `approved_by` - User ID of approving admin
- `created_at` - Registration request creation timestamp
- `updated_at` - Last update timestamp

### Table Prefix Updated
Added `ACCOUNT_REQUESTS: 'account_requests'` to `tablePrefix.js` for consistency with table naming convention.

## API Endpoints

### Registration Endpoint (Public)
**POST /auth/register**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "password": "securePassword123",
  "organizationName": "Acme Corp",
  "phoneNumber": "+1234567890",
  "industry": "Technology",
  "address": "123 Main St, City, Country",
  "website": "https://acme.com"
}
```

**Response:**
- Creates account request record with 'pending' status
- Sends email verification email to provided address
- Returns account request summary with registration status message

### Email Verification Endpoint (Public)
**GET /auth/verify-account-email?token=VERIFICATION_TOKEN**

**Actions:**
- Validates email verification token
- Marks account request as email_verified
- Sends notification email to Super Admin
- Redirects to `/email-verified?accountId=REQUEST_ID` page

### Account Requests Endpoints (Super Admin Only)

#### Get All Pending Requests
**GET /api/super-admin/account-requests**
- Returns list of all account requests (filtered by status)
- Shows: business name, contact email, verification status, created date

#### Get Specific Request Details
**GET /api/super-admin/account-requests/:requestId**
- Returns full details of a specific account request

#### Approve or Reject Request
**PUT /api/super-admin/account-requests/:requestId**
```json
{
  "status": "approved",  // or "rejected"
  "rejection_reason": "Optional reason for rejection"
}
```

**On Approval:**
1. Creates new business record
2. Creates user account with 'Admin' role for that business
3. Updates account request to 'approved' status
4. Sends approval email with login credentials

**On Rejection:**
1. Updates account request to 'rejected' status
2. Sends rejection email with reason (if provided)

## Email Flows

### 1. Registration Email (Sent to Company)
- Subject: "Verify Your Email - DQAi Registration"
- Contains: Verification link with token (valid for 24 hours)
- Action: Links to `/auth/verify-account-email?token=XXX`

### 2. Admin Notification Email (Sent to Super Admin)
- Subject: "New Account Request - [Company Name]"
- Contains: Company details and link to account approvals page
- Triggers: When company verifies their email

### 3. Approval Email (Sent to Company)
- Subject: "Your Account Has Been Approved - Welcome to DQAi!"
- Contains: Login credentials and frontend link
- Triggers: When Super Admin approves the request

### 4. Rejection Email (Sent to Company)
- Subject: "Account Registration Status - DQAi"
- Contains: Rejection reason (if provided)
- Triggers: When Super Admin rejects the request

## Frontend Changes

### New Page: EmailVerificationPage
**Location:** `pages/EmailVerificationPage.tsx`
- Shows email verification success/failure
- Displays status message and next steps
- Auto-redirects to login after 5 seconds

### Updated: LoginPage
**Location:** `pages/LoginPage.tsx`
**Changes:**
- Registration modal now includes company information fields
- New fields: industry, address, website
- Better form organization with section headers
- Updated messaging to reflect email verification requirement
- Larger modal to accommodate all fields with scrolling

### Updated: App.tsx
**Changes:**
- Added import for EmailVerificationPage
- Added route: `/email-verified` -> EmailVerificationPage

### Updated: appRoutes.ts
**Changes:**
- Added `/email-verified` route
- Added `/super-admin/account-approvals` route

## Workflow Diagram

```
1. Company Registration Form Submission
   ↓
2. POST /auth/register
   ├─ Creates account_requests record with status='pending'
   ├─ Generates email verification token
   └─ Sends verification email to company
   ↓
3. Company Clicks Verification Link
   ├─ GET /auth/verify-account-email?token=XXX
   ├─ Marks email as verified
   ├─ Sends notification to Super Admin
   └─ Redirects to email-verified page
   ↓
4. Super Admin Reviews & Approves
   ├─ PUT /api/super-admin/account-requests/ID
   ├─ Creates business record
   ├─ Creates user account with Admin role
   ├─ Updates request status to 'approved'
   └─ Sends approval email with credentials
   ↓
5. Company Can Now Login
   └─ Email + Password from approval email
```

## Security Considerations

1. **Email Verification**: Ensures valid email ownership before approval
2. **Token Expiration**: Verification tokens expire after 24 hours
3. **Role Assignment**: New companies get 'Admin' role for their business
4. **Business Isolation**: Each company gets their own business record with proper scoping
5. **Password Handling**: Original registration password is stored temporarily, then replaced by hashed version before account creation
6. **Super Admin Only**: Approval endpoints protected with Super Admin role check

## Testing the Workflow

### Manual Testing Steps:

1. **Start Registration:**
   - Open login page, click Register
   - Fill in all company details
   - Submit form

2. **Verify Email:**
   - Check email for verification link
   - Click link and verify email
   - Confirm redirection to email-verified page

3. **Admin Approval:**
   - Login as super-admin
   - Go to Super Admin → Account Approvals
   - Review pending account requests
   - Click Approve/Reject

4. **Company Login:**
   - Use credentials from approval email
   - Verify account is active and company data is available

### Sample Test Data:
```
First Name: Jane
Last Name: Smith
Email: jane.smith@testcompany.com
Password: TestPassword123!
Company: Test Company Ltd
Phone: +1-555-0123
Industry: Healthcare
Address: 456 Oak Ave, Boston, MA
Website: https://testcompany.com
```

## Configuration

### Environment Variables Required:
- `SMTP_HOST` - Email server hostname
- `SMTP_PORT` - Email server port (usually 587 or 465)
- `SMTP_USER` - Email account username
- `SMTP_PASSWORD` - Email account password
- `SMTP_FROM_EMAIL` - "From" email address
- `SMTP_FROM_NAME` - "From" display name (default: 'DQAi')
- `SUPER_ADMIN_EMAIL` - Super admin email (for notifications)
- `FRONTEND_HOST` - Frontend URL for email links

### Optional Configuration:
- `TABLE_PREFIX` - Database table prefix (default: 'dqai_')

## Files Modified

1. **server/tablePrefix.js** - Added ACCOUNT_REQUESTS table reference
2. **server/index.js** - Added account_requests table creation and /auth/verify-account-email endpoint
3. **server/superAdminRoutes.js** - Added account request management endpoints
4. **pages/LoginPage.tsx** - Enhanced registration form with company fields
5. **pages/EmailVerificationPage.tsx** - New page for email verification confirmation
6. **App.tsx** - Added EmailVerificationPage import and route
7. **appRoutes.ts** - Added new routes to route list

## Future Enhancements

1. **Email Template Customization**: Allow admins to customize email templates
2. **Additional Verification Methods**: Add phone verification option
3. **Company Logo Upload**: Allow companies to upload logos during registration
4. **Bulk Import**: Super admin can import pre-approved companies
5. **Registration Form Customization**: Configurable required fields
6. **Auto-approval Rules**: Set criteria for automatic approval
7. **Approval Workflow**: Multi-level approval process
8. **Registration Analytics**: Track registration completion rates

## Troubleshooting

### Issue: Verification emails not sent
**Solution:** Verify SMTP settings in .env file, check email logs

### Issue: Account approval not creating user
**Solution:** Check database for foreign key constraints, verify business creation succeeded

### Issue: Verification link expired
**Solution:** Link is valid for 24 hours; provide option to resend verification email

### Issue: Company can't login after approval
**Solution:** Verify user status is 'Active', check business_id is set correctly

## Support & Maintenance

- Monitor email sending failures through SMTP logs
- Regularly clean up expired verification tokens
- Archive old account requests for compliance
- Review approval workflow for bottlenecks
