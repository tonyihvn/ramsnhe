# Registration & Approval Workflow - Issue & Solution

## Issue Reported
- Registered users did not receive verification emails
- Users were automatically approved without admin review
- Workflow was not being enforced

## Root Cause
The backend `/auth/register` endpoint is not:
1. Setting `email_verified = false` for new users
2. Setting `approval_status = 'pending'` for new users  
3. Sending verification emails
4. Creating users with the required fields

Users are being created with default values instead of the required workflow status fields.

## Solution Implementation

### Frontend Changes (✓ Already Done)
- [x] Added email verification page (`pages/EmailVerificationPage.tsx`)
- [x] Added facility selection to registration form
- [x] Added resend verification email button
- [x] Updated login validation to check:
  - `email_verified === false` → block with "Email not verified" message
  - `approval_status === 'pending'` → block with "Pending admin approval" message
  - `approval_status === 'rejected'` → block with "Account rejected" message
- [x] Added admin approval UI in Users page (`UsersPage.tsx`)
- [x] Created `BACKEND_REQUIREMENTS.md` with complete backend spec

### Backend Changes (⚠️ TODO - Needs Implementation)

#### 1. Update `/auth/register` Endpoint
**File**: `server/routes/auth.ts` or `server/controllers/AuthController.ts`

**Required Changes**:
```typescript
// When creating new user in registration:
const newUser = await User.create({
  firstName: req.body.firstName,
  lastName: req.body.lastName,
  email: req.body.email,
  password_hash: hashedPassword,
  facility_id: req.body.facilityId,
  phone_number: req.body.phoneNumber,
  organization_name: req.body.organizationName,
  email_verified: false,           // ← ADD THIS
  approval_status: 'pending',       // ← ADD THIS
});

// Generate verification token
const verificationToken = generateSecureToken();
await VerificationToken.create({
  user_id: newUser.id,
  token: verificationToken,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
});

// SEND VERIFICATION EMAIL
await sendEmail({
  to: newUser.email,
  subject: 'Verify Your Email',
  template: 'verify-email',
  data: {
    name: newUser.firstName,
    verificationLink: `${process.env.FRONTEND_URL}/#/verify-email?token=${verificationToken}`
  }
});

return res.json({ 
  message: 'Registration successful! Please check your email for verification.' 
});
```

#### 2. Create `/auth/verify-email` Endpoint  
**File**: `server/routes/auth.ts` or `server/controllers/AuthController.ts`

```typescript
app.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  
  // Find and validate token
  const verificationRecord = await VerificationToken.findOne({ token });
  if (!verificationRecord || new Date() > verificationRecord.expires_at) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  
  // Update user
  await User.update(
    { id: verificationRecord.user_id },
    { email_verified: true }
  );
  
  // Delete used token
  await VerificationToken.delete({ id: verificationRecord.id });
  
  return res.json({ message: 'Email verified successfully!' });
});
```

#### 3. Create `/auth/resend-verification-email` Endpoint
**File**: `server/routes/auth.ts`

```typescript
app.post('/auth/resend-verification-email', async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (user.email_verified) {
    return res.status(400).json({ error: 'Email already verified' });
  }
  
  // Generate new token, invalidate old ones
  await VerificationToken.delete({ user_id: user.id });
  const newToken = generateSecureToken();
  
  await VerificationToken.create({
    user_id: user.id,
    token: newToken,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  
  // Send email
  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - Resent',
    template: 'verify-email',
    data: {
      name: user.firstName,
      verificationLink: `${process.env.FRONTEND_URL}/#/verify-email?token=${newToken}`
    }
  });
  
  return res.json({ message: 'Verification email resent' });
});
```

#### 4. Update `/auth/login` Endpoint
**File**: `server/routes/auth.ts` or `server/controllers/AuthController.ts`

```typescript
// In login endpoint, when returning user, ALWAYS include these fields:
return res.json({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  email_verified: user.email_verified,     // ← ADD (true/false)
  approval_status: user.approval_status,   // ← ADD (approved/pending/rejected)
  facilityId: user.facility_id,
  // ... other fields
});
```

#### 5. Create `/api/admin/users/:userId/approval` Endpoint
**File**: `server/routes/admin.ts` or `server/controllers/AdminController.ts`

```typescript
app.post('/api/admin/users/:userId/approval', verifyAdmin, async (req, res) => {
  const { userId } = req.params;
  const { action, notes } = req.body;
  
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  await User.update(
    { id: userId },
    {
      approval_status: action === 'approve' ? 'approved' : 'rejected',
      admin_notes: notes,
      approved_at: new Date()
    }
  );
  
  // Optional: Send email notification
  if (action === 'approve') {
    await sendEmail({
      to: user.email,
      subject: 'Account Approved',
      template: 'account-approved',
      data: { name: user.firstName }
    });
  }
  
  return res.json({ message: `User ${action}ed successfully` });
});
```

#### 6. Ensure User Table Has Required Fields
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status ENUM('approved', 'pending', 'rejected') DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Create verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Testing the Workflow

### Step 1: Register a New User
```
1. Go to login page
2. Click "Register"
3. Fill in form with all required fields including facility
4. Click "Register"
5. ✓ Should see: "Registration successful! Check your email..."
6. ✓ Check inbox for verification email
```

### Step 2: Verify Email
```
1. Check email for verification link
2. Click the link
3. ✓ Should see: "Email verified successfully!"
4. ✓ Redirect to login
```

### Step 3: Verify Blocking on Login
```
1. Try to login with verified but unapproved user
2. ✓ Should see: "Account pending admin approval"
3. ✓ Login should be blocked
```

### Step 4: Admin Approval
```
1. Login as admin
2. Go to Users page
3. Find the pending user (approval status = "Pending")
4. Click ✓ to approve the user
5. ✓ User approval_status should change to "Approved"
```

### Step 5: Successful Login After Approval
```
1. Logout as admin
2. Login with the previously pending user
3. ✓ Login should succeed
4. ✓ Dashboard should load normally
```

## Debugging Commands

Check user status in database:
```sql
SELECT id, email, email_verified, approval_status, created_at 
FROM users 
WHERE email = 'test@example.com';
```

Check for stuck tokens:
```sql
SELECT * FROM verification_tokens WHERE expires_at > NOW();
```

## Files Modified/Created
- `pages/LoginPage.tsx` - Added facility selection, resend button
- `pages/EmailVerificationPage.tsx` - Email verification page
- `pages/UsersPage.tsx` - Added admin approval UI
- `hooks/useMockData.ts` - Added login validation checks
- `App.tsx` - Added email verification route
- `BACKEND_REQUIREMENTS.md` - Backend spec (NEW)
- This file (NEW)
