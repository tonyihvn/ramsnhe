# Development Server Setup Guide

## Port Configuration

Your application uses the following port configuration (defined in `.env`):

- **Frontend (Vite Dev Server)**: `9090` - React development server with HMR
- **Backend (Node.js Server)**: `3000` - Express/API server  
- **Database**: `5432` - PostgreSQL

## Starting the Development Environment

### 1. Start the Backend Server
```bash
npm run server:dev
```
This starts the Node.js Express server on `localhost:3000` with auto-reload via nodemon.

### 2. Start the Frontend Dev Server (in a separate terminal)
```bash
npm run dev
```
This starts the Vite development server on `localhost:9090` with Hot Module Replacement (HMR).

## Accessing the Application

Open your browser and navigate to:
```
http://localhost:9090
```

The frontend will automatically proxy API requests to the backend server:
- `/api/*` → `http://localhost:3000/api/`
- `/auth/*` → `http://localhost:3000/auth/`
- `/uploads/*` → `http://localhost:3000/uploads/`
- `/builds/*` → `http://localhost:3000/builds/`

## Hot Module Replacement (HMR)

The Vite dev server on port 9090 is configured with explicit HMR settings:
- **Host**: `localhost`
- **Port**: `9090` (same as dev server port)
- **Protocol**: `ws` (WebSocket)

This allows you to:
- Edit React components and see changes instantly without full page reload
- Preserve component state during edits
- View console errors in real-time

## Troubleshooting WebSocket Errors

If you see WebSocket connection errors like:
```
WebSocket connection to 'ws://localhost:9090/' failed
```

**Solutions:**
1. Ensure the dev server is running (`npm run dev`)
2. Check that port 9090 is not already in use
3. Verify your `.env` has `FRONTEND_PORT=9090`
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

## Building for Production

```bash
npm run build
```

Creates optimized production bundles in the `dist/` folder ready for deployment.

## Environment Variables

Key variables in `.env`:
- `FRONTEND_PORT=9090` - Vite dev server port
- `SERVER_PORT=3000` - Backend API server port
- `VITE_API_URL=http://172.16.12.39:3000/api` - API base URL (for network access)
- `VITE_AUTH_URL=http://172.16.12.39:3000/auth` - Auth base URL (for network access)
- `NODE_ENV=development` - Development mode

Note: `VITE_API_URL` and `VITE_AUTH_URL` are used for network access (from other machines). For localhost development, the proxy rules in vite.config.ts are used automatically.
