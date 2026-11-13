# Development Setup and Workflow

## Port Configuration Overview

Your application is configured to run on:
- **Frontend**: Port `9090` (Vite React dev server)
- **Backend**: Port `3000` (Express API server)
- **Database**: Port `5432` (PostgreSQL)

This configuration is set in your `.env` file:
```env
FRONTEND_PORT=9090
SERVER_PORT=3000
```

## Starting Development

### Step 1: Start Backend Server (Terminal 1)
```bash
npm run server:dev
```

**Expected output:**
```
Server running on port 3000
✓ Database connected
✓ Migrations completed
```

### Step 2: Start Frontend Dev Server (Terminal 2)
```bash
npm run dev
```

**Expected output:**
```
  VITE v4.5.3  building for development...
  
  ➜  Local:   http://localhost:9090
  ➜  press h to show help
```

### Step 3: Open Application
```
http://localhost:9090
```

## Hot Module Replacement (HMR)

The frontend is configured with explicit HMR settings:
- **Host**: `localhost`
- **Port**: `9090`
- **Protocol**: `WebSocket (ws)`

This means:
- Edit React components → See changes instantly
- Browser auto-refreshes components
- Component state is preserved
- No full page reload needed

## API Proxy Configuration

The Vite dev server automatically proxies API requests:

```
Browser Request → Vite Dev Server → Backend Server
http://localhost:9090/api/... → http://localhost:3000/api/...
```

Proxied routes:
- `/api/*` → `http://localhost:3000/api/`
- `/auth/*` → `http://localhost:3000/auth/`
- `/uploads/*` → `http://localhost:3000/uploads/`
- `/builds/*` → `http://localhost:3000/builds/`

## Troubleshooting

### WebSocket Connection Failed
```
WebSocket connection to 'ws://localhost:9090/' failed
```

**Solutions:**
1. Ensure frontend dev server is running: `npm run dev`
2. Check port 9090 is free: `netstat -ano | findstr :9090`
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. HMR is now explicitly configured in `vite.config.ts`

### Backend Not Responding (5xx errors)
```
GET http://localhost:3000/api/... returned 500
```

**Solutions:**
1. Check backend is running: `npm run server:dev`
2. Verify port 3000 is free: `netstat -ano | findstr :3000`
3. Check backend logs for errors
4. Database connectivity: Verify PostgreSQL is running

### Port Already in Use

If you get "EADDRINUSE" error:

**For Windows:**
```bash
# Find process on port 9090
netstat -ano | findstr :9090

# Kill process by PID (replace XXXX with PID)
taskkill /PID XXXX /F
```

## Build and Deployment

### Development Build (already tested)
```bash
npm run build
```

Creates optimized production bundles in `dist/` folder.

**Build includes:**
- React components compiled to JavaScript
- CSS bundled and optimized
- Assets minified
- Code splitting configured
- No dev dependencies included

### Preview Production Build
```bash
npm run preview
```

Serves the `dist/` folder locally for testing before deployment.

## Recent Configuration Changes

### Vite Config Updates (`vite.config.ts`)
- ✅ Added explicit HMR configuration
- ✅ Configured server ports from `.env`
- ✅ Set up API proxies to backend
- ✅ Added React vendor chunk splitting

### Dependencies
- React downgraded to `^18.3.1` (from ^19.2.0) for stability
- Vite downgraded to `4.5.3` (from 7.2.2) for compatibility
- All CommonJS libraries properly handled in build

### Environment
- `FRONTEND_PORT=9090` - Primary frontend port
- `SERVER_PORT=3000` - Backend API port
- Other environment variables in `.env` already configured

## Common Commands Reference

```bash
# Start development
npm run dev              # Frontend (Vite) on 9090
npm run server:dev      # Backend (Express) on 3000

# Build for production
npm run build            # Creates dist/ folder
npm run preview          # Preview production build

# Database
npm run migrate          # Run database migrations
npm run vanna:setup      # Initialize Vanna AI setup

# Utilities
npm install             # Install dependencies
npm audit              # Check for vulnerabilities
npm audit fix          # Auto-fix vulnerabilities
```

## Accessing the Application

### Local Development
```
http://localhost:9090
```

### Network Access (from other machines)
Use IP address from `.env`:
```
http://172.16.12.39:9090
```

**Note:** For network access, ensure:
- Backend is accessible from other machines
- Firewall allows port 9090
- `.env` has correct network IP

## Project Structure

```
ramsnhe/
├── pages/              # React page components
├── components/         # React UI components
├── hooks/              # Custom React hooks (useData, useTheme, etc.)
├── server/             # Express backend server
├── dist/               # Production build output
├── node_modules/       # Dependencies
├── vite.config.ts      # Vite configuration
├── .env                # Environment variables
└── package.json        # Project metadata and scripts
```

## Next Steps

1. ✅ Verify build is working: `npm run build` (completed)
2. ✅ Start backend: `npm run server:dev` (in Terminal 1)
3. ✅ Start frontend: `npm run dev` (in Terminal 2)
4. Open `http://localhost:9090` in browser
5. Test features and development workflow

## Notes

- All build issues have been resolved
- Downgraded to compatible versions for stability
- HMR now explicitly configured to prevent WebSocket errors
- Production build ready for deployment
- Development workflow optimized for rapid iteration
