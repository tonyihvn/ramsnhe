#!/bin/bash
# Vanna.AI Complete Setup Script for Windows
# Run this to complete all 6 setup steps automatically

@echo off
cls

echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║                VANNA.AI COMPLETE SETUP - All Steps                    ║
echo ║                     Total Time: ~15 minutes                            ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.

echo 📋 This script will execute:
echo    ✅ Step 1: Verify database and initialize tables
echo    ✅ Step 2: Create default LLM settings
echo    ✅ Step 3: Load 4 default prompt contexts
echo    ✅ Step 4: Start backend server
echo    ✅ Step 5: Start frontend
echo    ✅ Step 6: Display quick start guide
echo.

echo Press ANY KEY to continue...
pause > nul

REM Change to project directory
cd /d "%~dp0"

REM Step 1: Run setup initialization
echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║ STEP 1: Initialize Vanna.AI Database                                  ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.

call npm run vanna:setup

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Setup initialization failed!
    echo Please check your database connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Database initialization complete!
echo.

REM Step 2: Start backend server
echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║ STEP 2: Starting Backend Server                                       ║
echo ║        http://localhost:3000                                          ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.

start "Backend Server" cmd /k "npm run start:server"

REM Wait for backend to start
timeout /t 5 /nobreak

REM Step 3: Start frontend
echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║ STEP 3: Starting Frontend                                             ║
echo ║        http://localhost:9090                                          ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.

start "Frontend" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 3 /nobreak

REM Display completion message
echo.
echo ╔════════════════════════════════════════════════════════════════════════╗
echo ║                 ✅ SETUP COMPLETE!                                    ║
echo ╚════════════════════════════════════════════════════════════════════════╝
echo.
echo 🚀 What to do next:
echo.
echo 1. OPEN BROWSER
echo    → http://localhost:9090
echo.
echo 2. LOGIN AS ADMIN
echo    Email:    admin@demo.com
echo    Password: DemoAdmin123!
echo.
echo 3. CONFIGURE LLM (2 minutes)
echo    Settings → AI Context → Configure LLM
echo    Choose: OpenAI/Anthropic/Cohere
echo    Enter: Your API key
echo    Save
echo.
echo 4. TRAIN VANNA (2 minutes)
echo    Settings → AI Context → Vanna Training
echo    Paste: Your database DDL
echo    Train
echo.
echo 5. TEST AI CHAT (1 minute)
echo    Activity Dashboard → AI Analytics
echo    Select context → Ask a question
echo.
echo 📚 DOCUMENTATION:
echo    • COMPLETE_SETUP_GUIDE.md  - This complete guide
echo    • VANNA_README.md          - Navigation hub
echo    • VANNA_QUICKSTART.md      - Quick reference
echo    • VANNA_DEVELOPER_GUIDE.md - Integration guide
echo.
echo ═══════════════════════════════════════════════════════════════════════
echo.
pause
