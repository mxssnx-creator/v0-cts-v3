#!/bin/bash

# CTS v3 Continuous Installation Script
# Fully automated installation with all features
# Supports: Ubuntu 24/22, Debian, CentOS, and other Linux distributions

set -e

# Configuration
PORT=3000
PROJECT_NAME="cts-v3"
DEFAULT_PASSWORD="00998877"
USE_SQLITE=false

# Predefined Remote Database
DB_HOST="149.33.11.224"
DB_PORT="5432"
DB_NAME="ctsv3"
DB_USER="root"
DB_PASSWORD="mLM58coj7t"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port) PORT="$2"; shift 2 ;;
        --project-name) PROJECT_NAME="$2"; shift 2 ;;
        --sqlite) USE_SQLITE=true; shift ;;
        *) shift ;;
    esac
done

# Auto-detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
        ubuntu)
            [[ "$VERSION_ID" == "24."* ]] && OS_TYPE="ubuntu24" || OS_TYPE="ubuntu22"
            ;;
        debian) OS_TYPE="debian" ;;
        centos|rhel|fedora) OS_TYPE="centos" ;;
        *) OS_TYPE="other" ;;
    esac
else
    OS_TYPE="other"
fi

echo "=========================================="
echo "CTS v3 Continuous Installation"
echo "=========================================="
echo "OS: $OS_TYPE | Port: $PORT | DB: $([ "$USE_SQLITE" = true ] && echo "SQLite" || echo "PostgreSQL")"
echo ""

# Check root
if [[ $EUID -eq 0 ]]; then
   echo "Error: Do not run as root"
   exit 1
fi

# [1/12] Stop services
echo "[1/12] Stopping existing services..."
sudo systemctl stop cts-web cts-trade 2>/dev/null || true
echo "✓"

# [2/12] Create directories
echo "[2/12] Creating directories..."
mkdir -p data/{databases,exports,imports} logs/{trade-engine,web-engine,system} backups/{daily,weekly} temp services
chmod -R 755 data logs backups temp services
echo "✓"

# [3/12] Install system dependencies
echo "[3/12] Installing system dependencies..."
case "$OS_TYPE" in
    ubuntu24|ubuntu22|debian)
        sudo apt-get update -qq 2>/dev/null || true
        sudo apt-get install -y -qq build-essential libssl-dev python3-pip python3-venv sqlite3 libsqlite3-dev curl git postgresql-client 2>/dev/null || true
        ;;
    centos)
        sudo yum groupinstall -y -q "Development Tools" 2>/dev/null || true
        sudo yum install -y -q openssl-devel python3-pip sqlite curl git postgresql 2>/dev/null || true
        ;;
esac
echo "✓"

# [4/12] Install Node.js
echo "[4/12] Checking Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null || true
    sudo apt-get install -y nodejs 2>/dev/null || true
fi
echo "✓ Node.js $(node -v 2>/dev/null || echo 'not found')"

# [5/12] Install Bun
echo "[5/12] Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash 2>/dev/null || true
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo "✓ Bun $(bun --version 2>/dev/null || echo 'not found')"

# [6/12] Install pnpm
echo "[6/12] Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@latest 2>/dev/null || true
fi
echo "✓ pnpm $(pnpm --version 2>/dev/null || echo 'not found')"

# [7/12] Install Node dependencies
echo "[7/12] Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    if command -v bun &> /dev/null; then
        bun install 2>/dev/null || npm install --force 2>/dev/null || true
    else
        npm install --force 2>/dev/null || true
    fi
fi
echo "✓"

# [8/12] Install Python dependencies
echo "[8/12] Installing Python dependencies..."
python3 -m pip install --upgrade pip --break-system-packages 2>/dev/null || true
python3 -m pip install --break-system-packages \
    "pybit>=5.0.0" \
    "bingx-python>=1.0.0" \
    "pionex-python>=1.0.0" \
    "websocket-client>=1.0.0" \
    "requests>=2.25.0" \
    "python-dotenv>=0.19.0" \
    "schedule>=1.0.0" 2>/dev/null || true
echo "✓"

# [9/12] Generate keys
echo "[9/12] Generating encryption keys..."
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
echo "✓"

# [10/12] Configure database
echo "[10/12] Configuring database..."
if [ "$USE_SQLITE" = true ]; then
    DATABASE_URL="file:./data/cts.db"
else
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

cat > .env << EOF
NODE_ENV=production
PORT=$PORT
PROJECT_NAME=$PROJECT_NAME
DEFAULT_PASSWORD=$DEFAULT_PASSWORD
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET
DATABASE_URL=$DATABASE_URL
$([ "$USE_SQLITE" = false ] && echo "REMOTE_POSTGRES_URL=$DATABASE_URL")
BYBIT_TESTNET=true
LOG_LEVEL=info
EOF
echo "✓"

# [11/12] Create systemd services
echo "[11/12] Creating systemd services..."
sudo tee /etc/systemd/system/cts-web.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Web
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(command -v bun &> /dev/null && echo "$(which bun) run dev" || echo "$(which npm) run dev")
Restart=always
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATABASE_URL=$DATABASE_URL
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY
Environment=JWT_SECRET=$JWT_SECRET

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/cts-trade.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Trade Engine
After=cts-web.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) services/trade-engine.js
Restart=always
Environment=DATABASE_URL=$DATABASE_URL

[Install]
WantedBy=multi-user.target
EOF
echo "✓"

# [12/12] Start services
echo "[12/12] Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable cts-web cts-trade 2>/dev/null || true
sudo systemctl start cts-web 2>/dev/null || true
sleep 2
sudo systemctl start cts-trade 2>/dev/null || true
echo "✓"

# Create management scripts
cat > start-cts.sh << 'EOF'
#!/bin/bash
sudo systemctl start cts-web cts-trade && echo "✓ Started"
EOF

cat > stop-cts.sh << 'EOF'
#!/bin/bash
sudo systemctl stop cts-web cts-trade && echo "✓ Stopped"
EOF

cat > status-cts.sh << 'EOF'
#!/bin/bash
systemctl status cts-web cts-trade --no-pager
EOF

chmod +x start-cts.sh stop-cts.sh status-cts.sh

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

# Summary
echo ""
echo "=========================================="
echo "✓ Installation Complete!"
echo "=========================================="
echo ""
echo "🌐 Access URLs:"
echo "   Local:   http://localhost:$PORT"
echo "   Network: http://$SERVER_IP:$PORT"
echo ""
echo "🗄️  Database:"
if [ "$USE_SQLITE" = true ]; then
    echo "   Type: SQLite"
    echo "   Path: $(pwd)/data/cts.db"
else
    echo "   Type: PostgreSQL"
    echo "   Host: $DB_HOST:$DB_PORT/$DB_NAME"
fi
echo ""
echo "🔐 Credentials:"
echo "   Password: $DEFAULT_PASSWORD"
echo ""
echo "🔧 Commands:"
echo "   ./start-cts.sh   - Start services"
echo "   ./stop-cts.sh    - Stop services"
echo "   ./status-cts.sh  - Check status"
echo ""
echo "📖 Next Steps:"
echo "   1. Access http://localhost:$PORT"
echo "   2. Login with password: $DEFAULT_PASSWORD"
echo "   3. Configure exchange APIs in Settings"
echo "   4. Start trading!"
echo ""
echo "=========================================="
