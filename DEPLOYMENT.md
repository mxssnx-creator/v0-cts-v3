# Deployment Guide for CTS v3

## Quick Start

### One-Command Installation (Self-Hosted)

Install CTS v3 on your own server with a single command:

**Using curl:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

**Using wget:**
\`\`\`bash
wget -qO- https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

**With custom options:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash -s -- --port 8080 --sqlite
\`\`\`

---

## Self-Hosted Installation

### Supported Operating Systems

- ✅ Ubuntu 24.04 LTS (recommended)
- ✅ Ubuntu 22.04 LTS
- ✅ Debian 11/12
- ✅ CentOS/RHEL 8/9
- ✅ Other Linux distributions (generic support)

### Installation Methods

#### Method 1: Continuous Installation (Fully Automated)

\`\`\`bash
# Download repository
git clone https://github.com/yourusername/cts-v3.git
cd cts-v3

# Run continuous installation
./scripts/install-continuous.sh

# With options
./scripts/install-continuous.sh --port 8080 --sqlite
\`\`\`

#### Method 2: Interactive Installation

\`\`\`bash
# Download repository
git clone https://github.com/yourusername/cts-v3.git
cd cts-v3

# Run interactive installation
./scripts/install.sh

# With options
./scripts/install.sh --port 8080 --project-name my-cts --sqlite
\`\`\`

#### Method 3: One-Command Download + Install

\`\`\`bash
# Download and install in one step
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

### Installation Options

All installation scripts support these options:

| Option | Description | Default |
|--------|-------------|---------|
| `--port <PORT>` | Web server port | 3000 |
| `--project-name <NAME>` | Project name | cts-v3 |
| `--sqlite` | Use SQLite instead of PostgreSQL | false |
| `--skip-build` | Skip Next.js build step | false |
| `--uninstall` | Uninstall CTS v3 | - |
| `--help` | Show help message | - |

**Examples:**
\`\`\`bash
# Custom port
./scripts/install.sh --port 8080

# Use SQLite database
./scripts/install.sh --sqlite

# Custom project name
./scripts/install.sh --project-name my-trading-system

# Uninstall
./scripts/install.sh --uninstall
\`\`\`

### Predefined Configuration

The installer uses these predefined settings:

**Remote PostgreSQL Database:**
- Host: 149.33.11.224
- Port: 5432
- Database: ctsv3
- User: root
- Password: mLM58coj7t

**Application:**
- Port: 3000
- Default Password: 00998877

**SQLite Option:**
- Database: ./data/cts.db

### What Gets Installed

The installation script automatically:

1. **System Dependencies:**
   - Build tools (gcc, make, etc.)
   - OpenSSL development libraries
   - Python3 with pip
   - SQLite3 and development libraries
   - PostgreSQL client
   - Git and curl

2. **Runtime Environments:**
   - Node.js (latest LTS)
   - Bun (latest version)
   - pnpm (latest version)

3. **Node.js Dependencies:**
   - Next.js 16+
   - React 19+
   - Radix UI components
   - TailwindCSS 4+
   - PostCSS and Autoprefixer
   - Sonner for notifications
   - All trading APIs (Bybit, BingX, etc.)

4. **Python Dependencies:**
   - pybit >=5.0.0
   - bingx-python >=1.0.0
   - pionex-python >=1.0.0
   - websocket-client >=1.0.0
   - requests >=2.25.0
   - python-dotenv >=0.19.0
   - schedule >=1.0.0

5. **System Services:**
   - cts-web.service (Web interface)
   - cts-trade.service (Trading engine)
   - cts-logrotate.timer (Log rotation)
   - cts-backup.timer (Database backups)

6. **Management Scripts:**
   - start-cts.sh
   - stop-cts.sh
   - status-cts.sh
   - update-cts.sh

### Post-Installation

After installation completes, you'll see:

\`\`\`
========================================
✓ Installation Complete!
========================================

🌐 Access URLs:
   Local:   http://localhost:3000
   Network: http://192.168.1.100:3000

🗄️  Database:
   Type: PostgreSQL
   Host: 149.33.11.224:5432/ctsv3

🔐 Credentials:
   Password: 00998877

🔧 Commands:
   ./start-cts.sh   - Start services
   ./stop-cts.sh    - Stop services
   ./status-cts.sh  - Check status
   ./update-cts.sh  - Update and restart
\`\`\`

### Management Commands

**Start Services:**
\`\`\`bash
./start-cts.sh
# or
sudo systemctl start cts-web cts-trade
\`\`\`

**Stop Services:**
\`\`\`bash
./stop-cts.sh
# or
sudo systemctl stop cts-web cts-trade
\`\`\`

**Check Status:**
\`\`\`bash
./status-cts.sh
# or
systemctl status cts-web cts-trade
\`\`\`

**View Logs:**
\`\`\`bash
# Real-time logs
journalctl -u cts-web -f

# Last 100 lines
journalctl -u cts-web -n 100

# Both services
journalctl -u cts-web -u cts-trade -f
\`\`\`

**Update Application:**
\`\`\`bash
./update-cts.sh
# or manually:
git pull origin main
bun install  # or npm install
bun run build  # or npm run build
sudo systemctl restart cts-web cts-trade
\`\`\`

### Directory Structure

After installation:

\`\`\`
cts-v3/
├── data/
│   ├── databases/     # Database files
│   ├── exports/       # Exported data
│   └── imports/       # Imported data
├── logs/
│   ├── trade-engine/  # Trading logs
│   ├── web-engine/    # Web server logs
│   └── system/        # System logs
├── backups/
│   ├── daily/         # Daily backups
│   └── weekly/        # Weekly backups
├── services/          # Service scripts
├── scripts/           # Installation scripts
└── .env               # Environment configuration
\`\`\`

### Troubleshooting

**Services won't start:**
\`\`\`bash
# Check logs
journalctl -u cts-web -n 50
journalctl -u cts-trade -n 50

# Check configuration
cat .env

# Restart services
sudo systemctl restart cts-web cts-trade
\`\`\`

**Database connection issues:**
\`\`\`bash
# Test PostgreSQL connection
psql postgresql://root:mLM58coj7t@149.33.11.224:5432/ctsv3

# Check DATABASE_URL in .env
grep DATABASE_URL .env

# Switch to SQLite
./scripts/install.sh --sqlite --skip-build
\`\`\`

**Port already in use:**
\`\`\`bash
# Check what's using the port
sudo lsof -i :3000

# Install on different port
./scripts/install.sh --port 8080
\`\`\`

**Permission issues:**
\`\`\`bash
# Fix directory permissions
chmod -R 755 data logs backups temp services

# Fix script permissions
chmod +x *.sh scripts/*.sh
\`\`\`

**Reinstall:**
\`\`\`bash
# Uninstall
./scripts/install.sh --uninstall

# Reinstall
./scripts/install.sh
\`\`\`

---

## Vercel Deployment

### Database Setup

This application requires a PostgreSQL database. **SQLite does not work on Vercel** due to the serverless architecture.

#### Using PostgreSQL Providers

**Recommended Options:**

1. **Vercel Postgres** (Recommended)
   - Native integration with Vercel
   - Automatic connection pooling
   - Free tier available
   - Setup: Add from Vercel Dashboard → Storage

2. **Supabase**
   - Free tier with 500MB database
   - Built-in authentication
   - Real-time capabilities
   - Setup: [supabase.com](https://supabase.com)

3. **Railway**
   - Simple PostgreSQL hosting
   - Free tier available
   - Easy setup
   - Setup: [railway.app](https://railway.app)

4. **Your Own PostgreSQL Server**
   You can use the predefined remote PostgreSQL server:
   \`\`\`
   DATABASE_URL=postgresql://root:mLM58coj7t@149.33.11.224:5432/ctsv3
   \`\`\`

### Environment Variables

Required in Vercel (add in Project Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `NODE_ENV` | Environment | `production` |
| `DEFAULT_PASSWORD` | Default login password | `00998877` |
| `ENCRYPTION_KEY` | Data encryption key | Auto-generated |
| `JWT_SECRET` | JWT signing secret | Auto-generated |

Optional exchange API variables:
- `BYBIT_API_KEY`
- `BYBIT_API_SECRET`
- `BINGX_API_KEY`
- `BINGX_API_SECRET`

### Deployment Steps

1. **Push to GitHub:**
   \`\`\`bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   \`\`\`

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables:**
   - Add `DATABASE_URL` (required)
   - Add other variables as needed

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

5. **Access Your App:**
   - Visit your Vercel URL
   - Login with default password

### Database Schema

The application automatically creates these tables on first run:

- `users` - User accounts
- `exchange_connections` - Exchange API connections
- `trading_configs` - Trading configurations
- `pseudo_positions` - Simulated positions
- `real_positions` - Actual exchange positions
- `indications` - Trading signals
- `system_settings` - Application settings
- `logs` - System logs
- `errors` - Error tracking

### Build Configuration

The project is configured for optimal Vercel deployment:

**next.config.mjs:**
- Turbopack enabled (faster builds)
- React Compiler support
- Optimized package imports

**package.json:**
- Minimal version requirements (>=)
- Latest Next.js 16+
- Latest React 19+
- Type-checking enabled

### Local Development

For local development with Vercel environment:

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel project
vercel link

# Pull environment variables
vercel env pull

# Run development server
npm run dev
\`\`\`

### Continuous Deployment

Vercel automatically deploys:
- **Production:** Pushes to `main` branch
- **Preview:** Pull requests and other branches

To disable auto-deployment:
- Go to Project Settings → Git
- Configure deployment branches

---

## Security Recommendations

### For Self-Hosted Installations

1. **Change Default Password:**
   - Login immediately after installation
   - Go to Settings → Change password

2. **Secure Database:**
   - Use strong database passwords
   - Restrict database access by IP
   - Enable SSL/TLS connections

3. **Firewall Configuration:**
   \`\`\`bash
   # Allow only necessary ports
   sudo ufw allow 3000/tcp
   sudo ufw allow 5432/tcp  # If database is remote
   sudo ufw enable
   \`\`\`

4. **Regular Updates:**
   \`\`\`bash
   # Update system
   sudo apt update && sudo apt upgrade
   
   # Update CTS v3
   ./update-cts.sh
   \`\`\`

5. **Backup Strategy:**
   - Automatic backups run every 6 hours
   - Manual backup: `cp data/cts.db backups/manual_$(date +%Y%m%d).db`
   - Store backups off-site

6. **Monitor Logs:**
   \`\`\`bash
   # Watch for errors
   journalctl -u cts-web -u cts-trade -p err -f
   \`\`\`

### For Vercel Deployments

1. **Environment Variables:**
   - Never commit `.env` to git
   - Use Vercel's environment variable management
   - Rotate secrets regularly

2. **Database Security:**
   - Use SSL connections (sslmode=require)
   - Restrict database access by IP
   - Use strong passwords

3. **API Keys:**
   - Store exchange API keys in Vercel environment variables
   - Use testnet for development
   - Enable IP whitelisting on exchanges

---

## Support

For issues and questions:

1. Check logs: `journalctl -u cts-web -u cts-trade`
2. Review [INSTALL.md](INSTALL.md) for detailed instructions
3. Check GitHub issues
4. Contact support

---

## Quick Reference

**Installation:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/yourusername/cts-v3/main/scripts/download-and-install.sh | bash
\`\`\`

**Management:**
\`\`\`bash
./start-cts.sh    # Start
./stop-cts.sh     # Stop
./status-cts.sh   # Status
./update-cts.sh   # Update
\`\`\`

**Access:**
- Local: http://localhost:3000
- Default Password: 00998877

**Logs:**
\`\`\`bash
journalctl -u cts-web -f
\`\`\`

**Uninstall:**
\`\`\`bash
./scripts/install.sh --uninstall
