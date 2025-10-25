#!/bin/bash

# CTS v3 Complete Download and Install
# Downloads the repository and runs continuous installation in one command

set -e

REPO_URL="https://github.com/yourusername/cts-v3"
BRANCH="main"
INSTALL_DIR="$HOME/cts-v3"

echo "=========================================="
echo "CTS v3 Complete Installer"
echo "Download + Install in One Step"
echo "=========================================="
echo ""

# Download using quick-install script
if command -v curl &> /dev/null; then
    curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/$BRANCH/scripts/quick-install.sh | bash
elif command -v wget &> /dev/null; then
    wget -qO- https://raw.githubusercontent.com/yourusername/cts-v3/$BRANCH/scripts/quick-install.sh | bash
else
    echo "Error: curl or wget is required"
    exit 1
fi

# Run continuous installation
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    echo ""
    echo "Starting continuous installation..."
    echo ""
    ./scripts/install-continuous.sh
else
    echo "Error: Installation directory not found"
    exit 1
fi
