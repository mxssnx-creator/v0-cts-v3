# CTS v3 Installation Guide

## Quick Install (Recommended)

### One-Line Install

Download and install CTS v3 with a single command:

**Using curl:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

**Using wget:**
\`\`\`bash
wget -qO- https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

This will:
- Download the repository
- Auto-detect your OS (Ubuntu 24/22, Debian, CentOS, etc.)
- Install all dependencies
- Configure predefined remote database
- Set up systemd services
- Start the application

### Two-Step Install

If you prefer more control:

**Step 1: Download**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/quick-install.sh | bash
\`\`\`

**Step 2: Install**
\`\`\`bash
cd ~/cts-v3
./scripts/install-continuous.sh
\`\`\`

---

## Installation Methods

### Method 1: Continuous Install (Automated)

Fully automated installation with predefined settings:

\`\`\`bash
git clone https://github.com/yourusername/cts-v3.git
cd cts-v3
./scripts/install-continuous.sh
\`\`\`

**Features:**
- Auto-detects OS (Ubuntu 24, Ubuntu 22, Debian, CentOS, other)
- Installs all dependencies automatically
- Configures remote PostgreSQL database (149.33.11.224:5432/ctsv3)
- Creates systemd services
- Starts application automatically

**Predefined Configuration:**
- Database: PostgreSQL @ 149.33.11.224:5432/ctsv3
- User: root
- Port: 3000
- Default Password: 00998877

### Method 2: Interactive Install

Step-by-step installation with custom configuration:

\`\`\`bash
git clone https://github.com/yourusername/cts-v3.git
cd cts-v3
./scripts/install.sh
\`\`\`

**Features:**
- Choose installation options
- Custom database configuration
- Custom port and settings
- Manual service setup

### Method 3: Manual Install

For advanced users or custom setups:

\`\`\`bash
git clone https://github.com/yourusername/cts-v3.git
cd cts-v3

# Install dependencies
npm install
pip3 install pybit bingx-python pionex-python websocket-client requests python-dotenv schedule

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Run application
npm run dev
\`\`\`

---

## Supported Operating Systems

### Ubuntu 24.04 LTS
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

### Ubuntu 22.04 LTS
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

### Debian 11/12
\`\`\`bash
wget -qO- https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

### CentOS/RHEL 8/9
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

### Other Linux Distributions
The installer will attempt generic installation. Ensure you have:
- Node.js 18+
- Python 3.8+
- Git
- Build tools (gcc, make)

---

## System Requirements

### Minimum Requirements
- **OS:** Linux (Ubuntu, Debian, CentOS, etc.)
- **CPU:** 2 cores
- **RAM:** 2 GB
- **Storage:** 10 GB
- **Node.js:** 18.0.0 or higher
- **Python:** 3.8 or higher

### Recommended Requirements
- **OS:** Ubuntu 24.04 LTS
- **CPU:** 4 cores
- **RAM:** 4 GB
- **Storage:** 20 GB
- **Node.js:** 20.x LTS
- **Python:** 3.11+

---

## Database Configuration

### Predefined Remote PostgreSQL (Default)

The continuous installer uses a predefined remote database:

\`\`\`
Host: 149.33.11.224
Port: 5432
Database: ctsv3
User: root
Password: mLM58coj7t
\`\`\`

This is automatically configured in `.env`:
\`\`\`bash
DATABASE_URL=postgresql://root:mLM58coj7t@149.33.11.224:5432/ctsv3
\`\`\`

### Custom Database

To use a different database, edit `.env` after installation:

\`\`\`bash
nano .env
\`\`\`

Update the `DATABASE_URL` variable:
\`\`\`bash
DATABASE_URL=postgresql://user:password@host:port/database
\`\`\`

Then restart services:
\`\`\`bash
./stop-cts.sh
./start-cts.sh
\`\`\`

---

## Post-Installation

### Access the Application

After installation, access the web interface:

\`\`\`
http://localhost:3000
\`\`\`

Default credentials:
- Password: `00998877`

### Management Commands

The installer creates convenient management scripts:

**Start services:**
\`\`\`bash
./start-cts.sh
\`\`\`

**Stop services:**
\`\`\`bash
./stop-cts.sh
\`\`\`

**Check status:**
\`\`\`bash
./status-cts.sh
\`\`\`

**View logs:**
\`\`\`bash
journalctl -u cts-web -f
journalctl -u cts-trade -f
\`\`\`

### Configure Exchange APIs

1. Access Settings page in web interface
2. Navigate to Exchange Connections
3. Add your exchange API credentials:
   - Bybit
   - BingX
   - Pionex

Or edit `.env` directly:
\`\`\`bash
nano .env
\`\`\`

Add your API keys:
\`\`\`bash
BYBIT_API_KEY=your_key_here
BYBIT_API_SECRET=your_secret_here
BINGX_API_KEY=your_key_here
BINGX_API_SECRET=your_secret_here
\`\`\`

Restart services:
\`\`\`bash
./stop-cts.sh && ./start-cts.sh
\`\`\`

---

## Troubleshooting

### Installation Fails

**Check prerequisites:**
\`\`\`bash
node -v  # Should be 18+
python3 --version  # Should be 3.8+
git --version
\`\`\`

**Install missing dependencies:**

Ubuntu/Debian:
\`\`\`bash
sudo apt-get update
sudo apt-get install -y nodejs npm python3 python3-pip git build-essential
\`\`\`

CentOS/RHEL:
\`\`\`bash
sudo yum install -y nodejs npm python3 python3-pip git gcc make
\`\`\`

### Services Won't Start

**Check service status:**
\`\`\`bash
systemctl status cts-web
systemctl status cts-trade
\`\`\`

**View logs:**
\`\`\`bash
journalctl -u cts-web -n 50
journalctl -u cts-trade -n 50
\`\`\`

**Check port availability:**
\`\`\`bash
sudo netstat -tulpn | grep 3000
\`\`\`

### Database Connection Issues

**Test database connection:**
\`\`\`bash
psql postgresql://root:mLM58coj7t@149.33.11.224:5432/ctsv3 -c "SELECT 1;"
\`\`\`

**Check firewall:**
\`\`\`bash
sudo ufw status
sudo ufw allow 5432/tcp
\`\`\`

**Verify environment variables:**
\`\`\`bash
cat .env | grep DATABASE_URL
\`\`\`

### Permission Issues

**Fix file permissions:**
\`\`\`bash
chmod -R 755 data logs backups temp services
chmod +x scripts/*.sh
chmod +x *.sh
\`\`\`

**Fix service permissions:**
\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl restart cts-web cts-trade
\`\`\`

---

## Uninstallation

To completely remove CTS v3:

\`\`\`bash
# Stop services
./stop-cts.sh

# Disable services
sudo systemctl disable cts-web cts-trade

# Remove service files
sudo rm /etc/systemd/system/cts-web.service
sudo rm /etc/systemd/system/cts-trade.service
sudo systemctl daemon-reload

# Remove installation directory
cd ~
rm -rf cts-v3

# Optional: Remove Node.js packages
npm cache clean --force
\`\`\`

---

## Updating

To update to the latest version:

\`\`\`bash
cd ~/cts-v3

# Stop services
./stop-cts.sh

# Backup data
cp -r data data.backup
cp .env .env.backup

# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install
pip3 install --upgrade pybit bingx-python pionex-python

# Restart services
./start-cts.sh
\`\`\`

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs: `journalctl -u cts-web -n 100`
3. Open an issue on GitHub
4. Contact support

---

## Security Notes

**Important:** The predefined database credentials are for demonstration purposes. For production use:

1. Change the default password immediately
2. Use strong, unique database credentials
3. Configure firewall rules
4. Enable SSL/TLS for database connections
5. Regularly update dependencies
6. Monitor logs for suspicious activity

**Change default password:**
\`\`\`bash
nano .env
# Update DEFAULT_PASSWORD
./stop-cts.sh && ./start-cts.sh
