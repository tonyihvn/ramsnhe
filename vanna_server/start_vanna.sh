#!/bin/bash

# Vanna.AI Server Startup Script for macOS/Linux

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🚀 STARTING VANNA.AI SERVER                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed or not in PATH"
    echo "Please install Python 3.8+ from https://www.python.org"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi
echo "✅ Virtual environment activated"
echo ""

# Install/Update requirements
echo "📚 Installing Python dependencies..."
pip install -q -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Start the server
echo "🎯 Starting Vanna.AI server..."
echo ""
python3 app.py
