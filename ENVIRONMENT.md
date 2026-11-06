# Environment Configuration Guide

This guide explains all environment variables needed for production deployment.

## File Location

- **Development:** Create a `.env` file in the project root (never commit to git)
- **Example:** `.env.example` contains all available variables

## Environment Variables

### Application Settings

#### NODE_ENV
```
NODE_ENV=production
```
- `production` - Production deployment (optimized, logging disabled)
- `development` - Local development (debug mode, verbose logging)

#### FRONTEND_PORT
```
FRONTEND_PORT=9090
```
- Port for frontend development server (Vite)
- Not used in production when deployed together

#### SERVER_PORT
```
SERVER_PORT=3000
```
- Port for Express API server
- **Production:** Usually proxied behind nginx/Apache at port 80/443
- **Development:** Direct access to this port

### CORS & Security Settings

#### FRONTEND_HOSTS
```
FRONTEND_HOSTS=https://yourdomain.com,https://app.yourdomain.com
```
- Comma-separated list of allowed frontend origins
- **Critical for security:** Prevents CORS attacks
- Examples:
  - Production: `https://app.example.com`
  - Multiple domains: `https://app.example.com,https://admin.example.com`
  - Localhost dev: `http://localhost:9090,http://localhost:3000`

#### ALLOW_ALL_ORIGINS
```
ALLOW_ALL_ORIGINS=false
```
- Allow requests from any origin
- **⚠️ NEVER set to `true` in production**
- Dev only: Set to `true` for easier local testing, disable in production

#### ALLOW_PUBLIC_ADMIN
```
ALLOW_PUBLIC_ADMIN=false
```
- Allow public (unauthenticated) access to admin endpoints
- **⚠️ NEVER set to `true` in production**
- Dev only: Set for testing admin features without authentication

### Database Configuration

#### PostgreSQL (Recommended)

```
DB_USER=dqaplus_user
DB_PASSWORD=your_secure_password_here
DB_HOST=localhost
DB_NAME=dqappdb
DB_PORT=5432
```

**Setup Instructions:**

1. **Create database:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE dqappdb;
   CREATE USER dqaplus_user WITH PASSWORD 'your_secure_password_here';
   GRANT ALL PRIVILEGES ON DATABASE dqappdb TO dqaplus_user;
   \q
   ```

2. **Remote server (AWS RDS):**
   ```
   DB_HOST=dqaplus-db.c9akciq32.us-east-1.rds.amazonaws.com
   DB_USER=admin
   DB_PASSWORD=your_rds_password
   DB_NAME=dqappdb
   DB_PORT=5432
   ```

3. **Docker Compose:**
   ```
   DB_HOST=postgres
   DB_USER=postgres
   DB_PASSWORD=changeme
   DB_NAME=dqappdb
   DB_PORT=5432
   ```

#### MySQL

```
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_NAME=dqappdb
DB_PORT=3306
```

#### MongoDB

Ensure MongoDB connection string is configured in `server/index.js`.

### External Services

#### TINYMCE_API_KEY
```
TINYMCE_API_KEY=your_tinymce_api_key_here
```
- Get key from https://www.tiny.cloud
- Free tier available (up to 250k API calls/month)
- **Steps:**
  1. Sign up for TinyMCE Cloud account
  2. Get API key from dashboard
  3. Add to `.env`

### Frontend API URLs

#### VITE_API_URL
```
VITE_API_URL=/api
```
- Backend API endpoint for frontend
- **Development:** `/api` (proxied by Vite dev server)
- **Production (same domain):** `/api`
- **Production (different domain):** `https://api.example.com`

#### VITE_AUTH_URL
```
VITE_AUTH_URL=/auth
```
- Authentication endpoint
- **Development:** `/auth`
- **Production:** Same as `VITE_API_URL` with `/auth` prefix

## Environment Setup by Platform

### Local Development

```env
NODE_ENV=development
FRONTEND_PORT=9090
SERVER_PORT=3000
FRONTEND_HOSTS=http://localhost:9090,http://localhost:3000
ALLOW_ALL_ORIGINS=true
ALLOW_PUBLIC_ADMIN=true

DB_USER=postgres
DB_PASSWORD=changeme
DB_HOST=localhost
DB_NAME=dqappdb
DB_PORT=5432

VITE_API_URL=/api
VITE_AUTH_URL=/auth
```

### Heroku Production

```env
NODE_ENV=production
SERVER_PORT=3000
FRONTEND_HOSTS=https://dqaplus-prod.herokuapp.com
ALLOW_ALL_ORIGINS=false
ALLOW_PUBLIC_ADMIN=false

# Heroku provides DATABASE_URL automatically
# But you can override with:
DB_USER=<from_DATABASE_URL>
DB_PASSWORD=<from_DATABASE_URL>
DB_HOST=<from_DATABASE_URL>
DB_NAME=dqappdb
DB_PORT=5432

VITE_API_URL=/api
VITE_AUTH_URL=/auth
TINYMCE_API_KEY=your_key
```

### DigitalOcean / Docker

```env
NODE_ENV=production
SERVER_PORT=3000
FRONTEND_HOSTS=https://your-domain.com
ALLOW_ALL_ORIGINS=false
ALLOW_PUBLIC_ADMIN=false

DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=postgres
DB_NAME=dqappdb
DB_PORT=5432

VITE_API_URL=https://your-domain.com/api
VITE_AUTH_URL=https://your-domain.com/auth
TINYMCE_API_KEY=your_key
```

### AWS Elastic Beanstalk

```env
NODE_ENV=production
SERVER_PORT=3000
FRONTEND_HOSTS=https://dqaplus-prod.eb.us-east-1.elasticbeanstalk.com
ALLOW_ALL_ORIGINS=false
ALLOW_PUBLIC_ADMIN=false

DB_USER=admin
DB_PASSWORD=your_rds_password
DB_HOST=dqaplus-db.c9akciq32.us-east-1.rds.amazonaws.com
DB_NAME=dqappdb
DB_PORT=5432

VITE_API_URL=/api
VITE_AUTH_URL=/auth
TINYMCE_API_KEY=your_key
```

### Vercel (Frontend Only) + Railway (Backend)

**Vercel Environment Variables:**
```env
VITE_API_URL=https://dqaplus-api.railway.app/api
VITE_AUTH_URL=https://dqaplus-api.railway.app/auth
```

**Railway Environment Variables:**
```env
NODE_ENV=production
SERVER_PORT=3000
FRONTEND_HOSTS=https://your-vercel-app.vercel.app
ALLOW_ALL_ORIGINS=false
ALLOW_PUBLIC_ADMIN=false

DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=your-railway-db-host
DB_NAME=dqappdb
DB_PORT=5432

VITE_API_URL=/api
VITE_AUTH_URL=/auth
TINYMCE_API_KEY=your_key
```

## Security Best Practices

### Secrets Management

1. **Never commit `.env` to git:**
   ```bash
   # Verify .gitignore contains .env
   grep "^\.env$" .gitignore
   ```

2. **Use platform-specific secret storage:**
   - Heroku: `heroku config:set`
   - DigitalOcean: Dashboard or CLI
   - AWS: AWS Secrets Manager
   - Vercel: Project settings
   - Railway: Environment tab

3. **Rotate secrets periodically:**
   - Database passwords (monthly)
   - API keys (quarterly)
   - TinyMCE keys (as needed)

### Password Requirements

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Avoid common words or patterns
- Use random generators: `openssl rand -base64 32`

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `ALLOW_ALL_ORIGINS` | `true` | `false` |
| `ALLOW_PUBLIC_ADMIN` | `true` | `false` |
| `DB_PASSWORD` | Can be simple | Must be strong |
| `.env` committed | NO | NO |
| Logs | Verbose | Minimal |

## Verifying Configuration

### Check Environment Variables

```bash
# Show all variables (except passwords)
env | grep -E "NODE_ENV|SERVER_PORT|FRONTEND_HOSTS|DB_HOST|VITE_"
```

### Test Database Connection

```bash
# PostgreSQL
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "SELECT version();"

# MySQL
mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST $DB_NAME -e "SELECT VERSION();"
```

### Test Application

```bash
# Start server
npm run start:server

# In another terminal, test API
curl http://localhost:3000/health

# Should return success
```

## Troubleshooting Configuration

### Issue: "Cannot find database"
- Check `DB_HOST` is reachable
- Verify `DB_NAME` exists
- Confirm `DB_USER` and `DB_PASSWORD` are correct

### Issue: "CORS error"
- Check `FRONTEND_HOSTS` matches your domain exactly
- Ensure `ALLOW_ALL_ORIGINS=false` for production

### Issue: "TinyMCE not loading"
- Verify `TINYMCE_API_KEY` is set
- Key must be valid and active
- Check browser console for errors

### Issue: "Wrong API endpoint"
- Verify `VITE_API_URL` points to correct server
- In development: `/api`
- In production: Full URL if different domain

## Configuration Checklist

- [ ] `.env` file created (not in git)
- [ ] All required variables set
- [ ] Database credentials verified
- [ ] TinyMCE API key obtained (if using)
- [ ] `FRONTEND_HOSTS` set to production domain
- [ ] `ALLOW_ALL_ORIGINS=false` in production
- [ ] `ALLOW_PUBLIC_ADMIN=false` in production
- [ ] `NODE_ENV=production` in production
- [ ] Database reachable from application server
- [ ] All passwords are strong and secure
- [ ] Configuration tested locally before deploying
