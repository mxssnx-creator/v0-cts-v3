#!/bin/bash

# Parse command line arguments
PORT=3000
PROJECT_NAME="cts-v3"
UNINSTALL=false
DEFAULT_PASSWORD="00998877"
OS_TYPE=""

DB_HOST="149.33.11.224"
DB_PORT="5432"
DB_NAME="ctsv3"
DB_USER="root"
DB_PASSWORD="mLM58coj7t"

# Parse arguments (support short forms)
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port|port)
            PORT="$2"
            shift 2
            ;;
        -n|--project-name|project-name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -u|--uninstall|uninstall)
            UNINSTALL=true
            shift
            ;;
        -o|--os|os)
            OS_TYPE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [port <PORT>] [project-name <NAME>] [os <ubuntu24|ubuntu22|debian|centos|other>] [uninstall]"
            exit 1
            ;;
    esac
done

if [ -z "$OS_TYPE" ]; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu)
                if [[ "$VERSION_ID" == "24."* ]]; then
                    OS_TYPE="ubuntu24"
                elif [[ "$VERSION_ID" == "22."* ]]; then
                    OS_TYPE="ubuntu22"
                else
                    OS_TYPE="ubuntu"
                fi
                ;;
            debian)
                OS_TYPE="debian"
                ;;
            centos|rhel|fedora)
                OS_TYPE="centos"
                ;;
            *)
                OS_TYPE="other"
                ;;
        esac
    else
        OS_TYPE="other"
    fi
fi

if [ "$UNINSTALL" = true ]; then
    echo "=========================================="
    echo "Uninstalling $PROJECT_NAME"
    echo "=========================================="
    
    echo "Stopping services..."
    sudo systemctl stop cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
    sudo systemctl disable cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
    
    echo "Removing systemd services..."
    sudo rm -f /etc/systemd/system/cts-*.service /etc/systemd/system/cts-*.timer
    sudo systemctl daemon-reload
    
    echo "Removing management scripts..."
    rm -f start-cts.sh stop-cts.sh status-cts.sh update-cts.sh
    
    echo "✓ Uninstallation completed"
    echo "Note: Data, logs, and backups were preserved"
    exit 0
fi

# CTS v3 Complete Installation Script
echo "=========================================="
echo "Installing $PROJECT_NAME Crypto Trading System"
echo "Port: $PORT"
echo "OS Type: $OS_TYPE"
echo "=========================================="

set +e

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "Error: This script should not be run as root for security reasons"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

echo "Stopping existing services..."
sudo systemctl stop cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
echo "✓ Services stopped"

# Check system requirements
echo "Checking system requirements..."

if ! command -v node &> /dev/null; then
    echo "Warning: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    echo "Continuing installation..."
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "Warning: Node.js version 18+ is recommended (current: $(node -v))"
    else
        echo "✓ Node.js $(node -v) found"
    fi
fi

if ! command -v npm &> /dev/null; then
    echo "Warning: npm is not installed"
    echo "Continuing installation..."
else
    echo "✓ npm $(npm -v) found"
fi

if ! command -v python3 &> /dev/null; then
    echo "Warning: Python3 is not installed"
    echo "Continuing installation..."
else
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    echo "✓ Python3 $PYTHON_VERSION found"
fi

echo "✓ System requirements check completed"

echo "Creating directory structure..."
mkdir -p data logs backups temp services 2>/dev/null || true
chmod 755 data logs backups temp services 2>/dev/null || true

# Create subdirectories for organized data storage
mkdir -p data/databases data/exports data/imports 2>/dev/null || true
mkdir -p logs/trade-engine logs/web-engine logs/system 2>/dev/null || true
mkdir -p backups/daily backups/weekly 2>/dev/null || true
chmod 755 data/databases data/exports data/imports 2>/dev/null || true
chmod 755 logs/trade-engine logs/web-engine logs/system 2>/dev/null || true
chmod 755 backups/daily backups/weekly 2>/dev/null || true

echo "✓ Directory structure created"

echo "Installing system dependencies for $OS_TYPE..."
case "$OS_TYPE" in
    ubuntu24)
        echo "Installing packages for Ubuntu 24.04..."
        PACKAGES_TO_INSTALL=""
        
        dpkg -l | grep -q "^ii  build-essential" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL build-essential"
        dpkg -l | grep -q "^ii  libssl-dev" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL libssl-dev"
        dpkg -l | grep -q "^ii  python3-pip" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL python3-pip"
        dpkg -l | grep -q "^ii  python3-venv" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL python3-venv"
        dpkg -l | grep -q "^ii  sqlite3" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL sqlite3"
        dpkg -l | grep -q "^ii  curl" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL curl"
        dpkg -l | grep -q "^ii  git" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL git"
        dpkg -l | grep -q "^ii  postgresql-client" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL postgresql-client"
        
        if [ -n "$PACKAGES_TO_INSTALL" ]; then
            echo "Installing missing packages:$PACKAGES_TO_INSTALL"
            sudo apt-get update || true
            sudo apt-get install -y $PACKAGES_TO_INSTALL || echo "Warning: Some packages failed to install"
        else
            echo "✓ All required packages already installed"
        fi
        ;;
    ubuntu22|ubuntu|debian)
        echo "Installing packages for Ubuntu/Debian..."
        PACKAGES_TO_INSTALL=""
        
        dpkg -l | grep -q "^ii  build-essential" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL build-essential"
        dpkg -l | grep -q "^ii  libssl-dev" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL libssl-dev"
        dpkg -l | grep -q "^ii  python3-pip" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL python3-pip"
        dpkg -l | grep -q "^ii  sqlite3" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL sqlite3"
        dpkg -l | grep -q "^ii  curl" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL curl"
        dpkg -l | grep -q "^ii  git" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL git"
        dpkg -l | grep -q "^ii  postgresql-client" || PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL postgresql-client"
        
        if [ -n "$PACKAGES_TO_INSTALL" ]; then
            echo "Installing missing packages:$PACKAGES_TO_INSTALL"
            sudo apt-get update || true
            sudo apt-get install -y $PACKAGES_TO_INSTALL || echo "Warning: Some packages failed to install"
        else
            echo "✓ All required packages already installed"
        fi
        ;;
    centos)
        echo "Installing packages for CentOS/RHEL..."
        yum list installed | grep -q "Development Tools" || sudo yum groupinstall -y "Development Tools" || true
        yum list installed | grep -q "openssl-devel" || sudo yum install -y openssl-devel || true
        yum list installed | grep -q "python3-pip" || sudo yum install -y python3-pip || true
        yum list installed | grep -q "sqlite" || sudo yum install -y sqlite || true
        yum list installed | grep -q "postgresql" || sudo yum install -y postgresql || true
        ;;
    *)
        echo "Unknown OS type. Attempting generic installation..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update || true
            sudo apt-get install -y build-essential libssl-dev python3-pip sqlite3 curl git postgresql-client || true
        elif command -v yum &> /dev/null; then
            sudo yum install -y gcc openssl-devel python3-pip sqlite curl git postgresql || true
        elif command -v brew &> /dev/null; then
            brew install sqlite3 python3 postgresql || true
        else
            echo "Warning: Could not detect package manager. Please install dependencies manually."
        fi
        ;;
esac

echo "✓ System dependencies check completed"

echo "Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    # Clear npm cache to avoid conflicts
    npm cache clean --force 2>/dev/null || true
    
    # Install dependencies with retry mechanism
    for i in {1..3}; do
        if npm install --force --no-audit --no-fund 2>/dev/null; then
            echo "✓ Node.js dependencies installed successfully"
            break
        else
            echo "Attempt $i failed, retrying..."
            if [ $i -eq 3 ]; then
                echo "Warning: Failed to install Node.js dependencies after 3 attempts"
                echo "Continuing installation..."
            fi
            sleep 5
        fi
    done
else
    echo "Warning: package.json not found, skipping Node.js dependencies"
fi

echo "Installing Python dependencies..."

pip3 install --upgrade pip 2>/dev/null || true
pip3 install setuptools wheel 2>/dev/null || true

echo "Installing Python packages with minimal version requirements..."
pip3 install --break-system-packages \
    "pybit>=5.0.0" \
    "bingx-python>=1.0.0" \
    "pionex-python>=1.0.0" \
    "websocket-client>=1.0.0" \
    "requests>=2.25.0" \
    "python-dotenv>=0.19.0" \
    "schedule>=1.0.0" 2>/dev/null || echo "Warning: Some Python packages failed to install"

echo "✓ Python dependencies installation completed"

echo "Generating encryption keys..."
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
echo "✓ Encryption keys generated"

REMOTE_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Initializing database..."
if [ -f "data/cts.db" ]; then
    echo "Existing database found. Creating backup..."
    cp data/cts.db "backups/daily/cts_backup_$(date +%Y%m%d_%H%M%S).db" 2>/dev/null || true
    echo "✓ Database backup created"
fi

# Initialize database using Node.js
node -e "
try {
  const DatabaseManager = require('./lib/database.ts').default;
  const db = DatabaseManager.getInstance();
  console.log('✓ Database initialized successfully');
  
  // Verify tables exist
  const tables = db.db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
  console.log('✓ Database tables:', tables.map(t => t.name).join(', '));
  
  db.close();
} catch (error) {
  console.error('Warning: Database initialization had issues:', error.message);
}
" 2>/dev/null || echo "Warning: Database initialization skipped"

echo "Creating systemd services..."

# Web service with enhanced configuration
sudo tee /etc/systemd/system/cts-web.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Web Service
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run dev
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cts-web

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATABASE_PATH=$(pwd)/data/cts.db
Environment=DATABASE_URL=$REMOTE_DATABASE_URL
Environment=REMOTE_POSTGRES_URL=$REMOTE_DATABASE_URL
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY
Environment=JWT_SECRET=$JWT_SECRET
Environment=DEFAULT_PASSWORD=$DEFAULT_PASSWORD

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$(pwd) $(pwd)/data $(pwd)/logs $(pwd)/temp

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Trade engine service with enhanced configuration
sudo tee /etc/systemd/system/cts-trade.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Trade Engine Service
After=network.target cts-web.service
Wants=network-online.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node services/trade-engine.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cts-trade

# Environment variables
Environment=NODE_ENV=production
Environment=DATABASE_PATH=$(pwd)/data/cts.db
Environment=DATABASE_URL=$REMOTE_DATABASE_URL
Environment=REMOTE_POSTGRES_URL=$REMOTE_DATABASE_URL
Environment=LOG_LEVEL=info
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$(pwd) $(pwd)/data $(pwd)/logs $(pwd)/temp

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Log rotation service
sudo tee /etc/systemd/system/cts-logrotate.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Log Rotation Service

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/bin/bash -c 'find logs/ -name "*.log" -size +100M -exec gzip {} \; && find logs/ -name "*.gz" -mtime +30 -delete'
EOF

# Log rotation timer
sudo tee /etc/systemd/system/cts-logrotate.timer > /dev/null <<EOF
[Unit]
Description=Run $PROJECT_NAME log rotation daily
Requires=cts-logrotate.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Database backup service
sudo tee /etc/systemd/system/cts-backup.service > /dev/null <<EOF
[Unit]
Description=$PROJECT_NAME Database Backup Service

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/bin/bash -c 'cp data/cts.db backups/daily/cts_backup_\$(date +\%Y\%m\%d_\%H\%M\%S).db && find backups/daily/ -name "*.db" -mtime +7 -delete'
EOF

# Database backup timer
sudo tee /etc/systemd/system/cts-backup.timer > /dev/null <<EOF
[Unit]
Description=Run $PROJECT_NAME database backup every 6 hours
Requires=cts-backup.service

[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo "Creating management scripts..."

# Start script
cat > start-cts.sh << 'EOF'
#!/bin/bash
echo "Starting CTS v3 services..."
sudo systemctl start cts-web cts-trade
sudo systemctl enable cts-logrotate.timer cts-backup.timer
sudo systemctl start cts-logrotate.timer cts-backup.timer
echo "✓ All services started"
systemctl status cts-web cts-trade --no-pager -l
EOF

# Stop script
cat > stop-cts.sh << 'EOF'
#!/bin/bash
echo "Stopping CTS v3 services..."
sudo systemctl stop cts-web cts-trade cts-logrotate.timer cts-backup.timer
echo "✓ All services stopped"
EOF

# Status script
cat > status-cts.sh << 'EOF'
#!/bin/bash
echo "$PROJECT_NAME Service Status:"
echo "====================="
systemctl status cts-web cts-trade cts-logrotate.timer cts-backup.timer --no-pager -l
echo ""
echo "Recent logs:"
echo "============"
journalctl -u cts-web -u cts-trade --since "1 hour ago" --no-pager -l | tail -20
EOF

# Update script
cat > update-cts.sh << 'EOF'
#!/bin/bash
echo "Updating $PROJECT_NAME..."
git pull origin main
npm install --force
sudo systemctl restart cts-web cts-trade
echo "✓ $PROJECT_NAME updated and restarted"
EOF

chmod +x start-cts.sh stop-cts.sh status-cts.sh update-cts.sh

echo "Setting up environment configuration..."

cat > .env.example << EOF
# CTS v3 Environment Configuration
NODE_ENV=production
PORT=$PORT

# Security Configuration
DEFAULT_PASSWORD=$DEFAULT_PASSWORD
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET

# Database Configuration - Remote PostgreSQL (Predefined)
DATABASE_URL=$REMOTE_DATABASE_URL
REMOTE_POSTGRES_URL=$REMOTE_DATABASE_URL

# Database Configuration - Local SQLite (Optional)
DATABASE_PATH=./data/cts.db
DATABASE_BACKUP_INTERVAL=6

# Remote PostgreSQL Connection Details
REMOTE_PG_HOST=$DB_HOST
REMOTE_PG_PORT=$DB_PORT
REMOTE_PG_DATABASE=$DB_NAME
REMOTE_PG_USER=$DB_USER
REMOTE_PG_PASSWORD=$DB_PASSWORD

# Exchange API Configuration (fill in your credentials)
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_API_SECRET=your_bybit_api_secret_here
BYBIT_TESTNET=true

BINGX_API_KEY=your_bingx_api_key_here
BINGX_API_SECRET=your_bingx_api_secret_here

PIONEX_API_KEY=your_pionex_api_key_here
PIONEX_API_SECRET=your_pionex_api_secret_here

# Trading Configuration
DEFAULT_POSITION_SIZE=0.1
MAX_POSITIONS_PER_CONFIG=1
POSITION_TIMEOUT=15000

# Logging Configuration
LOG_LEVEL=info
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=30

# Security Configuration
ENABLE_API_RATE_LIMITING=true
MAX_API_REQUESTS_PER_MINUTE=60
EOF

if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
    echo "✓ Environment configuration created (.env)"
    echo "✓ Remote PostgreSQL database preconfigured"
else
    echo "✓ Existing .env file preserved"
fi

echo "Applying system optimizations..."

# Increase file descriptor limits
echo "$USER soft nofile 65536" | sudo tee -a /etc/security/limits.conf 2>/dev/null || true
echo "$USER hard nofile 65536" | sudo tee -a /etc/security/limits.conf 2>/dev/null || true

echo "Reloading systemd and starting services..."
sudo systemctl daemon-reload
sudo systemctl enable cts-web.service cts-trade.service 2>/dev/null || true
sudo systemctl enable cts-logrotate.timer cts-backup.timer 2>/dev/null || true

echo "Starting services..."
sudo systemctl start cts-web.service 2>/dev/null && echo "✓ Web service started" || echo "⚠ Web service failed to start"
sleep 2
sudo systemctl start cts-trade.service 2>/dev/null && echo "✓ Trade engine started" || echo "⚠ Trade engine failed to start"
sudo systemctl start cts-logrotate.timer cts-backup.timer 2>/dev/null && echo "✓ Maintenance timers started" || true

echo "✓ System optimizations applied"

echo ""
echo "=========================================="
echo "$PROJECT_NAME Installation Completed!"
echo "=========================================="
echo ""
echo "🔐 Security Information:"
echo "   Default Password: $DEFAULT_PASSWORD"
echo "   Encryption Key: ${ENCRYPTION_KEY:0:16}... (saved in .env)"
echo "   JWT Secret: ${JWT_SECRET:0:16}... (saved in .env)"
echo ""
echo "🗄️  Database Configuration:"
echo "   Remote PostgreSQL: $DB_HOST:$DB_PORT"
echo "   Database Name: $DB_NAME"
echo "   Database User: $DB_USER"
echo "   Connection String: postgresql://$DB_USER:****@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "📁 Directory Structure:"
echo "   data/          - Database and data files"
echo "   logs/          - Application logs"
echo "   backups/       - Database backups"
echo "   services/      - Service scripts"
echo ""
echo "🔧 Management Commands:"
echo "   ./start-cts.sh    - Start all services"
echo "   ./stop-cts.sh     - Stop all services"
echo "   ./status-cts.sh   - Check service status"
echo "   ./update-cts.sh   - Update and restart"
echo ""
echo "🚀 Service Status:"
echo "===================="
sudo systemctl status cts-web --no-pager -l | head -10 || true
echo ""
sudo systemctl status cts-trade --no-pager -l | head -10 || true
echo ""
echo "🌐 Web Interface:"
echo "   http://localhost:$PORT"
echo ""
echo "📋 Next Steps:"
echo "   1. Remote PostgreSQL is already configured!"
echo "   2. Edit .env file with your exchange API credentials"
echo "   3. Configure exchange connections in Settings"
echo "   4. Set up trading parameters"
echo "   5. Start trading!"
echo ""
echo "📖 Documentation:"
echo "   - Configuration: Check app/settings page"
echo "   - Monitoring: Check logs/ directory"
echo "   - Backups: Automatic every 6 hours in backups/"
echo ""
echo "⚠️  Important Security Notes:"
echo "   - Default password: $DEFAULT_PASSWORD (change in production!)"
echo "   - Remote database is preconfigured and ready to use"
echo "   - Never share your .env file"
echo "   - Use testnet for initial testing"
echo "   - Monitor logs regularly"
echo "   - Keep backups safe"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check logs: journalctl -u cts-web -u cts-trade"
echo "   - Service status: ./status-cts.sh"
echo "   - Database issues: Check DATABASE_URL in .env"
echo "   - Test database: psql $REMOTE_DATABASE_URL"
echo "   - Reinstall: $0 uninstall && $0"
echo ""
echo "Installation completed at: $(date)"
echo "=========================================="
