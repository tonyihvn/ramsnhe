# Vanna.AI Server Setup Guide

This folder contains a self-hosted Vanna.AI server implementation for your application.

## 📋 Prerequisites

- **Python 3.8+** - Download from [python.org](https://www.python.org/downloads/)
- **pip** (included with Python)
- **Node.js** (optional, for frontend development)

## 🚀 Quick Start

### 1. Start the Vanna Server

**Windows:**
```bash
cd vanna_server
start_vanna.bat
```

**macOS/Linux:**
```bash
cd vanna_server
bash start_vanna.sh
```

The server will start on `http://127.0.0.1:5000`

### 2. Configure in Your App

1. Go to Settings → AI Integrations → Vanna DDL Training
2. Set **Vanna Server URL** to `http://127.0.0.1:5000`
3. Set **Database Connection String** (e.g., `postgresql://user:password@localhost:5432/database`)
4. Select your **Database Type**
5. Click **Test Vanna Connection**

### 3. Train on Your Database

1. Paste your database DDL (CREATE TABLE statements)
2. Click **Train Vanna on DDL**
3. Wait for the training to complete

## 📁 Project Structure

```
vanna_server/
├── app.py                 # Main Flask server application
├── requirements.txt       # Python dependencies
├── .env                   # Configuration file
├── start_vanna.bat        # Windows startup script
└── start_vanna.sh         # macOS/Linux startup script (optional)
```

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Server
VANNA_HOST=127.0.0.1          # Server address
VANNA_PORT=5000               # Server port

# Vanna
VANNA_API_KEY=demo-key        # API key (for cloud Vanna)
VANNA_MODEL=gpt-4             # Model to use

# Database
DATABASE_URL=postgresql://...  # Your database connection string
DATABASE_TYPE=postgres         # postgres, mysql, sqlite, mssql, oracle
```

## 🌐 API Endpoints

### Health Check
```
GET /health
```
Returns server status and configuration.

### Training Status
```
GET /api/training-status
```
Returns current training information.

### Train Model
```
POST /api/train
Content-Type: application/json

{
  "ddl": "CREATE TABLE facilities (...)",
  "documentation": "Optional documentation"
}
```

### Generate SQL
```
POST /api/generate-sql
Content-Type: application/json

{
  "question": "Show me all facilities with more than 10 beds"
}
```

Response:
```json
{
  "status": "success",
  "question": "Show me all facilities with more than 10 beds",
  "sql": "SELECT * FROM facilities WHERE beds > 10"
}
```

### Generate Follow-up
```
POST /api/generate-followup
Content-Type: application/json

{
  "question": "Show me facilities with more than 10 beds",
  "sql": "SELECT * FROM facilities WHERE beds > 10",
  "result": [...]
}
```

### Test Connection
```
POST /api/test-connection
Content-Type: application/json

{
  "database_url": "postgresql://...",
  "database_type": "postgres"
}
```

## 🐛 Troubleshooting

### Python not found
- Install Python 3.8+ from https://www.python.org
- Add Python to your PATH
- Restart your terminal

### Virtual environment issues
Delete the `venv` folder and run `start_vanna.bat` again

### Database connection fails
- Verify your DATABASE_URL is correct
- Ensure your database is running
- Check firewall settings

### Port already in use
Change `VANNA_PORT` in `.env` to an available port (e.g., 5001)

### Module not found errors
```bash
pip install -r requirements.txt
```

## 📊 Supported Databases

- PostgreSQL
- MySQL
- SQLite
- SQL Server (MSSQL)
- Oracle
- MongoDB

## 🔐 Security Notes

- Store your `.env` file securely
- Never commit `.env` to version control
- Use strong database credentials
- Restrict API access to trusted networks
- Keep Python packages updated

## 📚 Additional Resources

- [Vanna.AI Documentation](https://docs.vanna.ai)
- [Flask Documentation](https://flask.palletsprojects.com)
- [SQLAlchemy Documentation](https://www.sqlalchemy.org)

## ✅ Verification Steps

1. **Server Started**: Check for "✅ VANNA.AI SERVER STARTING" message
2. **Health Check**: Visit `http://127.0.0.1:5000/health`
3. **Connection Test**: Use "Test Vanna Connection" button in UI
4. **Training**: Upload DDL and verify training completes
5. **Query**: Ask a natural language question and see generated SQL

## 🔄 Switching Between Providers

To switch between Vanna.AI and Vercel AI SDK:

1. Go to Settings → App
2. Under "Text-to-SQL Provider", select your preferred option
3. Configure your choice in Settings → AI Integrations
4. The application will use your selected provider for all text-to-SQL queries

## 💡 Tips

- Start with small DDL examples to test
- Use clear table and column names for better SQL generation
- Add documentation comments in your DDL for context
- Monitor the server logs for any errors
- Test the connection frequently to ensure reliability

## 🆘 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your configuration in `.env`
3. Test database connectivity independently
4. Review the API response status codes
5. Check browser console for frontend errors
