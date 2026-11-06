# Quick Start Guide - Deployment Options

Choose your deployment method below and follow the steps.

## 🚀 Option 1: Docker + DigitalOcean (Recommended - Most Affordable)

**Estimated Cost:** $5-12/month | **Difficulty:** Medium

### Step 1: Prepare Locally
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
docker --version
docker-compose --version

# Build and test locally
docker-compose up

# Access at http://localhost:3000
```

### Step 2: Create DigitalOcean Account & Droplet
1. Sign up at https://www.digitalocean.com
2. Create Ubuntu 22.04 droplet (Basic, $5/month)
3. Get droplet IP address

### Step 3: Deploy
```bash
# SSH into your droplet
ssh root@your.droplet.ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
exit  # Reconnect to apply group changes

# Clone your repository
git clone https://github.com/tonyihvn/ramsnhe.git
cd ramsnhe

# Create .env file
nano .env
# Add your database password and domain

# Deploy
docker-compose up -d

# Check if running
docker-compose ps

# View logs
docker-compose logs -f app
```

### Step 3.5: Setup Domain (Optional but Recommended)
```bash
# Install Nginx as reverse proxy
sudo apt update && sudo apt install -y nginx

# Edit Nginx config
sudo nano /etc/nginx/sites-available/default

# Add this inside server block:
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# Restart Nginx
sudo systemctl restart nginx

# Get SSL certificate (free with Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**✅ Done! Your app is live!**

---

## ⚡ Option 2: Heroku (Simple, Best for Getting Started)

**Estimated Cost:** Free (with limitations) - $7+/month (with database)  
**Difficulty:** Easy

### Step 1: Create Heroku Account
1. Sign up at https://www.heroku.com
2. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Deploy
```bash
# Login
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL database
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_HOSTS=https://your-app-name.herokuapp.com
heroku config:set TINYMCE_API_KEY=your_key

# Deploy from git
git push heroku main

# View logs
heroku logs --tail

# Your app is live at: https://your-app-name.herokuapp.com
```

**✅ Done! Your app is live!**

---

## 🔧 Option 3: AWS Elastic Beanstalk (Scalable, Enterprise)

**Estimated Cost:** $10-20/month  
**Difficulty:** Medium-Hard

### Step 1: Setup AWS Account & Install EB CLI
```bash
# Create AWS account at https://aws.amazon.com
# Install AWS CLI and EB CLI
pip install awsebcli

# Configure AWS credentials
aws configure
```

### Step 2: Deploy
```bash
# Initialize EB app
eb init -p node.js-20 dqaplus --region us-east-1

# Create environment
eb create dqaplus-prod

# Create RDS Database (via AWS Console)
# Get database endpoint

# Set environment variables
eb setenv \
  NODE_ENV=production \
  DB_HOST=your-rds-endpoint \
  DB_USER=admin \
  DB_PASSWORD=your_password

# Deploy
eb deploy

# Open app in browser
eb open
```

**✅ Done! Your app is live!**

---

## 🎯 Option 4: Vercel (Frontend) + Railway (Backend)

**Estimated Cost:** Free or $5-10/month  
**Difficulty:** Easy-Medium

### Frontend on Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Backend on Railway
1. Go to https://railway.app
2. Connect GitHub repository
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

**Note:** Update `VITE_API_URL` to your Railway backend URL

**✅ Done! Your app is live!**

---

## 🌐 Option 5: Render.com (Simple All-in-One)

**Estimated Cost:** Free or $7/month  
**Difficulty:** Easy

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### Step 2: Deploy on Render
1. Go to https://render.com
2. Sign up and connect GitHub
3. Create new "Web Service"
4. Select your repository
5. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:server`
6. Add PostgreSQL database
7. Set environment variables
8. Deploy

**✅ Done! Your app is live!**

---

## 📋 Quick Configuration Checklist

Before deploying, ensure you have:

1. **Database Ready**
   - [ ] PostgreSQL/MySQL created
   - [ ] Database credentials noted
   - [ ] Connection tested

2. **Environment Variables**
   - [ ] `.env.example` in repo
   - [ ] All variables in deployment platform

3. **Sensitive Data**
   - [ ] No `.env` file in git
   - [ ] API keys secured
   - [ ] Passwords strong (12+ chars, mixed case, numbers, symbols)

4. **Code Ready**
   - [ ] All changes committed to git
   - [ ] `npm run build` succeeds locally
   - [ ] No errors in console

## 📊 Comparison Table

| Platform | Cost | Ease | Scalability | Support |
|----------|------|------|------------|---------|
| **DigitalOcean** | $$ | Medium | Excellent | Good |
| **Heroku** | $$$ | Very Easy | Good | Excellent |
| **AWS EB** | $$$ | Hard | Excellent | Excellent |
| **Vercel + Railway** | $ | Easy | Good | Good |
| **Render** | $$ | Easy | Good | Good |

## 🆘 Troubleshooting

### App won't start
```bash
# Check logs
docker-compose logs app  # Docker
heroku logs --tail      # Heroku
eb logs                 # AWS
```

### Database connection failed
- Verify credentials in `.env`
- Check database is running
- Ensure firewall allows connection

### Port conflicts
- Change `SERVER_PORT` in `.env`
- Check what's using port 3000: `lsof -i :3000`

### Out of memory
- Increase server size
- Optimize node config: `--max-old-space-size=2048`

## 📚 Full Documentation

For detailed information, see:
- **[README.md](./README.md)** - Project overview and features
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[ENVIRONMENT.md](./ENVIRONMENT.md)** - Environment variables reference

## 🎬 Next Steps After Deployment

1. ✅ Test all features
2. ✅ Setup monitoring/alerts
3. ✅ Configure automatic backups
4. ✅ Set up CI/CD pipeline (optional)
5. ✅ Document your deployment
6. ✅ Share URL with team

---

**Need help?** Check the logs, review DEPLOYMENT.md, or check your platform's documentation.

**Good luck! 🚀**
