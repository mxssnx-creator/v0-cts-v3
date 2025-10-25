#!/bin/bash

# CTS v3 Quick Install Script
# One-line download and install: curl -fsSL https://your-domain.com/install.sh | bash
# Or: wget -qO- https://your-domain.com/install.sh | bash

set -e

REPO_URL="https://github.com/yourusername/cts-v3"
BRANCH="main"
INSTALL_DIR="$HOME/cts-v3"
TEMP_DIR="/tmp/cts-v3-install-$$"

echo "=========================================="
echo "CTS v3 Quick Installer"
echo "=========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y -qq git
    elif command -v yum &> /dev/null; then
        sudo yum install -y -q git
    else
        echo "Error: Cannot install git automatically. Please install git manually."
        exit 1
    fi
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y -qq nodejs
    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y -q nodejs
    else
        echo "Error: Cannot install Node.js automatically. Please install Node.js 18+ manually."
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✓ Prerequisites checked"
echo ""

# Clone or download repository
echo "Downloading CTS v3..."
if [ -d "$INSTALL_DIR" ]; then
    echo "Installation directory already exists: $INSTALL_DIR"
    read -p "Remove and reinstall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
    else
        echo "Installation cancelled."
        exit 0
    fi
fi

# Try git clone first, fallback to wget/curl
if git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR" 2>/dev/null; then
    echo "✓ Repository cloned"
elif command -v wget &> /dev/null; then
    echo "Downloading via wget..."
    mkdir -p "$TEMP_DIR"
    wget -q -O "$TEMP_DIR/cts-v3.zip" "$REPO_URL/archive/refs/heads/$BRANCH.zip"
    unzip -q "$TEMP_DIR/cts-v3.zip" -d "$TEMP_DIR"
    mv "$TEMP_DIR/cts-v3-$BRANCH" "$INSTALL_DIR"
    rm -rf "$TEMP_DIR"
    echo "✓ Repository downloaded"
elif command -v curl &> /dev/null; then
    echo "Downloading via curl..."
    mkdir -p "$TEMP_DIR"
    curl -fsSL -o "$TEMP_DIR/cts-v3.zip" "$REPO_URL/archive/refs/heads/$BRANCH.zip"
    unzip -q "$TEMP_DIR/cts-v3.zip" -d "$TEMP_DIR"
    mv "$TEMP_DIR/cts-v3-$BRANCH" "$INSTALL_DIR"
    rm -rf "$TEMP_DIR"
    echo "✓ Repository downloaded"
else
    echo "Error: Cannot download repository. Please install git, wget, or curl."
    exit 1
fi

# Change to installation directory
cd "$INSTALL_DIR"

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo "=========================================="
echo "✓ CTS v3 Downloaded Successfully!"
echo "=========================================="
echo ""
echo "Installation directory: $INSTALL_DIR"
echo ""
echo "Next steps:"
echo ""
echo "1. Navigate to installation directory:"
echo "   cd $INSTALL_DIR"
echo ""
echo "2. Choose installation method:"
echo ""
echo "   Option A - Continuous Install (Recommended):"
echo "   ./scripts/install-continuous.sh"
echo "   • Fully automated setup"
echo "   • Predefined remote database"
echo "   • Auto-detects OS (Ubuntu 24/22, Debian, CentOS)"
echo ""
echo "   Option B - Interactive Install:"
echo "   ./scripts/install.sh"
echo "   • Step-by-step configuration"
echo "   • Custom settings"
echo ""
echo "   Option C - Manual Setup:"
echo "   npm install"
echo "   cp .env.example .env"
echo "   # Edit .env with your settings"
echo "   npm run dev"
echo ""
echo "=========================================="
