# DQA+ Data Collection Platform

A modern, full-stack data collection and management platform built with React, TypeScript, Express, and PostgreSQL.

## Features

- **Interactive Data Collection Forms** - Build and deploy dynamic forms with real-time validation
- **Advanced Editors** - Integrated rich text editors (TinyMCE, EditorJS, Tiptap)
- **Geographic Data** - Interactive maps with Leaflet and marker clustering
- **Data Visualization** - Charts and analytics with Chart.js
- **Document Export** - Export data to Excel, DOCX, and PDF formats
- **Multi-Database Support** - PostgreSQL, MySQL, MongoDB compatibility
- **Email Notifications** - Automated email alerts with Nodemailer
- **Secure Authentication** - BCrypt password hashing and session management

## Prerequisites

- **Node.js** v16 or higher
- **npm** v8 or higher
- **PostgreSQL** v12 or higher (or MySQL/MongoDB if preferred)
- **TinyMCE API Key** (optional, for rich text editor)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tonyihvn/ramsnhe.git
   cd ramsnhe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   ```
   NODE_ENV=production
   FRONTEND_PORT=9090
   SERVER_PORT=3000
   FRONTEND_HOSTS=https://yourdomain.com
   ALLOW_ALL_ORIGINS=false
   ALLOW_PUBLIC_ADMIN=false
   
   # Database Configuration
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=your_db_host
   DB_NAME=dqappdb
   DB_PORT=5432
   
   # Optional APIs
   TINYMCE_API_KEY=your_tinymce_key
   
   # Frontend API URLs
   VITE_API_URL=/api
   VITE_AUTH_URL=/auth
   ```

4. **Initialize database**
   - Run your database migration scripts
   - Ensure PostgreSQL (or your chosen DB) is accessible with configured credentials

5. **Build the application**
   ```bash
   npm run build
   ```

6. **Start the application**
   - **Production mode:**
     ```bash
     npm run start:server
     ```
   - **Development mode:**
     ```bash
     npm run dev      # Frontend (Vite)
     npm run server:dev  # Backend (with nodemon)
     ```

## Project Structure

```
ramsnhe/
├── components/          # React components
├── pages/              # Page components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── adapters/           # Database adapters
├── server/             # Express backend server
│   ├── index.js       # Main server entry point
│   └── superAdminRoutes.js
├── public/             # Static assets
├── index.html          # HTML template
├── App.tsx             # Main App component
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.cjs # Tailwind CSS configuration
└── package.json        # Dependencies
```

## Scripts

- `npm run dev` - Start Vite development server (frontend)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run start:server` - Start Express server
- `npm run server:dev` - Start Express server with auto-reload (nodemon)

## Deployment Guides

### 1. **Heroku Deployment**

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_PORT=80
heroku config:set SERVER_PORT=3000
heroku config:set DB_USER=your_db_user
heroku config:set DB_PASSWORD=your_db_password
heroku config:set DB_HOST=your_postgres_host
heroku config:set DB_NAME=dqappdb
heroku config:set FRONTEND_HOSTS=https://your-app-name.herokuapp.com

# Deploy
git push heroku main
```

Add a `Procfile` to root:
```
web: npm run start:server
```

### 2. **Vercel Deployment (Frontend Only)**

**Note:** Vercel is for frontend only. Deploy backend separately.

```bash
npm install -g vercel
vercel
```

Configure `vite.config.ts` for Vercel build and set `VITE_API_URL` to your backend URL.

### 3. **AWS Elastic Beanstalk**

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-20 dqaplus

# Create environment
eb create dqaplus-env

# Deploy
eb deploy

# Set environment variables
eb setenv \
  NODE_ENV=production \
  DB_USER=your_user \
  DB_PASSWORD=your_password \
  DB_HOST=your_rds_endpoint
```

### 4. **DigitalOcean App Platform**

1. Push code to GitHub
2. Connect DigitalOcean to your GitHub repository
3. Create a new app from your repository
4. Configure:
   - **HTTP Port:** 3000
   - **Build Command:** `npm install && npm run build`
   - **Run Command:** `npm run start:server`
5. Add environment variables in the dashboard
6. Deploy

### 5. **Docker Deployment**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:server"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_USER: postgres
      DB_PASSWORD: changeme
      DB_NAME: dqappdb
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: dqappdb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Deploy:
```bash
docker-compose up -d
```

### 6. **Render.com Deployment**

1. Connect your GitHub repository
2. Create new Web Service
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:server`
   - **Environment:** Node
   - **Port:** 3000
4. Add environment variables
5. Deploy

### 7. **Railway.app Deployment**

1. Connect GitHub repository
2. Create new project
3. Add PostgreSQL service
4. Configure Node.js service:
   - **Start Command:** `npm run start:server`
   - **Build Command:** `npm install && npm run build`
5. Link services and add environment variables
6. Deploy

## Database Setup

### PostgreSQL (Recommended)

1. **Create database:**
   ```sql
   CREATE DATABASE dqappdb;
   ```

2. **Connect:**
   ```
   DB_HOST=your_postgres_host
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=dqappdb
   DB_PORT=5432
   ```

### MySQL

```
DB_USER=your_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_NAME=dqappdb
DB_PORT=3306
```

### MongoDB

Ensure MongoDB connection string is configured in your database adapter.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `production` \| `development` |
| `FRONTEND_PORT` | Frontend server port | `9090` |
| `SERVER_PORT` | Backend API port | `3000` |
| `FRONTEND_HOSTS` | Allowed frontend origins (comma-separated) | `https://app.example.com` |
| `ALLOW_ALL_ORIGINS` | Allow all CORS origins (dev only) | `false` |
| `ALLOW_PUBLIC_ADMIN` | Allow public admin endpoints | `false` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_HOST` | Database host | `localhost` \| RDS endpoint |
| `DB_NAME` | Database name | `dqappdb` |
| `DB_PORT` | Database port | `5432` |
| `TINYMCE_API_KEY` | TinyMCE API key | - |
| `VITE_API_URL` | Frontend API endpoint | `/api` \| `https://api.example.com` |
| `VITE_AUTH_URL` | Frontend auth endpoint | `/auth` |

## Performance Optimization

1. **Build Optimization**
   - Production build is minified and tree-shaken by Vite
   - Use `npm run preview` to test production build locally

2. **Database Optimization**
   - Use connection pooling (configured in adapters)
   - Add indexes to frequently queried columns
   - Regular backups

3. **Frontend Optimization**
   - Code splitting enabled in Vite config
   - Lazy load components when possible
   - Optimize images (use WebP where supported)

4. **Server Optimization**
   - Use production Node.js version
   - Enable gzip compression
   - Implement caching headers

## Monitoring & Logging

- Monitor application logs via deployment platform dashboard
- Set up alerts for error rates and performance metrics
- Use database monitoring tools for query performance
- Monitor disk space and memory usage

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` to git
   - Use strong database passwords
   - Rotate API keys regularly

2. **CORS Configuration**
   - Set `FRONTEND_HOSTS` to exact production domain
   - Keep `ALLOW_ALL_ORIGINS=false` in production

3. **Database Security**
   - Use strong passwords
   - Enable SSL connections when available
   - Regular backups with encryption

4. **Session Management**
   - Use secure session cookies
   - Implement CSRF protection
   - Regular session cleanup

5. **Dependencies**
   - Keep npm packages updated
   - Use `npm audit` to check for vulnerabilities
   - Review new dependencies before adding

## Troubleshooting

**Port already in use:**
```bash
# Change port in .env or kill existing process
lsof -i :3000
kill -9 <PID>
```

**Database connection error:**
- Verify credentials in `.env`
- Check database is running and accessible
- Ensure firewall allows connection

**Build fails:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`
- Check Node.js version: `node --version`

**CORS errors:**
- Verify `FRONTEND_HOSTS` matches your domain
- Check `ALLOW_ALL_ORIGINS` setting

## Support & Documentation

For additional help:
- Check server logs for error details
- Review your deployment platform's documentation
- Check database connection strings
- Verify all environment variables are set

## License

Private - All rights reserved

## Author

Tony Ihvn (tonyihvn)
