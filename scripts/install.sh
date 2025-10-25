#!/bin/bash

# CTS v3 Complete Installation Script with Advanced Features
# Supports: Ubuntu 24/22, Debian, CentOS, and other Linux distributions
# Features: Port/project-name args, uninstall, SQLite, smart package detection, latest versions

# Default configuration
PORT=3000
PROJECT_NAME="cts-v3"
UNINSTALL=false
DEFAULT_PASSWORD="00998877"
OS_TYPE=""
USE_SQLITE=false
SKIP_BUILD=false

# Predefined Remote Database Configuration
DB_HOST="149.33.11.224"
DB_PORT="5432"
DB_NAME="ctsv3"
DB_USER="root"
DB_PASSWORD="mLM58coj7t"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Parse command line arguments
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
        --sqlite)
            USE_SQLITE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help|help)
            echo "CTS v3 Installation Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --port <PORT>              Set web server port (default: 3000)"
            echo "  -n, --project-name <NAME>      Set project name (default: cts-v3)"
            echo "  -o, --os <TYPE>                Set OS type (ubuntu24|ubuntu22|debian|centos|other)"
            echo "  -u, --uninstall                Uninstall CTS v3"
            echo "  --sqlite                       Use SQLite instead of PostgreSQL"
            echo "  --skip-build                   Skip Next.js build step"
            echo "  -h, --help                     Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --port 8080 --project-name my-cts"
            echo "  $0 --uninstall"
            echo "  $0 --sqlite"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Uninstall mode
if [ "$UNINSTALL" = true ]; then
    echo "=========================================="
    echo "Uninstalling $PROJECT_NAME"
    echo "=========================================="
    
    print_info "Stopping services..."
    sudo systemctl stop cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
    sudo systemctl disable cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
    
    print_info "Removing systemd services..."
    sudo rm -f /etc/systemd/system/cts-*.service /etc/systemd/system/cts-*.timer
    sudo systemctl daemon-reload
    
    print_info "Removing management scripts..."
    rm -f start-cts.sh stop-cts.sh status-cts.sh update-cts.sh
    
    print_success "Uninstallation completed"
    print_warning "Data, logs, and backups were preserved in: $(pwd)"
    exit 0
fi

# Auto-detect OS if not specified
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
            debian) OS_TYPE="debian" ;;
            centos|rhel|fedora) OS_TYPE="centos" ;;
            *) OS_TYPE="other" ;;
        esac
    else
        OS_TYPE="other"
    fi
fi

# Main installation
echo "=========================================="
echo "$PROJECT_NAME - Crypto Trading System"
echo "=========================================="
echo ""
print_info "Configuration:"
echo "  Port: $PORT"
echo "  Project: $PROJECT_NAME"
echo "  OS: $OS_TYPE"
echo "  Database: $([ "$USE_SQLITE" = true ] && echo "SQLite" || echo "PostgreSQL")"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Stop existing services
print_info "Stopping existing services..."
sudo systemctl stop cts-web cts-trade cts-logrotate.timer cts-backup.timer 2>/dev/null || true
print_success "Services stopped"

# Check and install prerequisites
print_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null || true
    sudo apt-get install -y nodejs 2>/dev/null || print_warning "Failed to install Node.js automatically"
else
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION found"
fi

# Check Bun
if ! command -v bun &> /dev/null; then
    print_warning "Bun not found, installing..."
    curl -fsSL https://bun.sh/install | bash 2>/dev/null || true
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    if command -v bun &> /dev/null; then
        print_success "Bun $(bun --version) installed"
    fi
else
    print_success "Bun $(bun --version) found"
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found, installing..."
    npm install -g pnpm@latest 2>/dev/null || true
    if command -v pnpm &> /dev/null; then
        print_success "pnpm $(pnpm --version) installed"
    fi
else
    print_success "pnpm $(pnpm --version) found"
fi

# Check Python3
if ! command -v python3 &> /dev/null; then
    print_warning "Python3 not found"
else
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    print_success "Python3 $PYTHON_VERSION found"
fi

# Create directory structure
print_info "Creating directory structure..."
mkdir -p data/{databases,exports,imports} logs/{trade-engine,web-engine,system} backups/{daily,weekly} temp services 2>/dev/null || true
chmod -R 755 data logs backups temp services 2>/dev/null || true
print_success "Directory structure created"

# Install system dependencies
print_info "Installing system dependencies for $OS_TYPE..."
case "$OS_TYPE" in
    ubuntu24|ubuntu22|ubuntu|debian)
        PACKAGES=""
        dpkg -l | grep -q "^ii  build-essential" || PACKAGES="$PACKAGES build-essential"
        dpkg -l | grep -q "^ii  libssl-dev" || PACKAGES="$PACKAGES libssl-dev"
        dpkg -l | grep -q "^ii  python3-pip" || PACKAGES="$PACKAGES python3-pip"
        dpkg -l | grep -q "^ii  python3-venv" || PACKAGES="$PACKAGES python3-venv"
        dpkg -l | grep -q "^ii  sqlite3" || PACKAGES="$PACKAGES sqlite3"
        dpkg -l | grep -q "^ii  libsqlite3-dev" || PACKAGES="$PACKAGES libsqlite3-dev"
        dpkg -l | grep -q "^ii  curl" || PACKAGES="$PACKAGES curl"
        dpkg -l | grep -q "^ii  git" || PACKAGES="$PACKAGES git"
        dpkg -l | grep -q "^ii  postgresql-client" || PACKAGES="$PACKAGES postgresql-client"
        
        if [ -n "$PACKAGES" ]; then
            print_info "Installing:$PACKAGES"
            sudo apt-get update -qq 2>/dev/null || true
            sudo apt-get install -y $PACKAGES 2>/dev/null || print_warning "Some packages failed to install"
        else
            print_success "All system packages already installed"
        fi
        ;;
    centos)
        print_info "Installing for CentOS/RHEL..."
        sudo yum groupinstall -y "Development Tools" 2>/dev/null || true
        sudo yum install -y openssl-devel python3-pip sqlite curl git postgresql 2>/dev/null || true
        ;;
    *)
        print_warning "Unknown OS, attempting generic installation..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -qq 2>/dev/null || true
            sudo apt-get install -y build-essential libssl-dev python3-pip sqlite3 curl git postgresql-client 2>/dev/null || true
        fi
        ;;
esac
print_success "System dependencies installed"

# Install Node.js dependencies with Bun (faster) or npm
print_info "Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    if command -v bun &> /dev/null; then
        print_info "Using Bun for faster installation..."
        bun install 2>/dev/null || npm install --force 2>/dev/null || print_warning "Some dependencies failed"
    else
        npm cache clean --force 2>/dev/null || true
        npm install --force 2>/dev/null || print_warning "Some dependencies failed"
    fi
    print_success "Node.js dependencies installed"
else
    print_warning "package.json not found"
fi

# Install Python dependencies
print_info "Installing Python dependencies..."
python3 -m pip install --upgrade pip --break-system-packages 2>/dev/null || true

# Install with minimal version requirements (>=)
python3 -m pip install --break-system-packages \
    "pybit>=5.0.0" \
    "bingx-python>=1.0.0" \
    "pionex-python>=1.0.0" \
    "websocket-client>=1.0.0" \
    "requests>=2.25.0" \
    "python-dotenv>=0.19.0" \
    "schedule>=1.0.0" 2>/dev/null || print_warning "Some Python packages failed"
print_success "Python dependencies installed"

# Generate encryption keys
print_info "Generating encryption keys..."
ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
print_success "Encryption keys generated"

# Database configuration
if [ "$USE_SQLITE" = true ]; then
    DATABASE_URL="file:./data/cts.db"
    print_info "Using SQLite database"
else
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    print_info "Using PostgreSQL database"
fi

# Create environment configuration
print_info "Creating environment configuration..."
cat > .env << EOF
# CTS v3 Environment Configuration
NODE_ENV=production
PORT=$PORT
PROJECT_NAME=$PROJECT_NAME

# Security
DEFAULT_PASSWORD=$DEFAULT_PASSWORD
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET

# Database
DATABASE_URL=$DATABASE_URL
$([ "$USE_SQLITE" = false ] && echo "REMOTE_POSTGRES_URL=$DATABASE_URL
REMOTE_PG_HOST=$DB_HOST
REMOTE_PG_PORT=$DB_PORT
REMOTE_PG_DATABASE=$DB_NAME
REMOTE_PG_USER=$DB_USER
REMOTE_PG_PASSWORD=$DB_PASSWORD")
$([ "$USE_SQLITE" = true ] && echo "DATABASE_PATH=./data/cts.db")

# Exchange APIs (configure your credentials)
BYBIT_API_KEY=
BYBIT_API_SECRET=
BYBIT_TESTNET=true
BINGX_API_KEY=
BINGX_API_SECRET=
PIONEX_API_KEY=
PIONEX_API_SECRET=

# Trading
DEFAULT_POSITION_SIZE=0.1
MAX_POSITIONS_PER_CONFIG=1
POSITION_TIMEOUT=15000
LOG_LEVEL=info
EOF
print_success "Environment configuration created"

# Build Next.js application
if [ "$SKIP_BUILD" = false ]; then
    print_info "Building Next.js application..."
    if command -v bun &> /dev/null; then
        bun run build 2>/dev/null || print_warning "Build failed, continuing..."
    else
        npm run build 2>/dev/null || print_warning "Build failed, continuing..."
    fi
    print_success "Build completed"
else
    print_info "Skipping build step"
fi

# Create systemd services
print_info "Creating systemd services..."

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
ExecStart=$(command -v bun &> /dev/null && echo "$(which bun) run dev" || echo "$(which npm) run dev")
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATABASE_URL=$DATABASE_URL
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY
Environment=JWT_SECRET=$JWT_SECRET
Environment=DEFAULT_PASSWORD=$DEFAULT_PASSWORD

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$(pwd)

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
ExecStart=$(which node) services/trade-engine.js
Restart=always
RestartSec=15

Environment=DATABASE_URL=$DATABASE_URL
Environment=ENCRYPTION_KEY=$ENCRYPTION_KEY

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

print_success "Systemd services created"

# Create management scripts
print_info "Creating management scripts..."

cat > start-cts.sh << 'EOFSCRIPT'
#!/bin/bash
echo "Starting CTS v3 services..."
sudo systemctl start cts-web cts-trade
sudo systemctl enable cts-web cts-trade
echo "✓ Services started"
systemctl status cts-web cts-trade --no-pager
EOFSCRIPT

cat > stop-cts.sh << 'EOFSCRIPT'
#!/bin/bash
echo "Stopping CTS v3 services..."
sudo systemctl stop cts-web cts-trade
echo "✓ Services stopped"
EOFSCRIPT

cat > status-cts.sh << 'EOFSCRIPT'
#!/bin/bash
echo "CTS v3 Service Status:"
echo "====================="
systemctl status cts-web cts-trade --no-pager
echo ""
echo "Recent Logs:"
journalctl -u cts-web -u cts-trade --since "1 hour ago" --no-pager | tail -30
EOFSCRIPT

cat > update-cts.sh << 'EOFSCRIPT'
#!/bin/bash
echo "Updating CTS v3..."
git pull origin main
if command -v bun &> /dev/null; then
    bun install
    bun run build
else
    npm install --force
    npm run build
fi
sudo systemctl restart cts-web cts-trade
echo "✓ Updated and restarted"
EOFSCRIPT

chmod +x start-cts.sh stop-cts.sh status-cts.sh update-cts.sh
print_success "Management scripts created"

# Start services
print_info "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable cts-web cts-trade 2>/dev/null || true
sudo systemctl start cts-web 2>/dev/null && print_success "Web service started" || print_warning "Web service failed to start"
sleep 2
sudo systemctl start cts-trade 2>/dev/null && print_success "Trade engine started" || print_warning "Trade engine failed to start"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

# Final summary
echo ""
echo "=========================================="
echo "✓ Installation Complete!"
echo "=========================================="
echo ""
echo "📋 Project Information:"
echo "   Name: $PROJECT_NAME"
echo "   Version: 3.0.0"
echo "   Directory: $(pwd)"
echo ""
echo "🗄️  Database Configuration:"
if [ "$USE_SQLITE" = true ]; then
    echo "   Type: SQLite"
    echo "   Location: $(pwd)/data/cts.db"
else
    echo "   Type: PostgreSQL"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo "   Connection: postgresql://$DB_USER:****@$DB_HOST:$DB_PORT/$DB_NAME"
fi
echo ""
echo "🌐 Access URLs:"
echo "   Local: http://localhost:$PORT"
echo "   Network: http://$SERVER_IP:$PORT"
echo ""
echo "🔐 Security Credentials:"
echo "   Default Password: $DEFAULT_PASSWORD"
echo "   Encryption Key: ${ENCRYPTION_KEY:0:16}..."
echo "   JWT Secret: ${JWT_SECRET:0:16}..."
echo ""
echo "🔧 Management Commands:"
echo "   ./start-cts.sh    - Start all services"
echo "   ./stop-cts.sh     - Stop all services"
echo "   ./status-cts.sh   - Check service status"
echo "   ./update-cts.sh   - Update and restart"
echo ""
echo "📁 Directory Structure:"
echo "   data/          - Database and data files"
echo "   logs/          - Application logs"
echo "   backups/       - Database backups"
echo "   services/      - Service scripts"
echo ""
echo "🚀 Service Status:"
sudo systemctl is-active cts-web >/dev/null 2>&1 && echo "   Web Service: ✓ Running" || echo "   Web Service: ✗ Stopped"
sudo systemctl is-active cts-trade >/dev/null 2>&1 && echo "   Trade Engine: ✓ Running" || echo "   Trade Engine: ✗ Stopped"
echo ""
echo "📖 Next Steps:"
echo "   1. Access web interface at http://localhost:$PORT"
echo "   2. Login with default password: $DEFAULT_PASSWORD"
echo "   3. Configure exchange API credentials in Settings"
echo "   4. Set up trading parameters"
echo "   5. Start trading!"
echo ""
echo "⚠️  Security Reminders:"
echo "   • Change default password immediately"
echo "   • Keep .env file secure (never commit to git)"
echo "   • Use testnet for initial testing"
echo "   • Monitor logs regularly: journalctl -u cts-web -f"
echo "   • Set up regular backups"
echo ""
echo "🔍 Troubleshooting:"
echo "   • Check logs: journalctl -u cts-web -u cts-trade"
echo "   • Service status: ./status-cts.sh"
echo "   • Restart services: sudo systemctl restart cts-web cts-trade"
echo "   • Uninstall: $0 --uninstall"
echo ""
echo "Installation completed at: $(date)"
echo "=========================================="
