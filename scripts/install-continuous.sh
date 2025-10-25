#!/bin/bash

# CTS v3 Continuous Installation Script
# Supports Ubuntu 24, Ubuntu 22, Debian, CentOS, and other Linux distributions
# Includes predefined remote PostgreSQL database configuration

set -e

echo "=========================================="
echo "CTS v3 Continuous Installation"
echo "Automated Complete Setup"
echo "=========================================="
echo ""

# Predefined configuration
PORT=3000
PROJECT_NAME="cts-v3"
DEFAULT_PASSWORD="00998877"

# Predefined Remote Database Configuration
DB_HOST="149.33.11.224"
DB_PORT="5432"
DB_NAME="ctsv3"
DB_USER="root"
DB_PASSWORD="mLM58coj7t"

# Auto-detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
        ubuntu)
            if [[ "$VERSION_ID" == "24."* ]]; then
                OS_TYPE="ubuntu24"
                OS_NAME="Ubuntu 24.04"
            elif [[ "$VERSION_ID" == "22."* ]]; then
                OS_TYPE="ubuntu22"
                OS_NAME="Ubuntu 22.04"
            else
                OS_TYPE="ubuntu"
                OS_NAME="Ubuntu"
            fi
            ;;
        debian)
            OS_TYPE="debian"
            OS_NAME="Debian"
            ;;
        centos|rhel|fedora)
            OS_TYPE="centos"
            OS_NAME="CentOS/RHEL"
            ;;
        *)
            OS_TYPE="other"
            OS_NAME="Unknown Linux"
            ;;
    esac
else
    OS_TYPE="other"
    OS_NAME="Unknown"
fi

echo "Detected OS: $OS_NAME ($OS_TYPE)"
echo "Installation will proceed automatically..."
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "Error: This script should not be run as root"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Stop existing services
echo "[1/10] Stopping existing services..."
sudo systemctl stop cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
echo "✓ Services stopped"

# Create directory structure
echo "[2/10] Creating directory structure..."
mkdir -p data/{databases,exports,imports} logs/{trade-engine,web-engine,system} backups/{daily,weekly} temp services
chmod -R 755 data logs backups temp services
echo "✓ Directory structure created"

# Install system dependencies based on OS
echo "[3/10] Installing system dependencies for $OS_NAME..."
case "$OS_TYPE" in
    ubuntu24)
        sudo apt-get update -qq
        sudo apt-get install -y -qq build-essential libssl-dev python3-pip python3-venv sqlite3 curl git postgresql-client > /dev/null 2>&1
        ;;
    ubuntu22|ubuntu|debian)
        sudo apt-get update -qq
        sudo apt-get install -y -qq build-essential libssl-dev python3-pip sqlite3 curl git postgresql-client > /dev/null 2>&1
        ;;
    centos)
        sudo yum groupinstall -y -q "Development Tools" > /dev/null 2>&1
        sudo yum install -y -q openssl-devel python3-pip sqlite curl git postgresql > /dev/null 2>&1
        ;;
    *)
        echo "Attempting generic installation..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y -qq build-essential libssl-dev python3-pip sqlite3 curl git postgresql-client > /dev/null 2>&1
        elif command -v yum &> /dev/null; then
            sudo yum install -y -q gcc openssl-devel python3-pip sqlite curl git postgresql > /dev/null 2>&1
        fi
        ;;
esac
echo "✓ System dependencies installed"

# Install Node.js dependencies
echo "[4/10] Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm cache clean --force > /dev/null 2>&1 || true
    npm install --force --no-audit --no-fund --silent > /dev/null 2>&1 || echo "Warning: Some npm packages failed"
fi
echo "✓ Node.js dependencies installed"

# Install Python dependencies
echo "[5/10] Installing Python dependencies..."
pip3 install --upgrade pip --quiet > /dev/null 2>&1 || true
pip3 install --break-system-packages --quiet \
    "pybit>=5.0.0" \
    "bingx-python>=1.0.0" \
    "pionex-python>=1.0.0" \
    "websocket-client>=1.0.0" \
    "requests>=2.25.0" \
    "python-dotenv>=0.19.0" \
    "schedule>=1.0.0" > /dev/null 2>&1 || echo "Warning: Some Python packages failed"
echo "✓ Python dependencies installed"

# Generate encryption keys
echo "[6/10] Generating encryption keys..."
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
REMOTE_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "✓ Encryption keys generated"

# Create environment configuration
echo "[7/10] Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=$PORT
DEFAULT_PASSWORD=$DEFAULT_PASSWORD
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET

# Remote PostgreSQL Database (Predefined)
DATABASE_URL=$REMOTE_DATABASE_URL
REMOTE_POSTGRES_URL=$REMOTE_DATABASE_URL
REMOTE_PG_HOST=$DB_HOST
REMOTE_PG_PORT=$DB_PORT
REMOTE_PG_DATABASE=$DB_NAME
REMOTE_PG_USER=$DB_USER
REMOTE_PG_PASSWORD=$DB_PASSWORD

# Local SQLite (Optional)
DATABASE_PATH=./data/cts.db

# Exchange API Configuration
BYBIT_API_KEY=
BYBIT_API_SECRET=
BYBIT_TESTNET=true
BINGX_API_KEY=
BINGX_API_SECRET=
PIONEX_API_KEY=
PIONEX_API_SECRET=

# Trading Configuration
DEFAULT_POSITION_SIZE=0.1
MAX_POSITIONS_PER_CONFIG=1
POSITION_TIMEOUT=15000
LOG_LEVEL=info
EOF
echo "✓ Environment configuration created"

# Create systemd services
echo "[8/10] Creating systemd services..."
sudo tee /etc/systemd/system/cts-web.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Web Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATABASE_URL=$REMOTE_DATABASE_URL
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY
Environment=JWT_SECRET=$JWT_SECRET
Environment=DEFAULT_PASSWORD=$DEFAULT_PASSWORD
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/cts-trade.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Trade Engine
After=network.target cts-web.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node services/trade-engine.js
Restart=always
RestartSec=15
Environment=NODE_ENV=production
Environment=DATABASE_URL=$REMOTE_DATABASE_URL
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
echo "✓ Systemd services created"

# Create management scripts
echo "[9/10] Creating management scripts..."
cat > start-cts.sh << 'EOFSCRIPT'
#!/bin/bash
sudo systemctl start cts-web cts-trade
echo "✓ CTS v3 services started"
EOFSCRIPT

cat > stop-cts.sh << 'EOFSCRIPT'
#!/bin/bash
sudo systemctl stop cts-web cts-trade
echo "✓ CTS v3 services stopped"
EOFSCRIPT

cat > status-cts.sh << 'EOFSCRIPT'
#!/bin/bash
systemctl status cts-web cts-trade --no-pager
EOFSCRIPT

chmod +x start-cts.sh stop-cts.sh status-cts.sh
echo "✓ Management scripts created"

# Start services
echo "[10/10] Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable cts-web cts-trade > /dev/null 2>&1
sudo systemctl start cts-web > /dev/null 2>&1
sleep 2
sudo systemctl start cts-trade > /dev/null 2>&1
echo "✓ Services started"

echo ""
echo "=========================================="
echo "✓ Installation Complete!"
echo "=========================================="
echo ""
echo "🗄️  Database: PostgreSQL @ $DB_HOST:$DB_PORT/$DB_NAME"
echo "🌐 Web Interface: http://localhost:$PORT"
echo "🔐 Default Password: $DEFAULT_PASSWORD"
echo ""
echo "Management Commands:"
echo "  ./start-cts.sh   - Start services"
echo "  ./stop-cts.sh    - Stop services"
echo "  ./status-cts.sh  - Check status"
echo ""
echo "Next Steps:"
echo "  1. Add exchange API credentials to .env"
echo "  2. Access web interface and configure settings"
echo "  3. Start trading!"
echo ""
echo "=========================================="
