# DQA+ Deployment Checklist

## Pre-Deployment

- [ ] All environment variables configured in `.env` (never commit this file)
- [ ] Database created and credentials verified
- [ ] Node.js v20+ installed locally
- [ ] npm dependencies installed: `npm install`
- [ ] Application builds successfully: `npm run build`
- [ ] No errors in console output
- [ ] All API endpoints tested locally
- [ ] Database migrations completed
- [ ] TinyMCE API key obtained (if using rich text editor)

## Deployment Platform Selection

Choose one of the following deployment options:

### Option 1: Heroku (Simple, Good for Small-Medium Apps)

**Pros:** Easy setup, built-in HTTPS, automatic scaling
**Cons:** Paid dyno required for production

```bash
# 1. Install Heroku CLI
brew install heroku  # macOS
# or download from https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create dqaplus-prod

# 4. Configure PostgreSQL
heroku addons:create heroku-postgresql:standard-0 -a dqaplus-prod

# 5. Set environment variables
heroku config:set NODE_ENV=production -a dqaplus-prod
heroku config:set FRONTEND_HOSTS=https://dqaplus-prod.herokuapp.com -a dqaplus-prod
heroku config:set ALLOW_PUBLIC_ADMIN=false -a dqaplus-prod
heroku config:set TINYMCE_API_KEY=your_key_here -a dqaplus-prod

# 6. Deploy
git push heroku main

# 7. Monitor logs
heroku logs --tail -a dqaplus-prod
```

### Option 2: Docker + DigitalOcean (Recommended for Production)

**Pros:** Full control, scalable, cost-effective
**Cons:** More configuration required

```bash
# 1. Build Docker image
docker build -t dqaplus:latest .

# 2. Create DigitalOcean droplet (Ubuntu 22.04, 2GB+ RAM)

# 3. SSH into droplet
ssh root@your_droplet_ip

# 4. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 5. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 6. Clone repository
git clone https://github.com/tonyihvn/ramsnhe.git
cd ramsnhe

# 7. Create .env file with production values
nano .env

# 8. Start application
docker-compose up -d

# 9. Verify
docker-compose logs -f app
docker-compose ps
```

### Option 3: AWS Elastic Beanstalk

**Pros:** Scalable, enterprise-ready, good for large apps
**Cons:** More expensive, steeper learning curve

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize EB application
eb init -p node.js-20 dqaplus --region us-east-1

# 3. Create environment
eb create dqaplus-prod

# 4. Set environment variables
eb setenv NODE_ENV=production SERVER_PORT=3000 FRONTEND_HOSTS=https://dqaplus-prod.eb.us-east-1.elasticbeanstalk.com

# 5. Configure database (RDS)
# Use AWS Console to create PostgreSQL RDS instance
# Update environment variables with RDS endpoint

# 6. Deploy
eb deploy

# 7. Monitor
eb open
eb logs
```

### Option 4: Vercel (Frontend Only) + Railway (Backend)

**Pros:** Optimal frontend performance, easy integration
**Cons:** Separate services to manage

**Frontend (Vercel):**
```bash
npm install -g vercel
vercel --prod
```

**Backend (Railway):**
1. Connect GitHub repository to Railway.app
2. Add PostgreSQL service
3. Configure environment variables
4. Deploy

### Option 5: Render.com (All-in-One)

**Pros:** Simple, free tier available, good documentation
**Cons:** Limited customization

1. Push code to GitHub
2. Go to https://render.com
3. Create new "Web Service"
4. Connect GitHub repository
5. Configure:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:server`
6. Add environment variables
7. Create PostgreSQL database
8. Deploy

## Post-Deployment

- [ ] Application accessible at your domain
- [ ] Test all core functionality
- [ ] Verify database connectivity
- [ ] Check logs for errors
- [ ] Monitor performance metrics
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Enable HTTPS/SSL
- [ ] Test email functionality
- [ ] Document deployment process
- [ ] Set up CI/CD pipeline

## Monitoring & Maintenance

### Daily Checks
- Monitor error logs
- Check database performance
- Verify API response times
- Monitor server resources

### Weekly Tasks
- Review security updates for dependencies
- Backup database
- Monitor application metrics
- Check for failed requests

### Monthly Tasks
- Update dependencies: `npm update`
- Security audit: `npm audit`
- Review and optimize database queries
- Capacity planning review

## Common Deployment Issues

### Issue: Port Already in Use
**Solution:** Change port in `.env` or terminate conflicting process

### Issue: Database Connection Failed
**Solution:** 
- Verify credentials in `.env`
- Check database is running
- Ensure firewall allows connection
- Test connection locally

### Issue: Build Fails
**Solution:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### Issue: Out of Memory
**Solution:**
- Increase Node.js memory: `--max-old-space-size=2048`
- Upgrade hosting plan
- Optimize application code

### Issue: CORS Errors
**Solution:**
- Verify `FRONTEND_HOSTS` matches your domain
- Check both frontend and backend URLs
- Clear browser cache

## Rollback Procedure

### Heroku Rollback
```bash
heroku releases -a dqaplus-prod
heroku rollback -a dqaplus-prod
```

### Docker/DigitalOcean Rollback
```bash
# SSH into droplet
docker-compose down
git checkout previous_version
docker-compose up -d
```

## Performance Tuning

1. **Enable Compression**
   - Gzip compression on server
   - Minified assets (automatic with `npm run build`)

2. **Database Optimization**
   - Add indexes to frequently queried columns
   - Connection pooling
   - Query optimization

3. **Caching**
   - Browser cache headers
   - Redis caching (optional)
   - CDN for static assets

4. **Frontend Optimization**
   - Code splitting (automatic in Vite)
   - Lazy loading components
   - Image optimization
   - Minimize bundle size: `npm run build --analyze`

## Security Hardening

1. **Secrets Management**
   - Never commit `.env` file
   - Rotate API keys regularly
   - Use secrets manager (AWS Secrets Manager, Heroku Config, etc.)

2. **Network Security**
   - Enable firewall
   - Use HTTPS/SSL certificate
   - Set secure CORS headers
   - Implement rate limiting

3. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups
   - Restrict database access by IP

4. **Application Security**
   - Keep dependencies updated
   - Regular security audits: `npm audit`
   - Input validation
   - SQL injection prevention

## Backup & Disaster Recovery

### Database Backups

**PostgreSQL:**
```bash
# Manual backup
pg_dump -U postgres -h localhost dqappdb > backup.sql

# Automated backup (cron job)
0 2 * * * pg_dump -U postgres dqappdb > /backups/dqappdb_$(date +\%Y\%m\%d).sql
```

**Store backups in:**
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- DigitalOcean Spaces

### Disaster Recovery Plan

1. Database backup in secure location
2. Document recovery procedures
3. Test recovery process monthly
4. Keep application code in git repository
5. Document all configuration changes

## Support Contacts

- Platform support documentation
- GitHub issues: https://github.com/tonyihvn/ramsnhe/issues
- Check logs and error messages
- Review platform dashboards

## Deployment Success Criteria

✅ Application is live and accessible
✅ All pages load without errors
✅ Database connectivity verified
✅ API endpoints responding correctly
✅ No console errors in browser
✅ Server logs show normal operation
✅ Performance metrics acceptable
✅ Monitoring and alerts configured
✅ Backup systems operational
✅ Team notified of deployment
