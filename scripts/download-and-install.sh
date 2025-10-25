#!/bin/bash

# CTS v3 Complete Download and Install Script
# One-command installation from GitHub

set -e

REPO_URL="${REPO_URL:-https://github.com/yourusername/cts-v3}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="$HOME/cts-v3"
PORT=3000
PROJECT_NAME="cts-v3"
USE_SQLITE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port) PORT="$2"; shift 2 ;;
        --project-name) PROJECT_NAME="$2"; shift 2 ;;
        --sqlite) USE_SQLITE=true; shift ;;
        --repo) REPO_URL="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --dir) INSTALL_DIR="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo "=========================================="
echo "CTS v3 Complete Installer"
echo "=========================================="
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
echo "Install Directory: $INSTALL_DIR"
echo ""

# Check prerequisites
echo "[1/4] Checking prerequisites..."
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y git
    elif command -v yum &> /dev/null; then
        sudo yum install -y git
    else
        echo "Error: git is required. Please install it manually."
        exit 1
    fi
fi
echo "✓ Git found"

# Download repository
echo "[2/4] Downloading repository..."
if [ -d "$INSTALL_DIR" ]; then
    echo "Directory exists, updating..."
    cd "$INSTALL_DIR"
    git pull origin "$BRANCH" 2>/dev/null || echo "Warning: Could not update"
else
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR" 2>/dev/null || {
        echo "Error: Failed to clone repository"
        exit 1
    }
    cd "$INSTALL_DIR"
fi
echo "✓ Repository downloaded"

# Make scripts executable
echo "[3/4] Preparing installation..."
chmod +x scripts/*.sh 2>/dev/null || true
echo "✓ Scripts prepared"

# Run installation
echo "[4/4] Running installation..."
echo ""

INSTALL_ARGS="--port $PORT --project-name $PROJECT_NAME"
[ "$USE_SQLITE" = true ] && INSTALL_ARGS="$INSTALL_ARGS --sqlite"

if [ -f "scripts/install-continuous.sh" ]; then
    ./scripts/install-continuous.sh $INSTALL_ARGS
else
    echo "Error: Installation script not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Download and Installation Complete!"
echo "=========================================="
echo ""
echo "Installation directory: $INSTALL_DIR"
echo "To manage your installation:"
echo "  cd $INSTALL_DIR"
echo "  ./start-cts.sh"
echo ""
