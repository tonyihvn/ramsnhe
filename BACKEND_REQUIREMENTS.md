# Backend Requirements for Email Verification & Admin Approval Workflow

## Overview
This document outlines the backend requirements for the email verification and admin approval workflow implemented in the frontend.

## User Registration Endpoint: `POST /auth/register`

### Request Payload
```json
{
  "firstName": "string",
  "lastName": "string", 
  "email": "string",
  "password": "string",
  "facilityId": "string|number",
  "phoneNumber": "string (optional)",
  "organizationName": "string (optional)"
}
```

### Response (Success - 200)
```json
{
  "message": "Registration successful! Please check your email for verification.",
  "userId": "string|number"
}
```

### Backend Actions Required
1. **Validate Input**: Check all required fields are present and valid
2. **Check Email Uniqueness**: Ensure email doesn't already exist
3. **Create User with Status Fields**:
   ```sql
   INSERT INTO users (firstName, lastName, email, password_hash, facility_id, phone_number, organization_name)
   VALUES (...)
   SET email_verified = FALSE
   SET approval_status = 'pending'
   SET created_at = NOW()
   ```

4. **Generate Verification Token**:
   - Create a unique, time-limited token (suggest: 24-48 hour expiry)
   - Store token mapping: `user_id -> token` in a verification table or as a JWT

5. **Send Verification Email**:
   - Email subject: "Verify your email - [App Name]"
   - Include verification link: `{FRONTEND_URL}/#/verify-email?token={TOKEN}`
   - Include instructions about admin approval requirement

6. **Return Success Response** with confirmation message

---

## Email Verification Endpoint: `POST /auth/verify-email`

### Request Payload
```json
{
  "token": "string"
}
```

### Response (Success - 200)
```json
{
  "message": "Email verified successfully. Your account is pending admin approval.",
  "user": {
    "id": "string|number",
    "email": "string",
    "email_verified": true,
    "approval_status": "pending"
  }
}
```

### Backend Actions Required
1. **Validate Token**:
   - Check token exists and hasn't expired
   - Return 400/401 error if invalid or expired

2. **Update User**:
   ```sql
   UPDATE users
   SET email_verified = TRUE
   WHERE id = (lookup from token)
   ```

3. **Return Success Response** confirming email is verified and awaiting admin approval

---

## Admin User Approval Endpoint: `POST /api/admin/users/:userId/approval`

### Request Payload
```json
{
  "action": "approve" | "reject",
  "notes": "string (optional - admin notes)"
}
```

### Response (Success - 200)
```json
{
  "message": "User has been approved/rejected",
  "user": {
    "id": "string|number",
    "email": "string",
    "approval_status": "approved" | "rejected",
    "email_verified": true
  }
}
```

### Backend Actions Required
1. **Authorization Check**: Verify requesting user is admin
2. **Validate User Exists**: Check userId exists
3. **Update User Status**:
   ```sql
   UPDATE users
   SET approval_status = 'approved' | 'rejected'
   SET admin_notes = ?
   SET approved_at = NOW()
   WHERE id = ?
   ```

4. **Optional: Send Notification Email**:
   - If approved: "Your account has been approved. You can now log in."
   - If rejected: "Your account registration was rejected. Contact admin if you have questions."

5. **Return Success Response**

---

## Resend Verification Email Endpoint: `POST /auth/resend-verification-email`

### Request Payload
```json
{
  "email": "string"
}
```

### Response (Success - 200)
```json
{
  "message": "Verification email has been resent. Please check your inbox."
}
```

### Backend Actions Required
1. **Find User** by email
2. **Check Status**:
   - If already verified: Return error "Email already verified"
   - If approved: Return error "Account already approved"
   - Continue if pending verification

3. **Generate New Token** (invalidate old one if exists)
4. **Send Email** with new verification link
5. **Return Success Response**

---

## Login Endpoint: `POST /auth/login` (Modified)

### Request Payload
```json
{
  "email": "string",
  "password": "string"
}
```

### Response (Success - 200)
```json
{
  "id": "string|number",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "string",
  "email_verified": true|false,
  "approval_status": "approved" | "pending" | "rejected" | null,
  "facilityId": "string|number"
}
```

### Important: Return Both Fields Always
- `email_verified`: Must be included (true/false)
- `approval_status`: Must be included (approved/pending/rejected/null)

### Login Validation (Frontend Side)
```typescript
// Blocked access if:
1. email_verified === false  → "Please verify your email"
2. approval_status === 'pending' → "Account pending admin approval"
3. approval_status === 'rejected' → "Account has been rejected"

// Allowed access if:
1. email_verified === true AND
2. (approval_status === 'approved' OR approval_status === null)
```

---

## User Structure for New Registrations

Required database columns:
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  facility_id INT,
  phone_number VARCHAR(20),
  organization_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'User',
  email_verified BOOLEAN DEFAULT FALSE,
  approval_status ENUM('approved', 'pending', 'rejected') DEFAULT 'pending',
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  admin_notes TEXT,
  ...other columns
);
```

---

## Workflow Summary

```
1. User Registers
   ↓
2. Backend creates user with:
   - email_verified = FALSE
   - approval_status = 'pending'
   - Sends verification email with token
   ↓
3. User clicks email verification link
   ↓
4. Backend updates:
   - email_verified = TRUE
   - approval_status remains 'pending'
   ↓
5. Admin reviews user in Users management page
   ↓
6. Admin clicks Approve/Reject
   ↓
7. Backend updates:
   - approval_status = 'approved' | 'rejected'
   ↓
8. User attempts login
   ↓
9. Frontend validates:
   - email_verified === TRUE ✓
   - approval_status === 'approved' ✓
   ↓
10. Access Granted ✓
```

---

## Testing Checklist

- [ ] New user registration creates user with email_verified=false, approval_status='pending'
- [ ] Verification email is sent after registration
- [ ] Email verification link works and sets email_verified=true
- [ ] Admin approval endpoint works and sets approval_status='approved'
- [ ] Login blocks unverified emails with proper error message
- [ ] Login blocks pending approval accounts with proper error message
- [ ] Login blocks rejected accounts with proper error message
- [ ] Login allows verified and approved users
- [ ] Resend verification email works
- [ ] All responses include email_verified and approval_status fields

