# Vanna Self-Hosted Setup Guide

## Overview
This guide shows how to set up a **self-hosted, free Vanna instance** (no API key needed) and connect it to your RAMSNHE application.

---

## Quick Start (5 minutes)

### Option 1: Docker (Recommended)

```bash
# Start Vanna server with Docker
docker run -p 8000:8000 vanna-ai/vanna-server:latest
```

That's it! Vanna is now running at `http://localhost:8000`

### Option 2: Python (Pip)

```bash
# Install Vanna
pip install vanna

# Start the server
vanna run_server --host 0.0.0.0 --port 8000
```

### Option 3: Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vanna:
    image: vanna-ai/vanna-server:latest
    ports:
      - "8000:8000"
    environment:
      - LOG_LEVEL=INFO
    volumes:
      - vanna-data:/app/data
    restart: unless-stopped

volumes:
  vanna-data:
```

Run it:
```bash
docker-compose up -d
```

---

## Verify Vanna is Running

Open in browser or curl:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "ok"}
```

---

## Configure in RAMSNHE

### Step 1: Go to Settings
- Navigate to `/#/settings`
- Click on **"AI Integrations"** tab

### Step 2: Configure Vanna Section
Fill in these fields:

| Field | Value | Example |
|-------|-------|---------|
| **Vanna Server URL** | Your Vanna server address | `http://localhost:8000` |
| **Database Connection String** | Your database connection | `postgresql://user:pass@db:5432/mydb` |
| **Database Type** | Your database system | `postgres`, `mysql`, `sqlite` |
| **Auto-train on DDL changes** | Toggle on/off | ✓ (enabled) |
| **Training Check Interval** | Hours between checks | `24` |

### Step 3: Test Connection
- Click **"Test Vanna Connection"** button
- Should see green ✅ success message

### Step 4: Save Settings
- Click **"Save All Settings"** at bottom
- Settings saved to database

---

## Supported Databases

Vanna supports connecting to:

| Database | Connection String Format | Notes |
|----------|--------------------------|-------|
| **PostgreSQL** | `postgresql://user:password@host:5432/dbname` | Recommended |
| **MySQL** | `mysql+pymysql://user:password@host:3306/dbname` | Works great |
| **SQLite** | `sqlite:///path/to/database.db` | Local file |
| **SQL Server** | `mssql+pyodbc://user:password@host/dbname` | Requires ODBC |
| **Oracle** | `oracle+cx_oracle://user:password@host:1521/dbname` | Enterprise |
| **MongoDB** | `mongodb://user:password@host:27017/dbname` | NoSQL |

**Most Common:** PostgreSQL

---

## Connection String Examples

### PostgreSQL (Recommended)
```
postgresql://ramsnhe_user:secure_password@localhost:5432/ramsnhe_db
```

### PostgreSQL (Docker Network)
```
postgresql://ramsnhe_user:secure_password@postgres:5432/ramsnhe_db
```

### MySQL
```
mysql+pymysql://root:password@localhost:3306/ramsnhe
```

### SQLite
```
sqlite:////var/lib/ramsnhe/vanna.db
```

---

## Docker Network Setup (Recommended)

If using Docker Compose for your entire stack:

```yaml
version: '3.8'

services:
  # Your RAMSNHE app
  app:
    image: ramsnhe:latest
    ports:
      - "3000:3000"
    networks:
      - ramsnhe-net
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/ramsnhe

  # PostgreSQL database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ramsnhe
      POSTGRES_USER: ramsnhe_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - ramsnhe-net

  # Self-hosted Vanna
  vanna:
    image: vanna-ai/vanna-server:latest
    ports:
      - "8000:8000"
    environment:
      - LOG_LEVEL=INFO
    networks:
      - ramsnhe-net
    volumes:
      - vanna-data:/app/data
    restart: unless-stopped

networks:
  ramsnhe-net:
    driver: bridge

volumes:
  postgres-data:
  vanna-data:
```

**Connection string from RAMSNHE app to Vanna:**
```
http://vanna:8000
```

**Connection string from Vanna to PostgreSQL:**
```
postgresql://ramsnhe_user:secure_password@postgres:5432/ramsnhe
```

---

## Training Vanna on Your Database

Vanna needs to "learn" your database schema to generate SQL.

### Automatic Training
- Enable **"Auto-train on DDL changes"** in AI Integrations tab
- Vanna will periodically check for schema changes
- Retrains automatically when DDL changes detected

### Manual Training (via API)
```bash
curl -X POST http://localhost:8000/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{
    "database_connection": "postgresql://user:pass@host/db",
    "ddl": "CREATE TABLE activities (id INT, name VARCHAR(255));"
  }'
```

### What Vanna Learns
Vanna stores:
- Table schemas (columns, types)
- Relationships (foreign keys)
- Sample queries for each table
- Documentation/business rules

This allows Vanna to generate accurate SQL from natural language.

---

## Troubleshooting

### Vanna Server Not Accessible
```bash
# Check if running
docker ps | grep vanna

# Check logs
docker logs <container-id>

# Try connecting
curl http://localhost:8000/health
```

### Database Connection Failed
```bash
# Test connection with psql
psql postgresql://user:password@host:5432/dbname

# Common issues:
# - Wrong password
# - Wrong hostname (use localhost or docker service name)
# - Firewall blocking port 5432
# - Database doesn't exist
```

### Training Not Working
```bash
# Check Vanna logs for errors
docker logs vanna-container

# Manually trigger training via API
curl -X POST http://localhost:8000/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{"database_connection": "postgresql://..."}'
```

### "Test Connection" Shows Red ❌
1. Verify Vanna server is running: `curl http://localhost:8000/health`
2. Verify database URL is correct
3. Verify database is accessible from Vanna container
4. Check Vanna logs: `docker logs vanna-container`

---

## Performance Tuning

### For Large Databases
```bash
# Use SQLAlchemy connection pooling
docker run \
  -p 8000:8000 \
  -e SQLALCHEMY_POOL_SIZE=20 \
  -e SQLALCHEMY_POOL_RECYCLE=3600 \
  vanna-ai/vanna-server:latest
```

### For High Query Volume
```bash
# Enable caching
docker run \
  -p 8000:8000 \
  -e VANNA_CACHE_ENABLED=true \
  -e VANNA_CACHE_TTL=3600 \
  vanna-ai/vanna-server:latest
```

---

## Production Deployment

### On a Dedicated Server

```bash
# 1. Install dependencies
apt-get update
apt-get install -y python3 python3-pip postgresql-client

# 2. Create directory
mkdir -p /opt/vanna
cd /opt/vanna

# 3. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 4. Install Vanna
pip install vanna gunicorn

# 5. Create systemd service
cat > /etc/systemd/system/vanna.service << EOF
[Unit]
Description=Vanna SQL Server
After=network.target

[Service]
Type=simple
User=vanna
WorkingDirectory=/opt/vanna
ExecStart=/opt/vanna/venv/bin/vanna run_server --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 6. Start service
systemctl daemon-reload
systemctl start vanna
systemctl enable vanna
```

### Behind Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name vanna.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### With HTTPS (Let's Encrypt)

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Create certificate
certbot certonly --standalone -d vanna.example.com

# Update nginx config to use HTTPS
```

---

## Cost Analysis

| Aspect | Cost |
|--------|------|
| **Vanna Software** | **FREE** (open-source) |
| **Self-Hosted Infrastructure** | Your servers |
| **Database Storage** | Depends on DB choice |
| **No API Fees** | ✅ Zero |
| **No Per-Query Fees** | ✅ Zero |
| **Scalability** | Unlimited |

**Total Cost:** Just your infrastructure (no recurring AI costs)

---

## Migration from Cloud Vanna

If you were using cloud Vanna with an API key:

### Before (❌)
```
VANNA_API_KEY=sk_...  (cloud-hosted, costs money)
```

### After (✅)
```
Vanna Server URL: http://localhost:8000  (self-hosted, free)
Database Connection: postgresql://...     (direct DB access, no API key)
```

No data loss - just change the connection method in AI Integrations tab.

---

## Monitoring

### Health Check Endpoint
```bash
curl http://localhost:8000/health
```

### Prometheus Metrics (if enabled)
```bash
curl http://localhost:8000/metrics
```

### Logs
```bash
# Docker
docker logs vanna-container

# Systemd
journalctl -u vanna -f
```

---

## FAQ

**Q: Do I need an API key?**
A: No! Self-hosted Vanna is completely free and doesn't require any API keys.

**Q: Can it run offline?**
A: Yes! Once running, it doesn't need internet connectivity for core functionality.

**Q: How much disk space does it need?**
A: Vanna stores metadata only (~100MB typically). The main database space is your actual database.

**Q: Can multiple instances share the training data?**
A: Yes! Use a shared database backend for Vanna metadata.

**Q: How do I backup training data?**
A: Backup the Vanna metadata database (usually embedded SQLite or PostgreSQL).

**Q: Can I update Vanna without retraining?**
A: Yes! Training data persists across updates.

---

## Next Steps

1. ✅ Start Vanna server (Docker or Python)
2. ✅ Go to RAMSNHE Settings → AI Integrations
3. ✅ Fill in Vanna section with server URL and DB connection
4. ✅ Click "Test Vanna Connection"
5. ✅ Save settings
6. ✅ Use AI Assistant in Activity Dashboard

Your self-hosted Vanna is ready to power your AI Assistant! 🚀
